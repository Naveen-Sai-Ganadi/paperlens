import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, streamText, type LanguageModel, type ModelMessage } from "ai";
import { z } from "zod";
import { assertLocalCaller, cliGenerate, cliStream, LOCAL_MODE, type CliKind } from "./cli";
import { PROVIDERS, type Provider } from "./providers";

export class MissingKeyError extends Error {
  constructor(message = "No model connected. Connect your Claude or ChatGPT account first.") {
    super(message);
  }
}

type Backend = { kind: "api"; model: LanguageModel } | { kind: "cli"; cli: CliKind; model?: string };

/**
 * Resolves who runs the request from per-request headers: an API key the user
 * pasted, or (local app only) their signed-in Claude Code / Codex subscription.
 * Nothing is stored on the server.
 */
function backendFromRequest(req: Request): Backend {
  const provider = req.headers.get("x-llm-provider") as Provider | null;
  const model = req.headers.get("x-llm-model") || undefined;
  if (!provider || !PROVIDERS[provider]) throw new MissingKeyError();

  if (PROVIDERS[provider].kind === "subscription") {
    if (!LOCAL_MODE) throw new MissingKeyError("Subscription sign-in only works in the PaperLens desktop app.");
    assertLocalCaller(req);
    return { kind: "cli", cli: provider as CliKind, model };
  }

  const apiKey = req.headers.get("x-llm-key");
  if (!apiKey) throw new MissingKeyError();
  const modelId = model || PROVIDERS[provider].models[0].id;
  return {
    kind: "api",
    model: provider === "anthropic" ? createAnthropic({ apiKey })(modelId) : createOpenAI({ apiKey })(modelId),
  };
}

export async function generateStructured<T extends z.ZodType>(
  req: Request,
  { system = "", prompt, schema, maxOutputTokens }: { system?: string; prompt: string; schema: T; maxOutputTokens?: number },
): Promise<z.infer<T>> {
  const b = backendFromRequest(req);
  if (b.kind === "cli") {
    // The CLIs' validators don't accept Zod's draft 2020-12 "$schema" marker.
    const json: Record<string, unknown> = z.toJSONSchema(schema, { target: "draft-7" });
    delete json.$schema;
    const raw = await cliGenerate(b.cli, { model: b.model, system, prompt, schema: json });
    return schema.parse(raw);
  }
  const { output } = await generateText({
    model: b.model,
    system: system || undefined,
    prompt,
    output: Output.object({ schema: schema as unknown as z.ZodObject }),
    maxOutputTokens,
  });
  return output as z.infer<T>;
}

/** Streams a plain-text answer for chat. */
export function streamAnswer(req: Request, { system, messages }: { system: string; messages: ModelMessage[] }): Response {
  const b = backendFromRequest(req);
  if (b.kind === "cli") {
    // The CLIs take one prompt, so the conversation is passed as a transcript.
    const transcript = messages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${typeof m.content === "string" ? m.content : ""}`)
      .join("\n\n");
    const prompt = `Conversation so far:\n\n${transcript}\n\nReply to the user's last message as the assistant.`;
    return new Response(cliStream(b.cli, { model: b.model, system, prompt }), {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return streamText({ model: b.model, system, messages }).toTextStreamResponse();
}

export function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  const status = err instanceof MissingKeyError ? 401 : /api key|auth|401|invalid x-api-key|signed in/i.test(message) ? 401 : 500;
  return Response.json({ error: message }, { status });
}
