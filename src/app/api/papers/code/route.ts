import { parseArxivId } from "@/lib/arxiv";

export type Repo = { name: string; url: string; stars: number | null; description: string; official: boolean };

const LIST_LIKE = /awesome|paper.?list|reading.?list|papers|survey|curated|collection|resources/i;

async function github(path: string) {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "PaperLens" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/${path}`, { headers, signal: AbortSignal.timeout(10_000) });
  return res.ok ? res.json() : null;
}

/**
 * Code for a paper: repositories linked in the paper itself ("official"), then
 * popular GitHub repos whose README mentions the arXiv id (minus paper lists).
 */
export async function POST(req: Request) {
  const { id, text } = (await req.json()) as { id?: string; text?: string };
  const arxivId = id ? parseArxivId(id) : null;

  // PDF line breaks often split URLs ("https://github.com/\ntensorflow/tensor2tensor").
  const linked = [
    ...new Set(
      ((text ?? "").match(/github\.com\/\s*[\w.-]+\/\s*[\w.-]+/gi) ?? []).map((u) =>
        u.replace(/\s+/g, "").replace(/\.+$/, "").replace(/\.git$/i, ""),
      ),
    ),
  ].slice(0, 5);

  const official: Repo[] = await Promise.all(
    linked.map(async (u) => {
      const name = u.replace(/^github\.com\//i, "");
      const meta = await github(`repos/${name}`);
      return { name, url: `https://${u}`, stars: meta?.stargazers_count ?? null, description: meta?.description ?? "", official: true };
    }),
  );

  let community: Repo[] = [];
  if (arxivId) {
    const data = await github(`search/repositories?q=${encodeURIComponent(`"${arxivId}" in:readme`)}&sort=stars&per_page=15`);
    const officialNames = new Set(official.map((r) => r.name.toLowerCase()));
    community = ((data?.items ?? []) as { full_name: string; html_url: string; stargazers_count: number; description: string | null }[])
      .filter((r) => !officialNames.has(r.full_name.toLowerCase()) && !LIST_LIKE.test(`${r.full_name} ${r.description ?? ""}`))
      .slice(0, 6)
      .map((r) => ({ name: r.full_name, url: r.html_url, stars: r.stargazers_count, description: r.description ?? "", official: false }));
  }

  return Response.json({ official, community }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
