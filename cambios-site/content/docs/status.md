---
title: "Implementation Status"
url: /docs/status/
last_synced_to_kernel: 2026-05-04
---

# CambiOS Implementation Status

> **Living doc.** Single source of truth for "what is currently built." Refreshed as feature work lands. Intent and rationale live in [Architecture](/docs/architecture/) and the design docs; this file is *current state*.
>
> "Is X done yet?" — read here. "Should X be done a certain way?" — read the linked design doc.

*Last synced to code: 2026-05-04.*

---

## At a glance

- **Tri-arch first-class.** Clean release build on `x86_64`, `aarch64`, and `riscv64gc`. All three boot in QEMU to a `cambios>` shell prompt. `make check-all` is the permanent regression gate.
- **561 host unit tests passing** on `x86_64-apple-darwin`. Numbers live in code, not prose — `make stats` for the current count.
- **Security model live end-to-end.** Cryptographic identity, signed-ELF verification, capability-gated IPC, content-addressed ObjectStore, audit ring, kernel identity gate, userspace `recv_verified`.
- **GUI stack live on x86_64 + AArch64.** scanout-virtio-gpu drives QEMU virtio-gpu-pci; compositor composites; virtio-input forwards HID keyboard and pointer events into the focused window. Default GUI boot module is `pong` on x86_64 (continuous-motion 1-player vs AI), `worm` on AArch64; `tree` (Minesweeper) stays buildable for regression.
- **Persistent storage live.** virtio-blk + disk-backed ObjectStore + `arcobj` shell CLI; objects survive reboot.
- **Bare metal.** USB boot tooling complete; not yet exercised on target hardware (Dell Precision 3630).
- **Formal verification.** 47 Kani harnesses across 6 proof crates (BuddyAllocator, ELF parser, FrameAllocator, CapabilityManager, UserSlice, DTB parser). Proof authoring has fixed real overflow bugs in shipped code. The honest gap between proven and aspirational claims lives in [verification/CLAIMS.md](https://github.com/coherentforge/cambios/blob/main/verification/CLAIMS.md).
- **Repository.** Public on GitHub at [coherentforge/cambios](https://github.com/coherentforge/cambios) — AGPL-3.0-or-later on kernel + services + apps, MPL-2.0 on `user/libsys/`.

---

## Recent landings

Newest first. Rolling ~3-week window; older items rotate out (the [git log](https://github.com/coherentforge/cambios/commits/main) has the full history).

- **2026-05-04** — [verification/CLAIMS.md](https://github.com/coherentforge/cambios/blob/main/verification/CLAIMS.md) is the honest gap-map between "what runs" and "what's proven." 14 rows spanning all four Status values (Proven / Tested / Asserted / Aspirational) and three claim Layers (behavior / guarantee / meaning). Layer-3 meaning-claims like "Zero-trust" and "AI watches but does not decide" are explicitly marked Aspirational by their nature, and the doc says so.
- **2026-05-04** — DTB parser Kani proofs (5 harnesses) covering header validation, byte-extraction safety, wire-format contracts, and bounded callbacks. A real Kani finding fixed: `be_u32_at` / `be_u64_at` claimed to "return 0 on overrun" but actually panicked with arithmetic overflow at extreme offsets. Both helpers now use `checked_add`. ADR-013's "no panics in the boot path" claim now has provable backing for the byte-extraction layer.
- **2026-05-03** — Multi-Principal vault Phase 1C: a userspace service extending the key-store with kernel consultation at process spawn. Plurality lives in userspace; the kernel keeps `Principal` singular and atomic. AI sandboxes are per-Principal.
- **2026-05-03** — [ADR-027](https://github.com/coherentforge/cambios/blob/main/docs/adr/027-service-clusters.md): service clusters as identity-bound channel meshes. Designed only — kernel-ABI cluster handle and lock-hierarchy placement spelled out; no implementation yet. First target is the rendering limb (compositor + scanout + virtio-input + libgui clients).
- **2026-05-02** — [ADR-026](https://github.com/coherentforge/cambios/blob/main/docs/adr/026-identity-transcription-at-the-kernel-ring.md): the "transcribe-not-interpret" identity invariant. Codifies a rule the kernel was already following implicitly — read a Principal AID, copy it onto outgoing IPC and authored objects; never branch on the AID *value* to make a policy decision. AI-watches-flags-sandboxes-but-does-not-write-policy is now a load-bearing principle, not just a slogan.
- **2026-05-01** — [ADR-025](https://github.com/coherentforge/cambios/blob/main/docs/adr/025-principal-as-aid.md): Principal is now a 32-byte AID with first-class algorithm and hash bytes. Today's instantiation is `Ed25519 + blake3(pubkey)`. Post-quantum migration to Dilithium is a code-only change — no wire-format rewrite.
- **2026-04-27** — Wall-clock subsystem ([ADR-022](https://github.com/coherentforge/cambios/blob/main/docs/adr/022-wall-clock-time.md)): `SetWallclock` / `GetWallclock` syscalls with a `SetWallclock` capability gate. Identity-aware shell prompt (`did:key:z6Mk…@user>`).
- **2026-04-27** — `terminal-window` (new first-party app): boot splash → recede-to-watermark → identity-aware shell with ANSI SGR per-cell color in the GUI Grid renderer. Compositor gains z-stack semantics: layered windows + per-pixel alpha.
- **2026-04-26** — Syscall ABI surface factored out to a standalone [`cambios-abi`](https://github.com/coherentforge/cambios/blob/main/docs/adr/024-syscall-abi-crate.md) crate (`no_std`, MPL-2.0, zero deps beyond `core`). Single source of truth across kernel + userspace; the "must match `src/syscalls/mod.rs`" comment that flagged the old hand-mirror is gone.
- **2026-04-26** — Audit consumer capability ([ADR-023](https://github.com/coherentforge/cambios/blob/main/docs/adr/023-audit-consumer-capability.md)). Bootstrap-Principal-only check on `SYS_AUDIT_ATTACH` replaced with `CapabilityKind::AuditConsumer`. New signed `audit-tail` boot module attaches to the ring and prints one-line `did:key:z6Mk…` summaries.
- **2026-04-22** — Kernel ECAM PCI enumerator → AArch64 GUI parity. virtio-gpu-pci + virtio-input now discoverable over ECAM MMIO on aarch64; `make run-aarch64-gui` runs `worm` end-to-end.
- **2026-04-22** — `pong` v0 (default GUI boot module on x86_64). Continuous-motion physics, classic-Pong spin, speed-capped AI. Replaces `worm` as default; `worm` and `tree` retained for regression and as the default on AArch64.
- **2026-04-21** — Repository made public; AGPL-3.0-or-later (kernel/services/apps) + MPL-2.0 (libsys). SPDX headers across every source and config file.
- **2026-04-21** — `did:key` encoder/decoder for Principals: 32-byte Ed25519 pubkey ↔ `did:key:z6Mk…` via multicodec `0xed` + base58btc. Cross-verified against the RFC 8032 Test 1 vector.
- **2026-04-21** — Kani proofs for CapabilityManager: 12 harnesses on `src/ipc/capability.rs` covering `ProcessCapabilities` invariants and cross-process operations on a 3-slot manager. [ADR-000](/adr/000-zta-and-cap/) now cites these proofs as the formal backing for the capability-soundness claim.
- **2026-04-21** — Kani proofs for FrameAllocator: 9 harnesses covering `allocate`, `free`, `allocate_contiguous`, `free_contiguous`, and `add_region` overflow. Proof authoring found two integer-overflow sites in shipped code; both fixed with `saturating_add`.
- **2026-04-21** — Input-1 ([ADR-012](/adr/012-input-architecture/)): `libinput-proto` 96-byte wire format, `virtio-input` driver, compositor input routing to focused window, `libgui::Client::poll_event`. `make run-gui` captures Cocoa keyboard/mouse → serial log end-to-end.
- **2026-04-21** — `libgui` v0: `Surface` primitives (`fill_rect`, Bresenham `draw_line`, 8×8 ASCII font, `blit_bitmap` with optional chroma-key) + `TileGrid`. `tree` (Minesweeper) ported as the first consumer.
- **2026-04-20** — Phase Scanout-4.b: `scanout-virtio-gpu` is the default scanout driver. Modern virtio-pci transport, five 2D ops, `make run-gui` shows a visible window.
- **2026-04-19** — RISC-V Phase R-6: `riscv64` boots to `cambios>` shell prompt with 5 signed boot modules via `-initrd`. Third architecture at service-level parity.

---

## Subsystem status

**Archs column:** `x` = x86_64, `a` = AArch64, `r` = riscv64. `x/a/r` means first-class parity.

| Subsystem | Status | Archs | Design |
|---|---|---|---|
| Microkernel core | Done | x/a/r | [Architecture](/docs/architecture/) |
| Per-CPU SMP scheduler | Done | x/a/r | [ADR-001](/adr/001-smp-scheduling/) |
| Voluntary + preemptive context switch | Done | x/a/r | [ADR-001](/adr/001-smp-scheduling/) |
| IPC control path (256-byte messages) | Done | x/a/r | [ADR-000](/adr/000-zta-and-cap/), [ADR-002](/adr/002-enforcement-pipeline/), [ADR-005](/adr/005-ipc-primitives/) |
| IPC bulk path (shared-memory channels) | Done | x/a/r | [ADR-005](/adr/005-ipc-primitives/) |
| Capability revocation | Done (bootstrap-authority only; grantor + revoke-right paths post-v1) | x/a/r | [ADR-007](/adr/007-capability-revocation/) |
| Boot-time-sized kernel object tables | Done | x/a/r | [ADR-008](/adr/008-boot-time-object-tables/) |
| Deployment tiers | Designed; policy-only (single binary, tier picks `TableSizingPolicy` at install) | — | [ADR-009](/adr/009-purpose-tiers-scope/), [Governance](/docs/governance/) |
| Audit infrastructure | Done | x/a/r | [ADR-007](/adr/007-capability-revocation/) |
| Audit consumer capability + `audit-tail` | Done | x/a/r | [ADR-023](https://github.com/coherentforge/cambios/blob/main/docs/adr/023-audit-consumer-capability.md) |
| Policy service (per-process syscall allowlists) | Done | x/a/r | [ADR-006](/adr/006-policy-service/) |
| Cryptographic identity (Principal as 32-byte AID, transcribe-not-interpret) | Done | x/a/r | [identity.md](https://github.com/coherentforge/cambios/blob/main/docs/identity.md), [ADR-025](https://github.com/coherentforge/cambios/blob/main/docs/adr/025-principal-as-aid.md), [ADR-026](https://github.com/coherentforge/cambios/blob/main/docs/adr/026-identity-transcription-at-the-kernel-ring.md) |
| Multi-Principal vault service | Done (userspace plurality; kernel `Principal` stays singular) | x/a/r | [identity.md Phase 1C](https://github.com/coherentforge/cambios/blob/main/docs/identity.md), [ADR-026](https://github.com/coherentforge/cambios/blob/main/docs/adr/026-identity-transcription-at-the-kernel-ring.md) |
| `did:key` encoder + decoder | Done (encoding only, not full DID resolution) | x/a/r | [identity.md](https://github.com/coherentforge/cambios/blob/main/docs/identity.md) Phase 4 |
| Signed ELF loading (ARCSIG trailer, Ed25519) | Done | x/a/r | [ADR-004](/adr/004-cryptographic-integrity/) |
| Content-addressed ObjectStore (RAM fallback) | Done | x/a/r | [ADR-003](/adr/003-content-addressed-storage/) |
| Persistent ObjectStore (disk) | Done | x (via virtio-blk) | [ADR-010](/adr/010-persistent-object-store/) |
| BlockDevice abstraction | Done | x/a/r | [ADR-010](/adr/010-persistent-object-store/) |
| FS service (endpoint 16, ObjectStore gateway) | Done | x/a/r | — |
| Key-store service (endpoint 17) | Done (degraded mode — no runtime YubiKey yet) | x/a/r | — |
| Virtio-blk driver | Done | x/a/r | [ADR-010](/adr/010-persistent-object-store/) |
| Virtio-net driver (modern PCI on x86; legacy MMIO on a/r; NTP demo live) | Done | x/a/r | — |
| Intel I219-LM driver (bare-metal target) | Scaffolded, untested on hardware | x | — |
| UDP/IP stack (ARP/IPv4/UDP + NTP demo) | Done | x/a | — |
| Shell (incl. `arcobj` CLI) | Done | x/a/r | — |
| Wall-clock subsystem (`SetWallclock` / `GetWallclock` + cap) | Done | x/a/r | [ADR-022](https://github.com/coherentforge/cambios/blob/main/docs/adr/022-wall-clock-time.md) |
| Service clusters | Designed; no implementation yet | — | [ADR-027](https://github.com/coherentforge/cambios/blob/main/docs/adr/027-service-clusters.md) |
| PCI bus discovery (port-IO on x86, ECAM MMIO on a/r) | Done | x/a/r | — |
| Bootloader abstraction (`BootInfo` + `src/boot/`) | Done | x/a/r | [ADR-011](/adr/011-graphics-architecture/) |
| Compositor (Scanout-2/3 + Input-1 event routing) | Done | x/a | [ADR-014](/adr/014-compositor-scanout/) |
| `scanout-virtio-gpu` driver (default) | Done | x/a | [ADR-014](/adr/014-compositor-scanout/) |
| `pong` v0 (default GUI boot module on x86) | Done | x | [ADR-011](/adr/011-graphics-architecture/), [ADR-012](/adr/012-input-architecture/) |
| `worm` v0 (default GUI on AArch64) | Done | x/a | [ADR-011](/adr/011-graphics-architecture/), [ADR-012](/adr/012-input-architecture/) |
| `tree` v0 (Minesweeper, retained for regression) | Done | x | [ADR-011](/adr/011-graphics-architecture/), [ADR-014](/adr/014-compositor-scanout/) |
| `terminal-window` (boot splash → identity-aware shell with ANSI SGR) | Done | x | [ADR-011](/adr/011-graphics-architecture/), [ADR-022](https://github.com/coherentforge/cambios/blob/main/docs/adr/022-wall-clock-time.md) |
| `libgui` v0 (Surface primitives, TileGrid, FrameClock) | Done | x/a/r (host-testable; GUI runs where scanout exists) | [ADR-011](/adr/011-graphics-architecture/) |
| `virtio-input` driver | Done | x/a | [ADR-012](/adr/012-input-architecture/) |
| TLB shootdown | Done (x86 vector-IPI / ARM TLBI broadcast / RISC-V SBI IPI) | x/a/r | — |
| Process lifecycle cleanup (caps, channels, VMAs, page-table frames, heap) | Done; kernel stack free deferred (bounded leak) | x/a/r | — |
| USB boot tooling (`make img-usb` + `make usb DEVICE=...`) | Done; untested on target hardware | x | — |
| Formal verification (Kani) | 47 harnesses across 6 proof crates; fixed real overflow bugs in shipped code; gap-map in [CLAIMS.md](https://github.com/coherentforge/cambios/blob/main/verification/CLAIMS.md) | — | [ADR-000 § Divergence](/adr/000-zta-and-cap/) |
| AArch64 SMP timer on AP | **Gap**: PPI 30 not firing on the second CPU under QEMU `virt`. Single-CPU works. | a | — |
| DHCP client | Paused | — | — |
| DNS / TCP / Yggdrasil mesh / TLS / VFS / USB HID / DID resolution / identity revocation | Planned | — | various |
| AI pre-exec analysis / behavioral anomaly detection / Win32 compat | Planned (post-v1) | — | [Architecture](/docs/architecture/), [ADR-016](https://github.com/coherentforge/cambios/blob/main/docs/adr/016-win-compat-api-ai-boundary.md), [ADR-017](https://github.com/coherentforge/cambios/blob/main/docs/adr/017-user-directed-cloud-inference.md) |

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

*Interactive, network-capable, identity-rooted OS running on real hardware with persistent storage.* Items dependency-ordered. The current blocker is bare-metal Intel I219-LM bring-up on the Dell 3630.

| # | Item | Status |
|---|---|---|
| 1 | Shell | Done |
| 2 | USB boot tooling | Done (untested on target hardware) |
| 3 | Intel I219-LM NIC driver | Scaffolded (untested on target hardware) |
| 4 | DHCP client | Paused |
| 5 | DNS resolver | Planned |
| 6 | TCP stack | Planned |
| 7 | Virtio-blk driver | Done |
| 8 | Persistent ObjectStore | Done |
| 9 | `arcobj` CLI | Done |
| 10 | Yggdrasil peer service | Planned |

### RISC-V port

Parity-target with x86_64 / AArch64. All phases landed as of 2026-04-19. Source: [ADR-013](/adr/013-riscv64-support/).

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

Total: **561** on `x86_64-apple-darwin`. Run `RUST_MIN_STACK=8388608 cargo test --lib --target x86_64-apple-darwin`, or `make stats` for the live number.

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
| Timer, ProcessTable, VMA tracker, syscall args, other | ~127 |

**User-space crates** carry their own host tests: `libgui` v0 ships 26 (drawing primitives + TileGrid + font coverage), `libinput-proto` 8 (wire format + round-trips), `libgui-proto` 13 (incl. `input_event_roundtrip`).

---

## Known issues (active)

- **AArch64 SMP timer on AP.** PPI 30 not firing on the second CPU under QEMU `virt`. Single-CPU works fully. Likely QEMU configuration or a missing GIC redistributor step on the AP path.
- **AArch64 device IRQ routing.** GIC `enable_spi` / `set_spi_trigger` exist but are not wired into the boot path or `handle_wait_irq`. No device IRQs on AArch64 today. Revisit when the first AArch64 path actually needs device IRQs.
- **ELF loader, overlapping-segment permissions.** If two `PT_LOAD` segments share a page with different permissions, the first segment's permissions win. Worked around in user-space linker scripts via `ALIGN(4096)` before `.data`.
- **Kernel stack not freed on process exit.** Full lifecycle cleanup (caps, channels, VMAs, page-table frames, heap) lands today. The 32 KiB kernel stack per task remains a bounded leak — can't free the stack you're running on. Worst case `num_slots × 32 KiB` ≈ 6.4 MiB. Awaiting a scheduler-level deferred-dealloc pass.
- **Clippy warnings (~125).** Mostly `multiple_unsafe_ops_per_block` in arch code (~67), missing `// SAFETY:` annotations (~25), `static_mut_refs` patterns awaiting Rust 2024 migration (~12), `new_without_default` (~20). Dedicated pass scheduled before `static_mut` deprecation becomes a hard error.
- **Pre-existing driver warnings** in `user/i219-net/`: `dead_code` / `unused_imports` from scaffolded state. Not correctness issues; clean up on next real-hardware bring-up.
- **Virtio-net TX on QEMU TCG.** QEMU defers virtio TX to its event loop, which runs during guest `hlt`. The UDP stack's ARP retry/timeout logic doesn't yet exploit this fully.

---

## Cross-references

- [Architecture](/docs/architecture/) — long-form design, principles, threat model
- [Security](/docs/security/) — enforcement status (security subset)
- [Governance](/docs/governance/) — funding posture, deployment tiers, scope boundaries
- [Identity](/docs/identity/) — identity architecture (Phases 0-7)
- [ADRs](/adr/) — site-hosted decision records (000-015)
- [`coherentforge/cambios` on GitHub](https://github.com/coherentforge/cambios) — kernel source, full ADR set (000-027), `verification/CLAIMS.md`, `STATUS.md`, `CLAUDE.md`
