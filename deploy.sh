#!/usr/bin/env bash
# Build and deploy coherentforge.com (landing + cambios Hugo site).
#
# Usage:
#   ./deploy.sh                      # default: builder@147.182.242.59
#   ./deploy.sh user@host            # override remote
#   DRY_RUN=1 ./deploy.sh            # rsync --dry-run (no changes)
#
# Requires: hugo, rsync, ssh with key-based auth to the remote.

set -euo pipefail

REMOTE="${1:-builder@147.182.242.59}"
WEBROOT="/var/www/coherentforge.com"
ROOT="$(cd "$(dirname "$0")" && pwd)"
RSYNC_FLAGS="-avz --delete"
[[ "${DRY_RUN:-0}" == "1" ]] && RSYNC_FLAGS="$RSYNC_FLAGS --dry-run"

echo "==> Building Hugo (cambios-site)"
cd "$ROOT/cambios-site"
hugo --minify --cleanDestinationDir

echo "==> Deploying /cambios to $REMOTE:$WEBROOT/cambios/"
rsync $RSYNC_FLAGS \
    "$ROOT/cambios-site/public/" \
    "$REMOTE:$WEBROOT/cambios/"

echo "==> Deploying landing to $REMOTE:$WEBROOT/ (excluding cambios/)"
rsync $RSYNC_FLAGS --exclude='cambios/' \
    "$ROOT/landing/" \
    "$REMOTE:$WEBROOT/"

echo "==> Done."
