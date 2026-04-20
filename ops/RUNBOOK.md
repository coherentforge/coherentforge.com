# coherentforge.com — operations runbook

Operational knowledge that's not obvious from reading the code. Add entries
as you learn things the hard way; future-you will thank current-you.

## Deploy model

- **Deployer:** `builder@147.182.242.59`
- **Webroot:** `/var/www/coherentforge.com/` (owned `builder:www-data`, mode 755)
- **nginx:** runs as `www-data`, reads via group. No world-readable perms needed.
- **Workflow:** laptop runs `hugo` + `rsync` → droplet. No build happens on the droplet.

Why `builder:www-data` and not `root:root`:

- The Debian default for `/var/www/<site>/` is `root:root`, which forces
  deploys to use root SSH or `sudo rsync`. Both expand blast radius.
- With `builder:www-data`, a compromise of the deploy user lets an attacker
  deface the site (bounded) but not escalate to root.
- nginx reads as `www-data` (group member), so files don't need to be
  world-readable.

**Why this model doesn't apply to the WordPress sites on the same droplet:**
`jasonricca.com` (`root:www-data`) and `civicduties.org` / `html/` / `staging/`
(`www-data:www-data`) run WordPress, which needs write access for uploads,
plugin installs, theme updates, and core self-updates. Setting them to
`builder:www-data` 755 would break those admin-UI flows silently. Their
current ownership is correct for their use case; don't normalize.

As a side benefit of our static-site model: `www-data` has *read-only*
access to `coherentforge.com`. A WP compromise elsewhere on the droplet
can't pivot to modifying this site's content.

## Lessons learned

### rsync `--dry-run` does not validate write permissions

**Symptom:** dry-run reports "speedup 343×" and zero deletes. Real deploy
fails with `mkstemp ... Permission denied` on every file.

**Cause:** dry-run walks the target tree (needs only read+traverse) and
computes what it *would* transfer. It never attempts `mkstemp` / `utime`,
so ownership mismatches are invisible.

**Fix shape:** before first deploy to a new target, run a minimal write
probe as the deploy user:

    ssh builder@HOST 'touch /var/www/SITE/.writetest && rm /var/www/SITE/.writetest && echo OK'

If that fails, fix ownership (`sudo chown -R builder:www-data /var/www/SITE`)
before any deploy attempt.

**What it looks like when it goes wrong:** rsync prints two error classes
and exits code 23. No files on the target get modified (mkstemp failures
happen before any rename), so the site stays in its pre-deploy state —
safe to re-run after fixing perms.

- `failed to set times on "..."` → can't `utime()` a directory it doesn't own
- `mkstemp "..." failed: Permission denied (13)` → can't create temp file
  in a directory it doesn't own (rsync's atomic-write pattern)

### `set -e` stops at first rsync error, so landing is never touched

`deploy.sh` rsyncs `/cambios` first, then the landing page. If the first
rsync fails (exit 23), the script exits before the landing rsync. The
landing page stays at whatever the droplet had before. No partial-deploy
cleanup needed.

### workflow_dispatch locks the SHA at dispatch time, not at run time

**Symptom:** you push a content change, CI reports success, the live site
still shows old content. Direct curl to the origin (bypassing Cloudflare)
confirms the droplet is serving stale content. rsync logs show it "sent"
bytes and claimed to write index.html.

**Cause:** a `workflow_dispatch` run was triggered earlier via the UI
(possibly while exploring), sat queued, and un-queued *after* a later push
run completed. The dispatch's checkout resolves against its **dispatch-time
ref**, not main HEAD at run time — so it rebuilds and deploys the old
commit on top of the fresh one.

**Observed case (2026-04-19):** a UI dispatch created at 21:33 UTC started
at 01:07 UTC the next day on SHA `1765260` (4 hours stale). It un-queued
~4 seconds after a push-triggered run completed at SHA `c359f41`, and
overwrote the fresh content.

**How to spot it in logs:** the "Log commit being deployed" step prints
the SHA and commit subject. If a dispatch run shows an unexpected old
subject line (e.g. a yesterday commit), that's the symptom. The workflow
also emits a `::warning::` when a dispatch runs behind main HEAD.

**Fixes:**
- **Immediate:** trigger a fresh `workflow_dispatch` now, or push an empty
  commit (`git commit --allow-empty -S -m 'redeploy'`). Either forces a
  run against current HEAD.
- **Hygiene:** before manually dispatching, cancel any queued dispatch runs
  from the Actions UI (they show a "Queued" spinner). And avoid
  dispatching unless a push won't serve the same purpose.

**Why not auto-cancel queued dispatches?** The workflow uses
`concurrency.cancel-in-progress: false` so mid-deploy runs aren't killed
(partial rsync is worse than a re-run). The trade-off is that a queued
dispatch *can* run after a newer push. The SHA-logging step makes this
visible; the warning makes it diagnosable.

## First-time setup of a new droplet (record for future sites)

Steps that were done once for coherentforge.com, captured here for the
next static site:

    # 1. Create deploy user (one-time, as root)
    sudo useradd -m -G www-data -s /bin/bash builder
    sudo mkdir -p /home/builder/.ssh
    sudo cp ~/.ssh/authorized_keys /home/builder/.ssh/  # or add the key
    sudo chown -R builder:builder /home/builder/.ssh
    sudo chmod 700 /home/builder/.ssh
    sudo chmod 600 /home/builder/.ssh/authorized_keys

    # 2. Create webroot with correct ownership
    sudo mkdir -p /var/www/SITENAME
    sudo chown -R builder:www-data /var/www/SITENAME
    sudo chmod 755 /var/www/SITENAME

    # 3. Verify builder can write
    ssh builder@HOST 'touch /var/www/SITENAME/.writetest && rm /var/www/SITENAME/.writetest && echo OK'

    # 4. nginx site config + certbot / Cloudflare origin cert
    # (see ops/nginx-SITE.conf for reference)
