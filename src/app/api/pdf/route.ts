import { parseArxivId } from "@/lib/arxiv";

// Same-origin proxy so arXiv PDFs can be embedded in the left-hand viewer.
export async function GET(req: Request) {
  const id = parseArxivId(new URL(req.url).searchParams.get("id") ?? "");
  if (!id) return new Response("Invalid id", { status: 400 });
  const res = await fetch(`https://arxiv.org/pdf/${id}`);
  if (!res.ok || !res.body) return new Response("PDF not found", { status: res.status || 502 });
  return new Response(res.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${id}.pdf"`,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
