import type { SectionKey } from "./schemas";

export const MAX_PAPER_CHARS = 160_000;

export type Level = "beginner" | "intermediate" | "expert";

const LEVEL_GUIDE: Record<Level, string> = {
  beginner: "The reader is new to the field. Avoid jargon; define every term; lean on analogies.",
  intermediate: "The reader knows the basics of the field. Define specialised terms briefly.",
  expert: "The reader is a practitioner. Be precise and technical, but still clear.",
};

export function systemPrompt(level: Level) {
  return `You are PaperLens, a patient research tutor who turns dense academic papers into clear, accurate explanations.
Rules:
- Stay faithful to the paper. Never invent results, numbers, or claims. If the paper does not say, say so.
- Prefer concrete examples and analogies over abstractions.
- Markdown is allowed in long-form fields. Use $...$ for inline math and $$...$$ for display math.
- ${LEVEL_GUIDE[level]}`;
}

const MERMAID_RULES = `Mermaid rules (diagrams are rendered by Mermaid v11 and must parse):
- The diagram panel is narrow: prefer "flowchart TD"; only use "flowchart LR" for 5 nodes or fewer. Use it for pipelines, "sequenceDiagram" for interactions. Avoid exotic diagram types.
- Node ids are simple alphanumerics (A, B1, enc). Put every label in double quotes: A["Token embeddings"].
- Never use parentheses, brackets, or quotes inside labels unquoted. No HTML, no markdown, no LaTeX in labels.
- Use subgraph blocks to group components. Keep each diagram under 15 nodes.`;

const TASKS: Record<SectionKey, string> = {
  overview:
    "Produce the overview: TL;DR, an ELI5 explanation, the problem, key contributions, key concepts with analogies, prerequisites, headline results, and limitations.",
  approach: `Explain the method/approach step by step, intuition first. Include 2-3 diagrams that genuinely clarify the architecture, pipeline, or data flow, the key equations explained in plain English, and how it compares with prior approaches.\n${MERMAID_RULES}`,
  examples:
    "Make the paper tangible: worked examples with small concrete numbers, a short illustrative code sketch, real-world applications, and an honest assessment of how the paper applies to the reader's problem.",
  quiz: "Write a comprehension quiz so the reader can check whether they really understood the paper. Mix recall, conceptual understanding, and application questions. Every answer must be grounded in the paper.",
};

export function sectionPrompt({
  section,
  title,
  text,
  problem,
}: {
  section: SectionKey;
  title: string;
  text: string;
  problem: string;
}) {
  return `${TASKS[section]}

Reader's goal / problem they want to solve: ${problem?.trim() || "(not provided — keep it general)"}

<paper title="${title.replace(/"/g, "'")}">
${text.slice(0, MAX_PAPER_CHARS)}
</paper>`;
}
