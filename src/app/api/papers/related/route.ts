import { parseArxivId } from "@/lib/arxiv";

export type RelatedPaper = {
  title: string;
  year: number | null;
  authors: string[];
  citations: number;
  url: string;
};

type Work = {
  id: string;
  title: string | null;
  publication_year: number | null;
  cited_by_count: number;
  doi: string | null;
  authorships: { author: { display_name: string } }[];
  locations: { landing_page_url: string | null }[];
  related_works?: string[];
  referenced_works?: string[];
};

const SELECT = "id,title,publication_year,cited_by_count,doi,authorships,locations";

function toPaper(w: Work): RelatedPaper | null {
  if (!w.title) return null;
  // OpenAlex's arXiv locations are sometimes attached to the wrong work, so we
  // don't trust them; the client resolves papers on arXiv by title when opened.
  return {
    title: w.title,
    year: w.publication_year,
    authors: w.authorships.slice(0, 4).map((a) => a.author.display_name),
    citations: w.cited_by_count,
    url: w.doi ?? w.locations.find((l) => l.landing_page_url)?.landing_page_url ?? w.id,
  };
}

async function openalex(path: string) {
  const res = await fetch(`https://api.openalex.org/${path}`, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OpenAlex ${res.status}`);
  return res.json();
}

async function worksByIds(ids: string[]): Promise<RelatedPaper[]> {
  if (ids.length === 0) return [];
  const short = ids.slice(0, 40).map((u) => u.split("/").pop()).join("|");
  const data = await openalex(`works?filter=openalex:${short}&per_page=40&select=${SELECT}`);
  return (data.results as Work[]).map(toPaper).filter((p): p is RelatedPaper => p !== null);
}

/** Similar papers, references and citing papers for an arXiv paper, via OpenAlex. */
export async function GET(req: Request) {
  const id = parseArxivId(new URL(req.url).searchParams.get("id") ?? "");
  if (!id) return Response.json({ error: "Invalid arXiv id" }, { status: 400 });

  try {
    const work = (await openalex(`works/doi:10.48550/arxiv.${id}?select=${SELECT},related_works,referenced_works`)) as Work;
    const [similar, references, citedBy] = await Promise.all([
      worksByIds(work.related_works ?? []),
      worksByIds(work.referenced_works ?? []),
      openalex(`works?filter=cites:${work.id.split("/").pop()}&sort=cited_by_count:desc&per_page=20&select=${SELECT}`).then((d) =>
        (d.results as Work[]).map(toPaper).filter((p): p is RelatedPaper => p !== null),
      ),
    ]);
    const byCitations = (a: RelatedPaper, b: RelatedPaper) => b.citations - a.citations;
    return Response.json(
      {
        citations: work.cited_by_count,
        similar: similar.sort(byCitations),
        references: references.sort(byCitations),
        citedBy,
      },
      { headers: { "Cache-Control": "public, s-maxage=86400" } },
    );
  } catch (err) {
    const notFound = /404/.test((err as Error).message);
    return Response.json(
      notFound ? { citations: 0, similar: [], references: [], citedBy: [] } : { error: (err as Error).message },
      { status: notFound ? 200 : 502 },
    );
  }
}
