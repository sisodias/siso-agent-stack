# Agent guide — SISO Agent Stack Distribution

This repository is a version-pinned distribution, not the canonical source for its components.

## Sources of truth

- `stack.manifest.json` owns component URLs, revisions, roles, install strategy, and commands.
- Component repositories own their source and releases.
- `profiles/` owns the portable global Claude/Codex overlay and agent definitions.
- The Great Library owns stable Work, Release, and Assembly identity.

## Rules

- Never vendor credentials, transcripts, personal memory, databases, generated state, or private topology.
- Never silently overwrite an existing skill, agent, command, or global instruction file.
- Managed files and marker blocks must be idempotent and independently removable.
- Every Git source must be pinned to a full commit SHA.
- Keep the installer dependency-free beyond Node.js 20 and Git.

## Verify

```bash
npm test
npm run verify
node bin/siso-stack.mjs plan
```
