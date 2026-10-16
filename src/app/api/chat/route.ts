import type { ModelMessage } from "ai";
import { errorResponse, streamAnswer } from "@/lib/llm";
import { MAX_PAPER_CHARS, systemPrompt, type Level } from "@/lib/prompts";

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { messages, title, text, problem, level } = (await req.json()) as {
      messages: ModelMessage[];
      title: string;
      text: string;
      problem: string;
      level: Level;
    };

    return streamAnswer(req, {
      system: `${systemPrompt(level ?? "intermediate")}
You are answering follow-up questions about the paper below. Answer concisely, cite sections of the paper when helpful, and use small examples. If you include a diagram, put Mermaid source in a \`\`\`mermaid code block (quote all node labels).
Reader's goal: ${problem || "(not provided)"}

<paper title="${title.replace(/"/g, "'")}">
${text.slice(0, MAX_PAPER_CHARS)}
</paper>`,
      messages,
    });
  } catch (err) {
    return errorResponse(err);
  }
}
