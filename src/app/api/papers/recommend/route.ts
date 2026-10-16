import { searchArxiv, type Paper } from "@/lib/arxiv";
import { errorResponse, generateStructured } from "@/lib/llm";
import { z } from "zod";
import { recommendSchema } from "@/lib/schemas";

const queryPlanSchema = z.object({ focused: z.string(), broad: z.string() });

export const maxDuration = 120;

/**
 * Pulls the newest and the most relevant arXiv papers for a topic, then asks
 * the user's model to pick the ones that best fit the problem they described.
 */
export async function POST(req: Request) {
  try {
    const { topic, problem } = (await req.json()) as { topic: string; problem: string };
    const query = topic?.trim() || problem?.trim();
    if (!query) return Response.json({ error: "Give a topic or a problem" }, { status: 400 });

    // Turn a free-form problem into short keyword queries arXiv can match.
    const plan = await generateStructured(req, {
      schema: queryPlanSchema,
      prompt: `Write two short arXiv keyword searches (2-4 words each, no boolean operators) to find research papers for this learner.
Topic: ${topic || "(not given)"}
Problem: ${problem || "(not given)"}
"focused" should target the specific technique that solves the problem; "broad" should name the wider research area.`,
    });

    // Sequential on purpose: arXiv rate-limits parallel requests.
    const latest = await searchArxiv(plan.focused || query, { max: 25, sort: "submittedDate" });
    const relevant = await searchArxiv(plan.broad || query, { max: 15, sort: "relevance" });
    const byId = new Map<string, Paper>();
    for (const p of [...latest, ...relevant]) byId.set(p.id, p);
    const candidates = [...byId.values()];
    if (candidates.length === 0) return Response.json({ recommendations: [] });

    const list = candidates
      .map((p) => `[${p.id}] (${p.published.slice(0, 10)}) ${p.title}\n${p.summary.slice(0, 600)}`)
      .join("\n\n");

    const output = await generateStructured(req, {
      schema: recommendSchema,
      prompt: `A learner wants to read research papers.
Topic: ${topic || "(not given)"}
Problem they want to solve: ${problem || "(not given)"}

From the candidate arXiv papers below, choose the 6 best to read, favouring papers that are recent AND directly useful for the problem. Include at most one survey if a good one exists. Order from most to least recommended.

${list}`,
    });

    const recommendations = output.picks
      .filter((r) => byId.has(r.id))
      .map((r) => ({ ...r, paper: byId.get(r.id)! }));
    return Response.json({ recommendations });
  } catch (err) {
    return errorResponse(err);
  }
}
