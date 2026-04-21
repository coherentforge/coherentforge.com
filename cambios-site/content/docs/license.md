---
title: "License"
url: /docs/license/
---

CambiOS is dual-licensed.

## The split

| Component | License | SPDX |
|---|---|---|
| Kernel, user-space services, tooling | GNU Affero General Public License v3 or later | `AGPL-3.0-or-later` |
| `libsys` (user-space syscall ABI library) | Mozilla Public License 2.0 | `MPL-2.0` |

## Why two licenses

**The kernel and everything built on top of it is AGPL-3.0-or-later.** AGPL is a strong copyleft: if you modify CambiOS and run it over a network to serve users, you must make the modified source available to those users. This exists to prevent hosted forks that take without giving back. The kernel, scheduler, IPC, capability system, identity layer, ObjectStore, user-space services (shell, filesystem, network, drivers), and build tooling all fall under this license.

**`libsys` is MPL-2.0.** MPL is a file-level copyleft with a permissive linking boundary: you can write a proprietary application, statically or dynamically link it against `libsys`, and ship your application under any license you choose — provided that modifications *to the `libsys` files themselves* remain MPL and are published.

This matches the natural trust boundary of the system. `libsys` is the ABI — the thin wrapper over CambiOS syscalls that every user-space program calls to talk to the kernel. Licensing it as MPL means CambiOS can host commercial software without forcing that software to adopt AGPL, while still guaranteeing that improvements to the ABI itself flow back to the community.

## Source

Full license text lives in `LICENSE` files in the source repositories:

- [github.com/coherentforge/cambios](https://github.com/coherentforge/cambios) — the kernel + user-space + tooling
- [github.com/coherentforge/coherentforge.com](https://github.com/coherentforge/coherentforge.com) — this site

Canonical license texts:

- [GNU AGPL-3.0](https://www.gnu.org/licenses/agpl-3.0.txt)
- [MPL-2.0](https://www.mozilla.org/en-US/MPL/2.0/)

## No telemetry. No backdoors. No exceptions.

These are not license terms — they are design commitments that sit above the license. No CambiOS component phones home, reports usage, or bypasses the capability model. A license permits what you *can* do with the source; these commitments describe what CambiOS *will not* do to you, regardless of license.
