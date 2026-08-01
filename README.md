# SISO Agent Stack

One version-pinned distribution for giving another person the reusable SISO Claude Code and Codex setup: skills, hooks, playbooks, agent definitions, global operating profiles, runtime components, coordination services, integrations, and Herdr source.

This repository is intentionally an umbrella installer rather than a duplicated monorepo. Each component keeps its own GitHub identity, license, release cadence, and Great Library Work. `stack.manifest.json` pins the exact composition.

## Install

Prerequisites: Git and Node.js 20 or newer. Python-backed component commands need Python 3. Herdr can be installed separately from its pinned source or with its official installer.

```bash
git clone https://github.com/sisodias/siso-agent-stack.git
cd siso-agent-stack
./install.sh
node bin/siso-stack.mjs doctor
```

The installer:

- materializes every selected component at an exact commit under `~/.siso/agent-stack/repos/`;
- installs the public Skills Hub and Playbook skills into both `~/.claude/skills/` and `~/.codex/skills/`;
- installs portable researcher, planner, worker, verifier, and refuter definitions in each host's native format: Markdown for Claude Code and standalone TOML for Codex;
- adds marker-managed global Claude and Codex profile blocks while preserving unrelated instructions;
- installs the SISO Hooks package into both host configurations;
- creates command shims under `~/.local/bin/`;
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

## Verify

```bash
npm test
npm run verify
node bin/siso-stack.mjs plan
```

MIT licensed. Components retain their own licenses; Herdr remains Apache-2.0 and externally owned.
