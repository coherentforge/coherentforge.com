# coherentforge.com

Source for [coherentforge.com](https://coherentforge.com) (root landing) and
[coherentforge.com/cambios](https://coherentforge.com/cambios) (CambiOS project site).

## Structure

    landing/          Hand-written HTML served at the root domain.
    cambios-site/     Hugo project for CambiOS pages. Output is served at /cambios.
    ops/              Reference copies of nginx config + deferred web-ops items.
    .github/          CI workflows.

## Local preview

    brew install hugo
    cd cambios-site && hugo server
    # open http://localhost:1313/cambios

The landing page is static HTML — open `landing/index.html` directly in a browser.

## Deploy

Pushing to `main` triggers the GitHub Actions workflow, which builds Hugo and
rsyncs both targets to the production droplet.

To deploy manually from your laptop:

    ./deploy.sh                   # defaults to builder@147.182.242.59
    ./deploy.sh user@host         # override remote

The script runs `hugo --minify` then rsyncs `cambios-site/public/` to
`/var/www/coherentforge.com/cambios/` and `landing/` to `/var/www/coherentforge.com/`
(the landing rsync excludes `cambios/` so it can't clobber the Hugo output).

## Legal

© 2026 Coherent Forge. All rights reserved.
CambiOS™ is a pending trademark of Coherent Forge.
OSS license: TBD.
