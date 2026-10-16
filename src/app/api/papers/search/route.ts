import { getArxivPaper, parseArxivId, searchArxiv } from "@/lib/arxiv";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const sort = searchParams.get("sort") === "latest" ? "submittedDate" : "relevance";
  if (!q) return Response.json({ papers: [] });

  try {
    // A pasted arXiv link or id jumps straight to that paper.
    const id = /arxiv\.org|^\d{4}\.\d{4,5}/.test(q) ? parseArxivId(q) : null;
    if (id) {
      const paper = await getArxivPaper(id);
      return Response.json({ papers: paper ? [paper] : [] });
    }
    return Response.json({ papers: await searchArxiv(q, { max: 20, sort }) });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 502 });
  }
}
