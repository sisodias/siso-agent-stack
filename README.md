# SISO Agent Stack

One version-pinned distribution for giving another person the reusable SISO Claude Code and Codex setup: skills, hooks, playbooks, agent definitions, global operating profiles, runtime components, coordination services, integrations, and Herdr source.

This repository is intentionally an umbrella installer rather than a duplicated monorepo. Each component keeps its own GitHub identity, license, release cadence, and Great Library Work. `stack.manifest.json` pins the exact composition.

**Ecosystem map:** [SISO Agent Stack in the Great Library](https://great-library-of-siso.vercel.app/works/siso-agent-stack-distribution/) · **Machine contract:** [`stack.manifest.json`](stack.manifest.json) · **Contributing:** [`CONTRIBUTING.md`](CONTRIBUTING.md)

## Install

Prerequisites: Git and Node.js 20 or newer. Python-backed component commands need Python 3. Herdr can be installed separately from its pinned source or with its official installer.

```bash
git clone https://github.com/sisodias/siso-agent-stack.git
cd siso-agent-stack
./install.sh
siso-stack doctor
```

If `~/.local/bin` is not already on your `PATH`, either add it or run `node bin/siso-stack.mjs doctor` from the cloned distribution.

The installer:

- materializes every selected component at an exact commit under `~/.siso/agent-stack/repos/`;
- installs the public Skills Hub and Playbook skills into both `~/.claude/skills/` and `~/.codex/skills/`;
- installs portable researcher, planner, worker, verifier, and refuter definitions in each host's native format: Markdown for Claude Code and standalone TOML for Codex;
- adds marker-managed global Claude and Codex profile blocks while preserving unrelated instructions;
- installs the SISO Hooks package into both host configurations;
- creates command shims under `~/.local/bin/`;
- installs the `siso-stack` command for later planning, verification, and updates;
- writes a machine-readable receipt and verifies it with `doctor`.

Existing unrelated files are never silently overwritten. A collision stops installation with the original file preserved.

## Profiles

```bash
./install.sh                    # full public stack, including optional components and Herdr source
./install.sh --required-only    # Project OS, Runtime, Agent Zero, Skills, Playbook, and Hooks
./install.sh --no-external      # omit external Herdr source
./install.sh --dry-run          # print selected component pins and clone destinations
```

Use `--home PATH` and `--root PATH` for an isolated install. Maintainers can use `--source-root PATH` to verify against local checkouts without changing the release pins.

## First five minutes

```bash
siso-stack plan              # show every selected repository and exact commit
siso-stack doctor            # verify pins, profiles, agents, skills, hooks, shims, and receipt
siso-hooks doctor            # inspect the lifecycle-hook installation directly
```

The default install is the complete public stack. Use `--required-only` for the smallest supported core. The installer is idempotent for files it manages and stops on unrelated file collisions instead of overwriting them.

## Update and rollback

The distribution is the lockfile for the whole stack. Update it, inspect the new plan, and rerun the installer:

```bash
git pull --ff-only
siso-stack plan
./install.sh
siso-stack doctor
```

To return to an earlier published stack, check out its release tag and rerun the same install and doctor commands. Component checkouts are detached at the exact commits recorded by that tag. The installer preserves unrelated host files and creates backups before changing an existing managed profile block.

## What is included

| Layer | Source |
| --- | --- |
| Project operating contract | SISO Project OS |
| Provider-neutral execution | SISO Agent Runtime |
| Intent and coordination | SISO Agent Zero |
| Durable shared state | SISO Agent Brain |
| Atomic capabilities | SISO Skills Hub |
| Multi-agent scenarios and worker tools | SISO Agent Playbook |
| Session learning | SISO Session Intelligence |
| Experimental adapters | SISO Agent Integrations |
| Claude/Codex lifecycle automation | SISO Agent Hooks |
| Persistent terminal runtime | Herdr, external Apache-2.0 Work |

The exact repositories and commit pins are in `stack.manifest.json`.

## Explicit privacy boundary

The distribution does not contain provider credentials, Bifrost keys, private network topology, personal memory or lessons, prompt/response bodies, raw transcripts, runtime databases, telemetry, caches, logs, client code, or private project repositories. It installs templates and source; each operator supplies their own accounts and secrets locally.

## Extend the stack

- Add or improve an atomic capability in the [Skills Hub](https://github.com/Lordsisodia/siso-skills-hub).
- Compose multi-agent operating scenarios in the [Agent Playbook](https://github.com/Lordsisodia/siso-agent-playbook).
- Add lifecycle policy and automation in [Agent Hooks](https://github.com/sisodias/siso-agent-hooks).
- Propose a new distribution component only when it has an independent adoption, ownership, security, or release boundary.

The Great Library records stable component identity and composition. This repository only pins and installs accepted public releases; it does not absorb their source or ownership.

## Verify

```bash
npm test
npm run verify
node bin/siso-stack.mjs plan
```

MIT licensed. Components retain their own licenses; Herdr remains Apache-2.0 and externally owned.
