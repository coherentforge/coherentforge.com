---
title: "Implementation Status"
url: /docs/status/
last_synced_to_kernel: 2026-10-26
---

# CambiOS Implementation Status

> **Living doc.** Single source of truth for "what is currently built." Refreshed as feature work lands. Intent and rationale live in [Architecture](/docs/architecture/) and the design docs; this file is *current state*.
>
> "Is X done yet?" — read here. "Should X be done a certain way?" — read the linked design doc.

*Last synced to code: 2026-10-26.*

---

## At a glance

- **Tri-arch first-class.** Clean release build on `x86_64`, `aarch64`, and `riscv64gc`. All three boot in QEMU to a `cambios>` shell prompt under init-supervised boot ([ADR-018](/adr/018-init-process-and-boot-manifest/)): a signed boot manifest is the only thing that starts anything — a 15-service wave plus 5 on-demand apps on x86_64 and AArch64, an 11-service wave on riscv64. `make check-all` is the permanent regression gate.
- **Runs on real hardware.** Two x86_64 machines boot from a USB stick to the `cambios>` prompt. On the documented target, a Dell Precision 3630 (UEFI, 12 cores), the GUI terminal comes up on the monitor and a USB keyboard types into it — no serial cable. First interactive session on bare metal landed 2026-10-24. NIC and NVMe bring-up on that machine are next.
- **935 host unit tests passing** on `x86_64-apple-darwin`. Numbers live in code, not prose — `make stats` for the current count.
- **Security model live end-to-end.** Cryptographic identity, signed-ELF verification, capability-gated IPC, content-addressed ObjectStore, audit ring, kernel identity gate, userspace `recv_verified`. No bootstrap-only gates remain: identity is bound at spawn from the signed manifest, and revocation is governed by a `revoke` right rather than by who the caller is.
- **GUI stack live on x86_64 + AArch64.** scanout-virtio-gpu drives QEMU virtio-gpu-pci; scanout-limine drives the GOP framebuffer on hardware; the compositor composites; virtio-input and the USB HID driver forward keyboard and pointer events into the focused window. First-party apps `pong`, `worm`, `tree`, and `terminal-window` all run through [ADR-037](/adr/037-native-app-framework/)'s `service_main!` framework, as does every service.
- **Persistent storage live.** virtio-blk + disk-backed ObjectStore + `arcobj` shell CLI; objects survive reboot. Full-disk encryption unlocks through the multi-Principal vault, gated by an `UnlockVolume` capability.
- **USB host stack.** xHCI bring-up, multi-device enumeration, HID boot-protocol keyboard, and a CCID smart-card pipe — proven under QEMU, with the keyboard path proven on the Dell.
- **Formal verification.** 48 Kani harnesses across 6 proof crates (BuddyAllocator, ELF parser, FrameAllocator, CapabilityManager, UserSlice, DTB parser). Proof authoring has fixed real overflow bugs in shipped code. The honest gap between proven and aspirational claims lives in [verification/CLAIMS.md](https://github.com/coherentforge/cambios/blob/main/verification/CLAIMS.md).
- **Repository.** Public on GitHub at [coherentforge/cambios](https://github.com/coherentforge/cambios) — AGPL-3.0-or-later on kernel + services + apps, MPL-2.0 on `user/libsys/` and the framework crates.

---

## Recent landings

Newest first; older items rotate out as newer work lands (the [git log](https://github.com/coherentforge/cambios/commits/main) has the full history).

- **2026-10-26** — Cross-CPU wakes now send a reschedule IPI. A halted core used to notice a wake only at its next timer tick, costing up to 10 ms per IPC hop between services on different cores — most of the Dell's 16-second boot wave and all of its slow games. Measured under QEMU: an 8-CPU boot wave dropped from 3392 to 2720 ticks. [ADR-001](/adr/001-smp-scheduling/) amended.
- **2026-10-26** — Endpoint queues die with their process. Relaunching an app on the Dell showed nothing because its fixed endpoint still held the previous instance's leftover messages. The kernel now clears every endpoint a process registered when it is reaped, and registration always starts a fresh queue.
- **2026-10-26** — usb-host enumerates every connected root port. The single-device controller state became a per-slot device table with class handlers (CCID, HID keyboard); two keyboards, or a keyboard next to a smart card, lose nothing. Hubs are not yet traversed.
- **2026-10-24** — User framebuffer mappings are write-combining. Scanout drivers were handed the framebuffer uncacheable, so a full-frame copy cost about a second per 4 MB on hardware. A 20 FPS game now runs on the Dell.
- **2026-10-24** — **Dell boot #11: the GUI runs on hardware and the keyboard types into it.** scanout-limine over the UEFI GOP framebuffer, the compositor, `terminal-window`, and a Logitech Unifying keyboard over xHCI, feeding [ADR-012](/adr/012-input-architecture/) events to the compositor. Keystrokes never enter the kernel. First interactive session on real hardware.
- **2026-10-23** — USB HID boot-protocol keyboard in usb-host, plus a `framebuffer-fallback` image profile that spawns scanout-limine + compositor + terminal. The xHCI transfer ring now wraps through its Link TRB; ADR-012's Input-3 landed inside usb-host, direct to the compositor.
- **2026-10-22 → 23** — **First boots on real hardware** (Dell Precision 3630, UEFI, USB stick, monitor only). Eleven boots, each finding a bug the emulator never showed: a GPT backup header the firmware refused, the APIC page mapped cacheable, APs booting without the BSP's Page Attribute Table (eleven CPUs writing the framebuffer uncombined made the boot crawl), a console lock that froze under interrupts, an xHCI port-reset write that disabled the port it had just reset. By boot #10 the first USB device was enumerated on hardware.
- **2026-10-17** — Framebuffer text console. Every kernel and service print is mirrored onto the framebuffer as text, so the boot log and shell show on a monitor with no serial cable.
- **2026-09-22** — Bare-metal first-boot image: a `headless` manifest profile and `make img-x86`. The Dell 3630 is the forward x86_64 target; the R710 is demoted to an optional boot-only smoke test.
- **2026-09-22** — [ADR-019](/adr/019-process-fault-reaping/) accepted and implemented on all three arches: a faulting process is reaped like a clean exit, with a typed `ExitReason::Faulted` and an audit row.
- **2026-09-15** — **The knife.** After the ADR-018 cutover no process is bootstrap-bound, so every "caller == bootstrap" gate admitted nobody. `BindPrincipal` and `ChannelRevoke` are deleted (slots tombstoned); `RevokeCapability` now requires the `revoke` right on the endpoint; cluster authority comes from manifest grants.
- **2026-09-15** — [ADR-018](/adr/018-init-process-and-boot-manifest/) step 9: the legacy boot chain is gone. Apps are manifest entries, started on demand; the kernel auto-starts nothing. Dependencies are keyed by endpoint, so the compositor depends on "whoever serves endpoint 27" and the image profile picks the scanout driver.
- **2026-09-14** — ADR-018 step 8, the cutover: `init` runs as PID 1 and spawns the whole service wave in dependency order, with per-service derived identities. AArch64 followed the same day; riscv64 boot rot (large kernel structs materialized on the boot stack) was root-caused and fixed, and riscv64 boots supervised. A lost-IPC-wake bug behind months of boot-stall flakes was found and fixed along the way.
- **2026-08-23** — An `UnlockVolume` capability replaces the bootstrap gates on the two full-disk-encryption syscalls.
- **2026-07-03 → 16** — ADR-018 steps 1–7: a `cambios-manifest` wire-format crate, the `build-manifest` tool, kernel manifest transcription into write-once reservation and spawn-grant tables, and the `user/init` supervisor crate.
- **2026-07-03 → 06** — [ADR-037](/adr/037-native-app-framework/) accepted and Phase 1 landed: `libsys-rt` (`service_main!` entry macro, standard panic handler, opt-in heap) and `libipc` (typed errors, bounds-checked payload cursors, service loop). Every buildable service — all 22 — ported in three days.
- **2026-07-02** — Concurrency fixes merged: AArch64 and riscv64 TLB shootdown now order the page-table store before the broadcast invalidate; `IrqSpinlock` actually masks interrupts on AArch64 and riscv64 (it had been x86-only).
- **2026-06-15** — Audit event taxonomy moves to a single source of truth in `cambios-abi`; `audit-tail` renders canonical `domain.action` names from it. [ADR-007](/adr/007-capability-revocation/) amended.
- **2026-06-07** — [ADR-036](/adr/036-typed-mmio-register-blocks/): device drivers address hardware through `#[repr(C)]` typed register blocks whose field layout *is* the asserted register map. GIC, Local APIC, and PLIC migrated.
- **2026-06-03** — [ADR-034](/adr/034-deferred-task-resource-reclamation/): the page-table root, kernel stack, and task slot a dying task cannot free from its own context are reclaimed by a deferred pass. Closes the long-standing bounded kernel-stack leak.
- **2026-05-29** — Multi-Principal vault Phase 1C complete ([ADR-033](/adr/033-multi-principal-vault/)): `bind_for_spawn`, `sign_with`, and `decrypt_with` shipped; fde-mount's full-disk-encryption unlock routes through the vault on every boot.
- **2026-05-25** — USB host stack (xHCI) bring-up under QEMU; the CCID smart-card layer split into a dedicated `user/ccid` module — groundwork for hardware-token (PIV / YubiKey) access.
- **2026-05-16** — Storage architecture decided across [ADR-028](/adr/028-three-storage-models/)–[ADR-032](/adr/032-full-disk-encryption-below-substrate/): three storage models under kernel-API type discipline, a [unified substrate](/adr/031-unified-storage-substrate/), and full-disk encryption below it.

---

## Subsystem status

**Archs column:** `x` = x86_64, `a` = AArch64, `r` = riscv64. `x/a/r` means first-class parity.

| Subsystem | Status | Archs | Design |
|---|---|---|---|
| Microkernel core | Done | x/a/r | [Architecture](/docs/architecture/) |
| Per-CPU SMP scheduler (with reschedule IPI on cross-CPU wake) | Done | x/a/r (IPI kick is x86 today; a/r ride the tick) | [ADR-001](/adr/001-smp-scheduling/) |
| Voluntary + preemptive context switch | Done | x/a/r | [ADR-001](/adr/001-smp-scheduling/) |
| Init process + signed boot manifest (supervised boot, per-service identities, on-demand apps) | Done | x/a/r | [ADR-018](/adr/018-init-process-and-boot-manifest/) |
| Native app framework (`libsys-rt` + `libipc`; every service on `service_main!`) | Done (Phase 1); `libui` toolkit and service scaffolding later phases | x/a/r | [ADR-037](/adr/037-native-app-framework/) |
| IPC control path (256-byte messages) | Done | x/a/r | [ADR-000](/adr/000-zta-and-cap/), [ADR-002](/adr/002-enforcement-pipeline/), [ADR-005](/adr/005-ipc-primitives/) |
| IPC bulk path (shared-memory channels) | Done | x/a/r | [ADR-005](/adr/005-ipc-primitives/) |
| Capability revocation | Done (`revoke`-right authority; grantor + policy-service paths post-v1) | x/a/r | [ADR-007](/adr/007-capability-revocation/) |
| Boot-time-sized kernel object tables | Done | x/a/r | [ADR-008](/adr/008-boot-time-object-tables/) |
| Deployment tiers | Designed; policy-only (single binary, tier picks `TableSizingPolicy` at install) | — | [ADR-009](/adr/009-purpose-tiers-scope/), [Governance](/docs/governance/) |
| Audit infrastructure (taxonomy single-sourced in `cambios-abi`) | Done | x/a/r | [ADR-007](/adr/007-capability-revocation/) |
| Audit consumer capability + `audit-tail` | Done | x/a/r | [ADR-023](/adr/023-audit-consumer-capability/) |
| Policy service (per-process syscall allowlists) | Done | x/a/r | [ADR-006](/adr/006-policy-service/) |
| Cryptographic identity (Principal as 32-byte AID, bound at spawn from the manifest, transcribe-not-interpret) | Done | x/a/r | [identity.md](/docs/identity/), [ADR-025](/adr/025-principal-as-aid/), [ADR-026](/adr/026-identity-transcription/) |
| Multi-Principal vault service | Done — Phase 1C complete: `bind_for_spawn` / `sign_with` / `decrypt_with`; fde-mount is the live consumer (fs-service saves unsigned until per-service keys land) | x/a/r | [ADR-033](/adr/033-multi-principal-vault/), [identity.md](/docs/identity/) |
| `did:key` encoder + decoder | Done (encoding only, not full DID resolution) | x/a/r | [identity.md](/docs/identity/) Phase 4 |
| Signed ELF loading (ARCSIG trailer, Ed25519) | Done | x/a/r | [ADR-004](/adr/004-cryptographic-integrity/) |
| Content-addressed ObjectStore (RAM fallback) | Done | x/a/r | [ADR-003](/adr/003-content-addressed-storage/) |
| Persistent ObjectStore (disk) | Done | x (via virtio-blk) | [ADR-010](/adr/010-persistent-object-store/) |
| BlockDevice abstraction | Done | x/a/r | [ADR-010](/adr/010-persistent-object-store/) |
| FS service (endpoint 16, ObjectStore gateway) | Done | x/a/r | — |
| Key-store service (endpoint 17) | Done — software PIV backend under `dev-piv`; real hardware-token path rides the CCID pipe | x/a/r | [ADR-032](/adr/032-full-disk-encryption-below-substrate/) |
| Full-disk encryption (PIV-backed, `UnlockVolume`-gated) | Done — `fde-mount` unlock through the vault; multi-slot volume headers; `format-volume` tool | x/a/r | [ADR-032](/adr/032-full-disk-encryption-below-substrate/) |
| POSIX file storage backend | Substrate done; first handlers (create / open / stat / acl) landed; dispatcher wire-up pending | x | [ADR-028](/adr/028-three-storage-models/), [ADR-029](/adr/029-posix-file-storage-model/), [ADR-031](/adr/031-unified-storage-substrate/) |
| Virtio-blk driver | Done | x/a/r | [ADR-010](/adr/010-persistent-object-store/) |
| Virtio-net driver (modern PCI on x86; legacy MMIO on a/r; NTP demo live) | Done | x/a/r | — |
| Intel I219-LM driver (bare-metal target) | Scaffolded; the Dell enumerates the device, driver untested | x | — |
| UDP/IP stack (ARP/IPv4/UDP + NTP demo) | Done | x/a | — |
| Shell (incl. `arcobj` CLI) | Done | x/a/r | — |
| Wall-clock subsystem (`SetWallclock` / `GetWallclock` + cap) | Done | x/a/r | [ADR-022](/adr/022-wall-clock-time/) |
| Service clusters | Done — kernel ABI (`SYS_CLUSTER_*`) + `ClusterManager` + rendering-limb wiring, end-to-end | x | [ADR-027](/adr/027-service-clusters/) |
| USB host stack (xHCI + HID keyboard + CCID) | In progress — multi-device enumeration, control + bulk + interrupt transfers, boot-protocol keyboard; keyboard proven on the Dell; boot mouse and hubs next | x | [ADR-012](/adr/012-input-architecture/) |
| Typed MMIO register blocks (GIC, APIC, PLIC) | Done | x/a/r | [ADR-036](/adr/036-typed-mmio-register-blocks/) |
| PCI bus discovery (port-IO on x86, ECAM MMIO on a/r) | Done | x/a/r | — |
| Bootloader abstraction (`BootInfo` + `src/boot/`) | Done | x/a/r | [ADR-011](/adr/011-graphics-architecture/) |
| Framebuffer text console (boot log + shell on a monitor) | Done | x | [ADR-011](/adr/011-graphics-architecture/) |
| Compositor (Scanout-2/3 + Input-1 event routing) | Done | x/a | [ADR-014](/adr/014-compositor-scanout/) |
| `scanout-virtio-gpu` driver (default under QEMU) | Done | x/a | [ADR-014](/adr/014-compositor-scanout/) |
| `scanout-limine` driver (GOP framebuffer; the hardware path) | Done | x/a | [ADR-014](/adr/014-compositor-scanout/) |
| `pong` v0 (default GUI app on x86) | Done | x | [ADR-011](/adr/011-graphics-architecture/), [ADR-012](/adr/012-input-architecture/) |
| `worm` v0 (default GUI on AArch64) | Done | x/a | [ADR-011](/adr/011-graphics-architecture/), [ADR-012](/adr/012-input-architecture/) |
| `tree` v0 (Minesweeper, retained for regression) | Done | x | [ADR-011](/adr/011-graphics-architecture/), [ADR-014](/adr/014-compositor-scanout/) |
| `terminal-window` (boot splash → identity-aware shell with ANSI SGR) | Done — runs on the Dell | x | [ADR-011](/adr/011-graphics-architecture/), [ADR-022](/adr/022-wall-clock-time/) |
| `libgui` v0 (Surface primitives, TileGrid, FrameClock) | Done | x/a/r (host-testable; GUI runs where scanout exists) | [ADR-011](/adr/011-graphics-architecture/) |
| `virtio-input` driver | Done | x/a | [ADR-012](/adr/012-input-architecture/) |
| TLB shootdown | Done (x86 vector-IPI / ARM TLBI broadcast / RISC-V SBI IPI; weak-memory ordering fixed 2026-07) | x/a/r | — |
| Process lifecycle cleanup | Done — inline reclaim of caps, channels, clusters, VMAs, heap; page-table root, kernel stack, and task slot reclaimed by a deferred pass | x/a/r | [ADR-034](/adr/034-deferred-task-resource-reclamation/) |
| Process fault reaping (typed `ExitReason::Faulted`, audit row) | Done | x/a/r | [ADR-019](/adr/019-process-fault-reaping/) |
| USB boot tooling (`make img-usb` + `make usb DEVICE=...`, `headless` / `framebuffer-fallback` profiles) | Done — boots the Dell Precision 3630 | x | — |
| Formal verification (Kani) | 48 harnesses across 6 proof crates; fixed real overflow bugs in shipped code; gap-map in [CLAIMS.md](https://github.com/coherentforge/cambios/blob/main/verification/CLAIMS.md) | — | [ADR-000 § Divergence](/adr/000-zta-and-cap/) |
| AArch64 SMP timer on AP | **Gap**: PPI 30 not firing on the second CPU under QEMU `virt`. Single-CPU works. | a | — |
| DHCP client | Paused | — | — |
| DNS / TCP / Yggdrasil mesh / TLS / VFS / USB mouse + hubs / DID resolution / identity revocation | Planned | — | various |
| Translation layer for external trust ecosystems (ToIP / FPP / KERI) | Proposed | — | [ADR-035](/adr/035-translation-layer-compatibility/), [Identity Synthesis](/docs/identity-synthesis/) |
| AI pre-exec analysis / behavioral anomaly detection / Win32 compat | Planned (post-v1) | — | [Architecture](/docs/architecture/), [ADR-016](/adr/016-win-compat-api-ai-boundary/), [ADR-017](/adr/017-user-directed-cloud-inference/) |

---

## Roadmap

### Identity / storage phases

| Phase | Goal | Status |
|---|---|---|
| **0** | Identity primitives in kernel + RAM ObjectStore (every IPC stamped, every object has author + owner) | Done |
| **1** | Real cryptography: Blake3, Ed25519, signed ELF, key-store service | Done |
| **1B** | YubiKey-derived bootstrap pubkey compiled into kernel | Done |
| **1C** | Key-store degraded mode + signed ObjectStore puts + identity gate (no unsigned fallback); multi-Principal vault | Done |
| **2A** | First user-space hardware driver (virtio-net) | Done |
| **2B** | First user-space network service (UDP/IP + NTP demo) | Done |
| **3** | Architecture substrate: revocation, channels, audit, policy service | Done |
| **4** | Persistent storage: virtio-blk + disk ObjectStore + `arcobj` CLI | Done |
| **5** | Identity-routed Yggdrasil networking | Planned |
| **6** | Biometric commitment + key recovery | Planned (post-v1) |
| **7** | SSB bridge | Planned (post-v1) |

### v1 target

*Interactive, network-capable, identity-rooted OS running on real hardware with persistent storage.* Items dependency-ordered. The machine boots and takes input; the current blockers are the Intel I219-LM NIC and NVMe storage on the Dell 3630.

| # | Item | Status |
|---|---|---|
| 1 | Shell | Done |
| 2 | USB boot tooling | Done — proven on the Dell 3630 |
| 3 | Intel I219-LM NIC driver | Scaffolded; device enumerated on hardware, driver untested |
| 4 | DHCP client | Paused |
| 5 | DNS resolver | Planned |
| 6 | TCP stack | Planned |
| 7 | Virtio-blk driver | Done |
| 8 | Persistent ObjectStore | Done |
| 9 | `arcobj` CLI | Done |
| 10 | Yggdrasil peer service | Planned |

### RISC-V port

Parity-target with x86_64 / AArch64. All phases landed as of 2026-04-19; supervised boot (11-service wave) since 2026-09-14. Source: [ADR-013](/adr/013-riscv64-support/).

| Phase | Goal | Status |
|---|---|---|
| **R-0** | Build infra + tri-arch gate | Done (2026-04-15) |
| **R-1** | First serial output, `kmain_riscv64` banner | Done (2026-04-16) |
| **R-2** | Sv48 higher-half, DTB parser, frame allocator + heap | Done (2026-04-16) |
| **R-3** | Trap vector, SBI timer, PLIC, context switch, 100 Hz preemption | Done (2026-04-18) |
| **R-4** | U-mode transition, ELF `EM_RISCV` | Done (2026-04-18) |
| **R-5** | SMP via SBI HSM, cross-hart TLB shootdown | Done (2026-04-18/19) |
| **R-6** | Service parity: virtio-mmio, signed `-initrd` modules, 5 boot services | Done (2026-04-19) |

---

## Test coverage

Total: **935** on `x86_64-apple-darwin`. Run `RUST_MIN_STACK=8388608 cargo test --lib --target x86_64-apple-darwin`, or `make stats` for the live number.

Major categories (approximate; the breakdown drifts faster than the total):

| Area | Tests |
|---|---|
| Scheduler | 35 |
| Capability manager | 40 |
| IPC (interceptor, sender_principal, sync channel) | 17 |
| Channel manager | 29 |
| Process lifecycle cleanup | 3 |
| ELF verifier (incl. signed binary) | 14 |
| ObjectStore types + crypto | 21 |
| RamObjectStore | 12 |
| BlockDevice abstraction | 11 |
| DiskObjectStore (incl. reboot preservation) | 30 |
| Memory subsystem (buddy, frame, heap, paging, contiguous) | ~37 |
| Tier configuration | 16 |
| Kernel object table region | 5 |
| Audit (staging + events + ring/drain) | 44 |
| Syscall dispatcher | 40 |
| Syscalls user_slice (ADR-020 typed buffers) | 26 |
| Boot adapter (BootInfo + initrd parser) | 8 |
| PCI virtio-modern caps | 11 |
| AArch64 portable logic | 12 |
| Timer, ProcessTable, VMA tracker, manifest, reap, syscall args, other | ~170 |

**User-space crates** carry their own host tests: `libgui` v0 ships 26 (drawing primitives + TileGrid + font coverage), `libinput-proto` 8 (wire format + round-trips), `libgui-proto` 13 (incl. `input_event_roundtrip`); the usb-host HID report differ and `cambios-manifest` validator are host-tested too.

---

## Known issues (active)

- **riscv64 serial input reaches the shell for one byte only.** Typing at the riscv64 prompt echoes the first character; later bytes are swallowed by a UART diagnostic path. x86_64 and AArch64 deliver the whole line. Interactive riscv64 proofs spawn from the manifest wave until fixed.
- **AArch64 SMP timer on AP.** PPI 30 not firing on the second CPU under QEMU `virt`. Single-CPU works fully. Likely QEMU configuration or a missing GIC redistributor step on the AP path.
- **AArch64 device IRQ routing.** GIC `enable_spi` / `set_spi_trigger` exist but are not wired into the boot path or `handle_wait_irq`. No device IRQs on AArch64 today.
- **FDE fresh-wrap install flake (transient).** Roughly 1-in-5 fresh installs under the dev-piv smoke test fail at `install_master_key` with an out-of-memory in the format path; the same tree then unlocks clean. The failure site now names the underlying error for the next occurrence.
- **QEMU cocoa display can go unresponsive during GUI gameplay** while the guest stays healthy (audit lines keep flowing on serial). Host UI issue; quit and relaunch. Two deferred GUI follow-ups feed it: cursor drift under cocoa's relative-mouse stream, and the games' missing resize-protocol adoption.
- **ELF loader, overlapping-segment permissions.** If two `PT_LOAD` segments share a page with different permissions, the first segment's permissions win. Worked around in user-space linker scripts via `ALIGN(4096)` before `.data`.
- **USB hubs not traversed.** Devices behind an external hub are not reached; only root ports are enumerated.
- **Pre-existing driver warnings** in `user/i219-net/`: `dead_code` / `unused_imports` from scaffolded state. Not correctness issues; clean up on hardware bring-up.

---

## Cross-references

- [Architecture](/docs/architecture/) — long-form design, principles, threat model
- [Security](/docs/security/) — enforcement status (security subset)
- [Governance](/docs/governance/) — funding posture, deployment tiers, scope boundaries
- [Identity](/docs/identity/) — identity architecture (Phases 0-7)
- [Identity Synthesis](/docs/identity-synthesis/) — interop with decentralized-identity ecosystems (First Person Network, ToIP, KERI); translation, not adoption
- [ADRs](/adr/) — site-hosted decision records (000-037)
- [`coherentforge/cambios` on GitHub](https://github.com/coherentforge/cambios) — kernel source, full ADR set (000-037), `verification/CLAIMS.md`, `STATUS.md`, `CLAUDE.md`
