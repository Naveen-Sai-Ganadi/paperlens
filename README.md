# PaperLens

**Read the paper on the left. Understand it on the right.**

PaperLens is an open-source research-paper reader. Open any arXiv paper or PDF and get clear explanations, diagrams, worked examples and a quiz to check you understood it. It runs on your own Claude or ChatGPT account, including the subscription you already pay for, through the desktop app.

[Website](https://paperlens-one.vercel.app) · [Download](https://paperlens-one.vercel.app/download) · [Report a bug](../../issues/new/choose) · [Contribute](CONTRIBUTING.md)

[![CI](https://github.com/Naveen-Sai-Ganadi/paperlens/actions/workflows/ci.yml/badge.svg)](https://github.com/Naveen-Sai-Ganadi/paperlens/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Features

**Find papers**
- Describe the problem you're solving; PaperLens suggests the best recent papers, with a reason for each.
- Search arXiv, paste an arXiv link, or upload a PDF.
- Swap `arxiv.org` for the PaperLens domain in any arXiv link (`/abs/<id>` or `/pdf/<id>`) to open it here.

**Read with an AI tutor**
- **Overview**: TL;DR, an explain-it-simply version, key concepts with analogies, results and limitations.
- **Article**: a blog-style write-up of the paper.
- **Approach & diagrams**: the method step by step, auto-drawn diagrams, and key equations in plain English.
- **Examples**: worked examples with numbers and a code sketch.
- **Your problem**: how to apply the paper to what you're working on.
- **Quiz**: multiple-choice and open questions, with answers and explanations.
- **Ask**: chat about the paper.
- **Page citations**: every `p3` reference jumps the PDF to that page.
- **Select text in the PDF** to ask about it, simplify it, or translate it.
- **18 languages** for all explanations.
- **Audio overview**: a two-voice conversation about the paper.

**Go further**
- **Related**: similar papers, references and citing papers, with side-by-side comparison of any two.
- **Cite** in BibTeX, APA or MLA, and find the paper's **code**.

## Use your own AI account

| Option | Where | Cost |
| --- | --- | --- |
| **Claude Pro/Max or ChatGPT Plus/Pro subscription** | Desktop app | Included in your subscription |
| **Anthropic or OpenAI API key** | Website or desktop app | Pay per use to the provider |

With a subscription, PaperLens asks the official [Claude Code](https://docs.anthropic.com/en/docs/claude-code) or [Codex](https://github.com/openai/codex) app on your computer to answer, with its tools switched off. You sign in to those apps yourself; PaperLens never sees your login. Anthropic's and OpenAI's terms for those apps apply.

API keys stay on your device and are sent only to your chosen provider.

## Run it yourself

Requirements: Node.js 22+.

```bash
git clone https://github.com/Naveen-Sai-Ganadi/paperlens.git
cd paperlens
npm install
npm run dev            # website at http://localhost:3000
npm run desktop        # or build and open the desktop app
```

No environment variables are required; see [`.env.example`](.env.example) for optional ones.

To use a subscription, install and sign in to one of the official tools once:

```bash
npm install -g @anthropic-ai/claude-code && claude   # Claude Pro / Max
npm install -g @openai/codex && codex login          # ChatGPT Plus / Pro
```

**Self-hosting the website:** it's a standard Next.js app. Deploy it to Vercel, or run `npm run build && npm start` on any Node.js host. A hosted website offers API keys only; subscriptions need the desktop app or a local server.

## How it works

| Piece | Where |
| --- | --- |
| Paper search (arXiv, with OpenAlex fallback) | `src/lib/arxiv.ts`, `src/app/api/papers/*` |
| PDF viewer (pdf.js) and text extraction (unpdf) | `src/components/PdfViewer.tsx`, `src/app/api/papers/text` |
| AI sections, generated in parallel as structured output | `src/app/api/analyze`, `src/lib/prompts.ts`, `src/lib/schemas.ts` |
| Model access: API keys, or Claude Code / Codex for subscriptions | `src/lib/llm.ts`, `src/lib/cli.ts` |
| Related papers and citations (OpenAlex) | `src/app/api/papers/related` |
| Desktop app (Electron), with a token-protected local server | `desktop/` |

Explanations are cached in your browser per paper and language, so reopening a paper is instant.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md). Maintainers publishing desktop builds: see [docs/RELEASING.md](docs/RELEASING.md).

## License

[MIT](LICENSE) © Naveen Sai Ganadi and PaperLens contributors
