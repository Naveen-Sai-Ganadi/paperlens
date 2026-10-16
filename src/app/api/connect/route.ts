import { z } from "zod";
import { errorResponse, generateStructured } from "@/lib/llm";

// Verifies the chosen account works with a tiny request.
export async function POST(req: Request) {
  try {
    await generateStructured(req, { prompt: "Reply with ok=true.", schema: z.object({ ok: z.boolean() }), maxOutputTokens: 32 });
    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
