# Security Policy

## Reporting a vulnerability

Please **don't open a public issue** for security problems. Report them privately with GitHub's [private vulnerability reporting](../../security/advisories/new). You'll get a response within a week.

Areas that matter most:

- **API keys** entered in the app must never leave the user's device except in requests to their chosen provider.
- **The desktop app's local server** must only accept requests from its own window (see the per-launch token in `desktop/main.cjs` and `src/lib/cli.ts`).
- **Subscription access** must never let a web page or another program run the user's Claude Code / Codex CLI.

## Supported versions

Security fixes go into the latest release.
