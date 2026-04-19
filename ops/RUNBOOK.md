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
