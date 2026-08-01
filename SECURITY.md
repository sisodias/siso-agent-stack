# Security policy

SISO Agent Stack is a public source distribution. It contains exact public repository pins and portable templates, not secrets or live operator state.

Never commit credentials, provider tokens, private network topology, raw transcripts, prompt or response bodies, personal memory, client repositories, runtime databases, logs, caches, or generated checkpoints. The verifier scans every publishable file for common private-state indicators.

The installer preserves unrelated files and stops on unmanaged link or command collisions. Validate changes with an isolated `--home` and `--root` before using a real profile.

Report suspected vulnerabilities through GitHub's private vulnerability-reporting flow when enabled. Do not attach real credentials or private session data to public issues.
