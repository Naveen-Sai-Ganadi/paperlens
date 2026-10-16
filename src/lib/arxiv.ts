export type Paper = {
  id: string; // arXiv id without version, e.g. 2310.06825
  title: string;
  authors: string[];
  summary: string;
  published: string;
  categories: string[];
  pdfUrl: string;
  absUrl: string;
};

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  return m ? decode(m[1]) : "";
}

// arXiv asks API clients to wait ~3s between calls and answers bursts with 429,
// so all calls go through one queue, retry on 429, and are cached briefly.
const GAP_MS = 3_100;
const cache = new Map<string, { at: number; body: string }>();
let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;

function arxivFetch(url: string): Promise<string> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < 15 * 60_000) return Promise.resolve(hit.body);

  const job = queue.then(async () => {
    for (let attempt = 0; ; attempt++) {
      const wait = lastCall + GAP_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastCall = Date.now();
      const res = await fetch(url, {
        headers: { "User-Agent": "PaperLens/0.1 (research reading assistant)" },
        signal: AbortSignal.timeout(12_000),
      });
      if (res.status === 429 && attempt < 1) {
        lastCall += GAP_MS * (attempt + 1); // back off a little more each time
        continue;
      }
      if (!res.ok) throw new Error(`arXiv is busy right now (${res.status}). Try again in a few seconds.`);
      const body = await res.text();
      cache.set(url, { at: Date.now(), body });
      return body;
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

export function parseArxivId(input: string): string | null {
  const m = input.match(/(\d{4}\.\d{4,5})(v\d+)?/) ?? input.match(/([a-z\-]+(?:\.[A-Z]{2})?\/\d{7})(v\d+)?/);
  return m ? m[1] : null;
}

const STOPWORDS = new Set(
  "the and for with that this from have want need into about what when which while would could should their there they them our your you are was were will can not but how why who its his her has had been being does did doing want wants make makes using use used get gets".split(" "),
);

function keywords(query: string) {
  let words = query.toLowerCase().replace(/[^a-z0-9\-\s]/g, " ").split(/\s+/).filter(Boolean);
  const long = words.length > 5;
  if (long) words = words.filter((w) => w.length > 2 && !STOPWORDS.has(w)).slice(0, 10);
  return { words, long };
}

/** Searches arXiv, falling back to OpenAlex (arXiv-hosted works only) when the arXiv API is slow or throttled. */
export async function searchArxiv(
  query: string,
  { max = 20, sort = "relevance" }: { max?: number; sort?: "relevance" | "submittedDate" } = {},
): Promise<Paper[]> {
  const { words, long } = keywords(query);
  if (words.length === 0) return [];
  // Long free text ("my chatbot gives wrong answers…") matches nothing with AND; use OR on the meaningful words.
  const terms = words.map((t) => `all:${encodeURIComponent(t)}`).join(long ? "+OR+" : "+AND+");
  const url = `https://export.arxiv.org/api/query?search_query=${terms}&start=0&max_results=${max}&sortBy=${sort}&sortOrder=descending`;
  if (Date.now() > arxivDownUntil) {
    try {
      return parseFeed(await arxivFetch(url));
    } catch {
      arxivDownUntil = Date.now() + 5 * 60_000; // don't make every search wait on a struggling API
    }
  }
  return searchOpenAlex(words.join(long ? " OR " : " "), { max, latest: sort === "submittedDate" });
}

let arxivDownUntil = 0;
const OPENALEX_ARXIV_SOURCE = "S4306400194";

async function searchOpenAlex(query: string, { max, latest }: { max: number; latest: boolean }): Promise<Paper[]> {
  const filters = [`title_and_abstract.search:${query.replace(/[,:|]/g, " ")}`, `locations.source.id:${OPENALEX_ARXIV_SOURCE}`];
  if (latest) {
    const since = new Date(Date.now() - 548 * 86_400_000).toISOString().slice(0, 10); // ~18 months
    filters.push(`from_publication_date:${since}`);
  }
  const url = `https://api.openalex.org/works?filter=${encodeURIComponent(filters.join(","))}&sort=relevance_score:desc&per_page=${max}&select=title,publication_date,locations,authorships,abstract_inverted_index,topics`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`Paper search is unavailable right now (${res.status}). Try again shortly.`);
  const data = (await res.json()) as { results: OpenAlexWork[] };
  const papers = data.results.flatMap((w): Paper[] => {
    const arxivUrl = w.locations.map((l) => l.landing_page_url ?? "").find((u) => u.includes("arxiv.org"));
    const id = arxivUrl ? parseArxivId(arxivUrl) : null;
    if (!id || !w.title) return [];
    return [
      {
        id,
        title: w.title,
        authors: w.authorships.map((a) => a.author.display_name),
        summary: abstractFromIndex(w.abstract_inverted_index),
        published: w.publication_date,
        categories: (w.topics ?? []).slice(0, 2).map((t) => t.display_name),
        pdfUrl: `https://arxiv.org/pdf/${id}`,
        absUrl: `https://arxiv.org/abs/${id}`,
      },
    ];
  });
  return latest ? papers.sort((a, b) => b.published.localeCompare(a.published)) : papers;
}

type OpenAlexWork = {
  title: string | null;
  publication_date: string;
  locations: { landing_page_url: string | null }[];
  authorships: { author: { display_name: string } }[];
  abstract_inverted_index: Record<string, number[]> | null;
  topics?: { display_name: string }[];
};

function abstractFromIndex(index: Record<string, number[]> | null) {
  if (!index) return "";
  const words: string[] = [];
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word;
  return words.join(" ");
}

export async function getArxivPaper(id: string): Promise<Paper | null> {
  const xml = await arxivFetch(`https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`).catch(() => null);
  const fromApi = xml ? parseFeed(xml)[0] : undefined;
  return fromApi ?? getFromAbsPage(id);
}

/** The arxiv.org abstract page carries citation_* meta tags and stays up when the API is throttled. */
async function getFromAbsPage(id: string): Promise<Paper | null> {
  const res = await fetch(`https://arxiv.org/abs/${id}`, { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!res?.ok) return null;
  const html = await res.text();
  const meta = (name: string) => [...html.matchAll(new RegExp(`<meta name="${name}" content="([^"]*)"`, "g"))].map((m) => decode(m[1]));
  const title = meta("citation_title")[0];
  if (!title) return null;
  return {
    id,
    title,
    authors: meta("citation_author").map((a) => a.split(", ").reverse().join(" ")),
    summary: meta("citation_abstract")[0] ?? "",
    published: (meta("citation_date")[0] ?? "").replace(/\//g, "-"),
    categories: [],
    pdfUrl: `https://arxiv.org/pdf/${id}`,
    absUrl: `https://arxiv.org/abs/${id}`,
  };
}

function parseFeed(xml: string): Paper[] {
  const entries = xml.split("<entry>").slice(1).map((e) => e.split("</entry>")[0]);
  return entries
    .map((e) => {
      const rawId = tag(e, "id");
      const id = parseArxivId(rawId) ?? rawId;
      const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => decode(m[1]));
      const categories = [...e.matchAll(/<category[^>]*term="([^"]+)"/g)].map((m) => m[1]);
      return {
        id,
        title: tag(e, "title"),
        authors,
        summary: tag(e, "summary"),
        published: tag(e, "published"),
        categories,
        pdfUrl: `https://arxiv.org/pdf/${id}`,
        absUrl: `https://arxiv.org/abs/${id}`,
      };
    })
    .filter((p) => p.title && p.title !== "Error");
}
