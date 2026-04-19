# Deferred web-ops items

Items flagged for later, with observable triggers. Don't let this list grow
silently — if a trigger fires, act on it or re-defer with a new trigger.

## 1. CSS/JS 7-day cache vs. stylesheet churn

**What:** nginx sets `expires 7d` + `Cache-Control: public, immutable` on
all `*.css|*.js|*.png|...` responses. After a style/layout update, users
who visited within the last week will see stale assets until TTL expires.

**Why deferred:** today the stylesheet is stable and hard-reload works.
Cache-busting adds build-pipeline complexity (Hugo `resources.Fingerprint`
or query-string versioning) that isn't worth it yet.

**Revisit when:** you push a visible style or layout change and someone
reports "I don't see the update" — OR you want to iterate design rapidly.
Fix options, cheapest first: (a) bump a `?v=N` query on the `<link>` /
`<script>` tags in `layouts/partials/header.html`, (b) shorten cache to
1h, (c) Hugo asset-pipeline fingerprinting.

## 2. No Content-Security-Policy header

**What:** nginx emits X-Frame, Referrer-Policy, Permissions-Policy, HSTS —
but no `Content-Security-Policy`. Browsers default-permit any script/style
origin.

**Why deferred:** static site with only same-origin assets today. CSP adds
no security right now because there's nothing it would block.

**Revisit when:** you add *any* third-party script or iframe (analytics,
comments, embedded demo, video, CDN-hosted font). At that point, write a
narrow CSP allowlist — don't leave it open. Start restrictive
(`default-src 'self'`) and add explicit allows per included origin.
