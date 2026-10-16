# Contributing to PaperLens

Thanks for helping make research easier to understand. Bug reports, ideas, docs and code are all welcome.

## Ways to help

- **Report a bug** or **suggest a feature** with the [issue templates](../../issues/new/choose).
- **Improve explanations.** Most of PaperLens's quality lives in the prompts (`src/lib/prompts.ts`) and output schemas (`src/lib/schemas.ts`). If a paper gets a confusing or wrong explanation, an issue with the arXiv ID and what went wrong is very useful.
- **Pick up an issue** labelled `good first issue` or `help wanted`.

## Development setup

Requirements: Node.js 22 or newer.

```bash
git clone https://github.com/Naveen-Sai-Ganadi/paperlens.git
cd paperlens
npm install
npm run dev        # http://localhost:3000
```

No environment variables are needed. To generate explanations, connect a model in the app: an Anthropic or OpenAI API key, or (in local dev) your signed-in Claude Code / Codex CLI.

Desktop app: `npm run desktop` builds and opens it.

## Before opening a pull request

```bash
npx tsc --noEmit   # types
npm run lint       # ESLint
npm run build      # production build
```

- Keep pull requests focused: one feature or fix each.
- Match the surrounding code style. Comments explain *why*, not *what*.
- For UI changes, include a screenshot.
- If you change prompts or schemas, mention which papers you tried and how the output changed.

## Project layout

| Path | What's there |
| --- | --- |
| `src/app/api/*` | Server routes: paper search, PDF text, AI sections, chat, compare, related papers, code lookup |
| `src/lib/llm.ts`, `src/lib/cli.ts` | Model access: API keys, or the user's Claude Code / Codex subscription |
| `src/lib/prompts.ts`, `src/lib/schemas.ts` | What the AI is asked for, and the shape of its answers |
| `src/components/*` | UI |
| `desktop/` | Electron shell for the desktop app |

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
