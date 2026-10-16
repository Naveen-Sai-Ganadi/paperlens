import { errorResponse, generateStructured } from "@/lib/llm";
import { SECTIONS, type SectionKey } from "@/lib/schemas";
import { sectionPrompt, systemPrompt, type Level } from "@/lib/prompts";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { section, title, text, problem, level } = (await req.json()) as {
      section: SectionKey;
      title: string;
      text: string;
      problem: string;
      level: Level;
    };
    const schema = SECTIONS[section];
    if (!schema) return Response.json({ error: `Unknown section ${section}` }, { status: 400 });
    if (!text) return Response.json({ error: "Paper text is empty" }, { status: 400 });

    const output = await generateStructured(req, {
      system: systemPrompt(level ?? "intermediate"),
      prompt: sectionPrompt({ section, title, text, problem }),
      schema,
      maxOutputTokens: 12_000,
    });
    return Response.json(output);
  } catch (err) {
    return errorResponse(err);
  }
}
