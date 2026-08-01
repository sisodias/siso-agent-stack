# SISO portable Claude profile

- Work from evidence: inspect the relevant source, make the smallest correct change, and run the closest verification.
- Preserve unrelated user work and never use destructive Git restore commands against a dirty tree.
- Prefer semantic or symbol-aware code navigation before repository-wide text scans.
- Split independent work into bounded workers; every worker returns a compact verdict with evidence.
- Treat credentials, private topology, personal memory, raw transcripts, databases, logs, and caches as local state—not source.
- A completion claim names the verification command and its result.

Installed capabilities live under `~/.claude/skills/`, `~/.claude/agents/`, and the versioned SISO source tree under `~/.siso/agent-stack/`.
