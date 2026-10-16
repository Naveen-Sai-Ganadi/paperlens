# PaperLens

Read a research paper on the left, understand it on the right.

- **Discover**: describe the problem you want to solve (plus an optional topic). PaperLens searches recent arXiv papers and your model picks the 6 most useful ones, with a reason for each.
- **Open any paper**: search, paste an arXiv link, or upload a PDF.
- **Split view**: the PDF (or its extracted text) on the left. On the right, tabs for Overview (TL;DR, ELI5, key concepts), Approach & diagrams (steps, Mermaid diagrams, equations in plain English), Examples (worked examples, a code sketch), Your problem (how to apply the paper), Quiz (multiple-choice and open questions with answers), and Ask (chat about the paper).
- **Use your own account**, two ways:
  - **Your Claude or ChatGPT subscription** (desktop app only). PaperLens asks the official Claude Code or Codex app on your computer to answer, with its tools switched off. You sign in to those apps yourself; PaperLens never sees your login.
  - **An API key** from Anthropic or OpenAI (desktop or web). The key stays on your device and is sent with each request straight to the provider.

## Desktop app (macOS)

```bash
npm install
npm run desktop        # build and open the app
npm run desktop:dist:unsigned   # local test installer: dist-desktop/PaperLens-mac-arm64.dmg
```

To use a subscription, install and sign in to the official tools once:

```bash
npm install -g @anthropic-ai/claude-code && claude      # Claude Pro / Max
npm install -g @openai/codex && codex login             # ChatGPT Plus / Pro
```

With a ChatGPT login, Codex accepts only some models (`gpt-5.6-sol` works; `gpt-5.5` and `gpt-5.6` are rejected).

The app runs its server on `127.0.0.1` with a per-launch token that only its own window sends, so other programs and websites can't use your subscription through it. Local test builds are unsigned, so macOS asks for confirmation the first time you open them. Public releases are signed (see below).

## Releasing

Public installers are built, signed and uploaded by GitHub Actions (`.github/workflows/release.yml`) for macOS (Apple Silicon and Intel), Windows and Linux. The workflow refuses to build Mac or Windows installers without signing credentials.

1. Add these repository secrets (GitHub → Settings → Secrets and variables → Actions):

   | Secret | What it is |
   | --- | --- |
   | `MAC_CSC_LINK` | Your **Developer ID Application** certificate exported as `.p12`, base64-encoded (`base64 -i cert.p12 \| pbcopy`) |
   | `MAC_CSC_KEY_PASSWORD` | The password you set when exporting the `.p12` |
   | `APPLE_ID` | Your Apple Developer account email |
   | `APPLE_APP_SPECIFIC_PASSWORD` | An app-specific password from account.apple.com, used for notarization |
   | `APPLE_TEAM_ID` | Your 10-character team ID (developer.apple.com → Membership) |
   | `WIN_CSC_LINK` | Windows code-signing certificate (`.pfx`), base64-encoded |
   | `WIN_CSC_KEY_PASSWORD` | Its password |

2. Bump `version` in `package.json`, then tag and push:

   ```bash
   git tag v0.1.0 && git push origin v0.1.0
   ```

3. When the workflow finishes, open the draft release on GitHub, check it, and click **Publish**. The website's download page (`/download`) links to `releases/latest`, so it picks up the new version automatically.

## Web / local development

```bash
npm run dev   # http://localhost:3000
```

In `npm run dev` the subscription option also works, since the server is on your machine. A hosted deployment only offers API keys. No server-side environment variables are needed.

## How it works

| Piece | Where |
| --- | --- |
| Paper search (arXiv API, OpenAlex fallback when arXiv is throttled) | `src/lib/arxiv.ts`, `src/app/api/papers/search` |
| Recommendations (LLM writes the queries, then ranks the candidates) | `src/app/api/papers/recommend` |
| PDF → text (`unpdf`) and same-origin PDF proxy | `src/app/api/papers/text`, `src/app/api/pdf` |
| Subscription access through the Claude Code / Codex CLIs | `src/lib/cli.ts` |
| Desktop shell (Electron) | `desktop/main.cjs` |
| Explanation agents (4 sections generated in parallel as structured output) | `src/app/api/analyze`, `src/lib/schemas.ts`, `src/lib/prompts.ts` |
| Follow-up chat (streaming) | `src/app/api/chat` |
| UI | `src/components/*` |

Generated explanations are cached per paper in localStorage, so reopening a paper is instant.
