---
title: "Why Not Just Use X?"
url: /docs/why-not/
---

CambiOS is not a rejection of any of these systems, it exists because of them. Every project below taught us something, and several of them taught us how to build the parts of CambiOS that work today. After thinking about each one, none of them checked all the boxes.

## The five constraints CambiOS holds together

These are non-negotiable for CambiOS. No system on this page holds all five — not because the others are deficient, but because they were built for different problems.

1. **Architecturally enforced security.** Capability-checked IPC. Minimal kernel (five jobs). W^X. Drivers in user space. Security as structure, not policy on top of a permissive substrate.
2. **Sovereign identity.** Cryptographic key pairs, kernel-enforced. No central authority issues you. No account to be deplatformed from. No password to phish. Identity isn't what you carry, it's who you are.
3. **Sovereign data.** Content-addressed storage with per-principal ownership. Your keys. Your storage endpoint. No service in the middle that scans, indexes, or reports. Your machine holds the parts of your thinking you only trust to yourself.
4. **Sovereign network.** Identity-routed overlay. The destination is a public key; the infrastructure can't censor or surveil what it can't decrypt and can't redirect. *(Designed; UDP/IP slice running today — see [STATUS.md](/docs/status/).)* More than one network, CambiOS is designed to interoperate in the spirit of protocols over platforms.
5. **AI as infrastructure, optional by tier.** Verification, behavioral monitoring, compatibility translation, live-patching — supervised by local models. The same kernel runs without any of it on the embedded tier. *(Architectural; AI subsystem on roadmap. Tier model in [ADR-009](/adr/009-purpose-tiers-scope/).)* Local models to guide and interpret network security and UX. (To come.)

## Windows

The NT kernel pulled hundreds of millions of people into computing and kept the world's largest installed base running for thirty years - on top of remarkable backward-compatibility engineering. That work was done in an era when "the network is hostile" was not yet the default assumption and when telemetry-as-product was not yet the dominant business model — and the architecture reflects the era it was built in. Tens of millions of lines at the highest privilege level, telemetry as a structural feature with partial off-switches, identity defaulting to a vendor account, and now Recall reading the screen for indexing. We're not asking Windows to be something it isn't. We're building what the next era needs. CambiOS, for all it is, was inspired by the ubiquity and equal messiness of Windows as a whole and those users are the first we hope to serve.

## macOS

Apple's discipline around hardware-software integration, secure-enclave cryptography, and developer experience is genuinely admirable, and a lot of CambiOS's UX thinking is informed by what Apple has shown is possible. The boundary is who holds the keys. Notarization, the App Store path, iCloud, and Apple ID are vendor-managed by design — that's the deal Apple offers and millions of users reasonably accept it. CambiOS makes the other deal: the keys are yours, the identity is yours, and the answer to "who can revoke what runs on this machine?" is *you*. Different bet for a different user.

## Linux

CambiOS would not exist without Linux. The Rust toolchain we depend on, the QEMU we test in, the developer culture that made open-source kernels a normal thing to build — Linux made all of it. The critique here is architectural, not adversarial. Linux is a monolithic kernel of roughly thirty million lines, every line at ring 0, designed for a world of shared multi-user UNIX systems on trusted networks and incrementally hardened ever since. The capability story (LSM, namespaces, eBPF, seccomp, cgroups) is good engineering bolted onto a fundamentally permissive substrate that the kernel still has to keep working. The CambiOS play is that the next era — solo machines, hostile networks, capability-by-default — is worth the cost of building from scratch rather than retrofitting forever.

## Qubes OS

Qubes proved that end users will accept real overhead to get sovereignty — journalists, researchers, and the security community have relied on it for over a decade, and the world is better for it. The threat model Qubes articulated is essentially the threat model CambiOS inherited. The difference is the layer: Qubes compartmentalizes by giving every workload its own Xen VM, with a Linux dom0 and Linux template per qube as the trusted computing base. CambiOS pares back so the same compartmentalization can be done at the kernel level, on a microkernel sized for the job, without paying the VM cost or carrying the Linux substrate. Qubes opened the door; CambiOS is one attempt at the next room.

## seL4

seL4 is the proof that a general-purpose kernel can be formally verified end-to-end. Without that precedent, CambiOS's verification work would stand on much shakier ground — every Kani harness we write builds on the case seL4 made first. seL4 is a kernel, not an OS: no shipped userland, no networking, no identity, no UX, no compatibility layer. Building a usable system on it means building everything above it from scratch (Genode, CAmkES, and others have done excellent work there). CambiOS is trying to ship the whole stack with a coherent security model end to end, and we are honest about the tradeoff: our verification today — 47 Kani harnesses spanning the allocator, ELF parser, capability manager, user-slice validators, and DTB parser — is narrower than seL4's whole-kernel functional correctness, and we track the gap explicitly in [CLAIMS.md](https://github.com/coherentforge/cambios/blob/main/verification/CLAIMS.md). We're aiming to close that gap over time, and the code is already safer for the proofs we have.

## Hubris

Cliff Biffle and the Oxide team built exactly the right thing for what it's for: a small, deterministic, statically-configured Rust microkernel for service processors and embedded controllers. Hubris's design decisions — no dynamic process creation, statically-bounded everything, message-passing IPC — are a quiet demonstration that Rust microkernels are a real engineering option rather than a research curiosity. Hubris and CambiOS-Embedded sit in adjacent niches: Hubris owns the management plane, CambiOS-Embedded owns the device that runs against it. Different flavor, same standard.

## Redox

Redox has been showing for years that a Rust microkernel can ship, run, host a Unix-like userland, and support a working desktop. That's the harder half of the work CambiOS is now doing, and Redox has more userland maturity today than CambiOS does. The divergence is at the model: Redox is "Unix, done properly, in Rust." CambiOS makes a different bet — that the era of POSIX semantics, shared filesystem namespaces, DNS-as-naming-layer, and superuser identity is the era that's ending. Identity is a key, storage is content-addressed, the network is an overlay between principals. Two paths up the same mountain; we picked the longer one.

## Kubernetes

Kubernetes solved a real and hard problem: how to schedule and operate stateless services across a fleet of rented machines without inventing a new orchestration story per workload. That's an enormous contribution to how the cloud actually works. It is also a different problem from the one CambiOS is solving. Kubernetes is a workload orchestrator over a permissive Linux substrate, and its security model (Pod, RBAC, NetworkPolicy on top of cgroups and namespaces) inherits whatever the underlying distribution allows. CambiOS is asking "what runs on the machine in front of me, and what is it allowed to do?" — a question the orchestration layer doesn't need to answer.

## Fuchsia

Zircon and the Fuchsia component model are some of the most interesting modern microkernel work in the open, and the framework owes a clear debt to the capability-systems lineage CambiOS draws on too. The reason CambiOS exists alongside Fuchsia is structural rather than technical: Fuchsia's roadmap, scope, and governance are set by the project's sponsor, and the user model that follows from that is the one that fits the sponsor's products. CambiOS makes governance commitments that set it apart — openly developed under a permissive license, transparently funded, no roadmap contingent on a single vendor's commercial interest, no telemetry subsystem to compromise. See [GOVERNANCE.md](/docs/governance/).

## What this comes down to

The microkernel-plus-capabilities pattern is no longer exotic. seL4 proved it can be verified. Fuchsia and Redox proved it can be built. Hubris proved it can ship. Qubes proved that end users will accept real cost to get sovereignty. CambiOS's bet is that the pattern is now ready to carry the *whole user-facing stack* — identity, network, data, UX, AI — built on first principles, with the VM cost retired and the substrate built to fit.

The other piece is sustainability. CambiOS is built in the lineage that Red Hat made commercially possible: open code, transparent funding, value created through service and support rather than through extraction from users. The architecture commits the project to no telemetry, no vendor lock, no central identity. The governance model commits the project to staying that way. We want to interoperably connect people without the tax of extraction. That is the project; the rest is implementation.

If you want to see how far along we are, [STATUS.md](/docs/status/) is the source of truth — every subsystem, every test count, every known gap. If you want to see why, read [the architecture document](/docs/architecture/) and [the philosophy](/docs/philosophy/).
