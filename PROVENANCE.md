# Provenance

SISO Agent Stack is an umbrella distribution assembled from independently versioned public repositories. `stack.manifest.json` is the sole component authority and pins every component to a full commit SHA.

The distribution does not duplicate live Claude or Codex homes. It generates marker-managed profiles, installs reviewed skills and agent definitions, delegates lifecycle setup to SISO Agent Hooks, and records an installation receipt that `doctor` checks against the release manifest.

Component repository heads and licenses were observed on 2026-08-01. The release is verified through manifest tests, a repository-wide privacy scan, a clean temporary-home installation, component pin checks, and host-specific doctor checks.
