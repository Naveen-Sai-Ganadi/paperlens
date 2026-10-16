import { z } from "zod";

// Every field is required (no optionals) so the schemas work with OpenAI strict
// structured outputs as well as Claude.

export const overviewSchema = z.object({
  tldr: z.string().describe("One or two sentence summary a smart non-expert understands."),
  eli5: z.string().describe("Explain the paper like I'm 12, using an everyday analogy. Markdown allowed."),
  problem: z.string().describe("What problem the paper tackles and why it was hard before. Markdown."),
  keyContributions: z.array(z.string()).describe("3-5 concrete contributions, plain language."),
  keyConcepts: z
    .array(
      z.object({
        term: z.string(),
        explanation: z.string().describe("Plain-language definition, 1-3 sentences."),
        analogy: z.string().describe("A short real-world analogy."),
      }),
    )
    .describe("5-8 terms a reader must know to follow the paper."),
  prerequisites: z.array(z.string()).describe("Background topics worth knowing first."),
  results: z.string().describe("Headline results with numbers where the paper gives them. Markdown."),
  limitations: z.array(z.string()).describe("Limitations, open questions, or caveats."),
});

export const approachSchema = z.object({
  intuition: z.string().describe("The core idea in one paragraph, intuition first. Markdown."),
  steps: z
    .array(
      z.object({
        title: z.string(),
        detail: z.string().describe("What happens in this step. Markdown, may include $inline math$."),
        whyItMatters: z.string(),
      }),
    )
    .describe("The method broken into 4-8 ordered steps."),
  diagrams: z
    .array(
      z.object({
        title: z.string(),
        mermaid: z.string().describe("Valid Mermaid source code. No markdown fences."),
        caption: z.string().describe("What the reader should notice in this diagram."),
      }),
    )
    .describe("2-3 diagrams: overall pipeline/architecture, data flow, and a comparison or sequence."),
  equations: z
    .array(
      z.object({
        name: z.string(),
        latex: z.string().describe("LaTeX without surrounding $ delimiters."),
        plainEnglish: z.string().describe("Read the equation aloud in plain words; explain each symbol."),
      }),
    )
    .describe("The most important equations (0-4). Empty if the paper has none."),
  comparison: z
    .array(
      z.object({
        approach: z.string().describe("A prior or alternative approach."),
        difference: z.string().describe("How this paper differs and the trade-off."),
      }),
    )
    .describe("2-4 comparisons with prior work."),
});

export const examplesSchema = z.object({
  workedExamples: z
    .array(
      z.object({
        title: z.string(),
        scenario: z.string().describe("A concrete, small input or situation."),
        walkthrough: z.string().describe("Step-by-step walk through the method on this input, with numbers. Markdown."),
      }),
    )
    .describe("2-3 worked examples that make the method tangible."),
  codeSketch: z.object({
    language: z.string(),
    code: z.string().describe("A short, runnable-looking illustrative implementation (under 60 lines)."),
    explanation: z.string(),
  }),
  applications: z.array(z.string()).describe("3-5 real-world applications."),
  applyToProblem: z.object({
    fit: z.string().describe("How well this paper fits the user's stated problem, honestly. Markdown."),
    howToApply: z.array(z.string()).describe("Concrete steps to apply the paper's ideas to the user's problem."),
    caveats: z.array(z.string()),
    relatedIdeas: z.array(z.string()).describe("Other methods or papers worth looking at for this problem."),
  }),
});

export const articleSchema = z.object({
  headline: z.string().describe("An engaging, accurate headline (not the paper title)."),
  dek: z.string().describe("One-sentence subheading that says why this paper matters."),
  readingMinutes: z.number(),
  sections: z
    .array(
      z.object({
        heading: z.string(),
        body: z.string().describe("Markdown paragraphs with [pN] page citations."),
      }),
    )
    .describe("4-6 sections."),
  takeaways: z.array(z.string()).describe("3-5 key takeaways."),
});

export const podcastSchema = z.object({
  title: z.string(),
  turns: z
    .array(
      z.object({
        speaker: z.enum(["host", "expert"]),
        text: z.string().describe("What this speaker says. Plain spoken language: no markdown, math notation, or citations."),
      }),
    )
    .describe("A 3-5 minute conversation, 16-28 turns. The host asks what a curious listener would; the expert explains with analogies."),
});

export const compareSchema = z.object({
  summary: z.string().describe("Two or three sentences on how the papers relate. Markdown."),
  dimensions: z
    .array(z.object({ dimension: z.string(), a: z.string(), b: z.string() }))
    .describe("5-8 rows: problem, core idea, method, data, results, cost, limitations — whatever matters for these two papers."),
  chooseA: z.string().describe("When to use or read paper A's approach."),
  chooseB: z.string().describe("When to use or read paper B's approach."),
  forYourProblem: z.string().describe("Which fits the reader's problem better and why. Markdown."),
});

export const quizSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        kind: z.enum(["multiple-choice", "open"]),
        options: z.array(z.string()).describe("4 options for multiple-choice; empty array for open questions."),
        correctIndex: z.number().describe("Index of the correct option; -1 for open questions."),
        answer: z.string().describe("The model answer, grounded in the paper."),
        explanation: z.string().describe("Why this is the answer, citing the relevant part of the paper."),
        difficulty: z.enum(["easy", "medium", "hard"]),
      }),
    )
    .describe("8-10 questions: ~6 multiple-choice and ~3 open, mixing recall, understanding, and application."),
});

export const recommendSchema = z.object({
  picks: z.array(
    z.object({
      id: z.string().describe("arXiv id exactly as given in the candidate list."),
      reason: z.string().describe("One or two sentences on why this paper helps with the user's problem."),
      level: z.enum(["beginner", "intermediate", "advanced"]),
    }),
  ),
});

export const SECTIONS = {
  overview: overviewSchema,
  article: articleSchema,
  approach: approachSchema,
  examples: examplesSchema,
  quiz: quizSchema,
  podcast: podcastSchema,
} as const;

export type SectionKey = keyof typeof SECTIONS;
export type Overview = z.infer<typeof overviewSchema>;
export type Approach = z.infer<typeof approachSchema>;
export type Examples = z.infer<typeof examplesSchema>;
export type Quiz = z.infer<typeof quizSchema>;
export type Article = z.infer<typeof articleSchema>;
export type Podcast = z.infer<typeof podcastSchema>;
export type Comparison = z.infer<typeof compareSchema>;
export type Recommendation = z.infer<typeof recommendSchema>["picks"][number];
