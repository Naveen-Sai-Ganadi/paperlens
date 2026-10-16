import { errorResponse, generateStructured } from "@/lib/llm";
import { systemPrompt, type Level } from "@/lib/prompts";
import { compareSchema } from "@/lib/schemas";

export const maxDuration = 300;

const PER_PAPER_CHARS = 80_000;

/** Side-by-side comparison of two papers. */
export async function POST(req: Request) {
  try {
    const { a, b, problem, level, language } = (await req.json()) as {
      a: { title: string; text: string };
      b: { title: string; text: string };
      problem: string;
      level: Level;
      language?: string;
    };
    const output = await generateStructured(req, {
      system: systemPrompt(level ?? "intermediate", language),
      schema: compareSchema,
      prompt: `Compare paper A and paper B for a reader. Be specific and fair. Refer to them as "Paper A" and "Paper B". Do not add page citations.
Reader's goal: ${problem || "(not provided)"}

<paper id="A" title="${a.title.replace(/"/g, "'")}">
${a.text.slice(0, PER_PAPER_CHARS)}
</paper>

<paper id="B" title="${b.title.replace(/"/g, "'")}">
${b.text.slice(0, PER_PAPER_CHARS)}
</paper>`,
    });
    return Response.json(output);
  } catch (err) {
    return errorResponse(err);
  }
}
