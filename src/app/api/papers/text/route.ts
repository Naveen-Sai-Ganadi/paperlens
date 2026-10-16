import { extractText, getDocumentProxy } from "unpdf";
import { getArxivPaper, parseArxivId } from "@/lib/arxiv";

export const maxDuration = 120;

async function pdfToText(buf: ArrayBuffer) {
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { pages: totalPages, text: text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n") };
}

/** Extracts text from an uploaded PDF (multipart) or an arXiv paper ({ arxivId }). */
export async function POST(req: Request) {
  try {
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return Response.json({ error: "No file uploaded" }, { status: 400 });
      const { text, pages } = await pdfToText(await file.arrayBuffer());
      return Response.json({ text, pages });
    }

    const { arxivId } = (await req.json()) as { arxivId: string };
    const id = parseArxivId(arxivId);
    if (!id) return Response.json({ error: "Invalid arXiv id" }, { status: 400 });
    const [pdfRes, meta] = await Promise.all([fetch(`https://arxiv.org/pdf/${id}`), getArxivPaper(id)]);
    if (!pdfRes.ok) return Response.json({ error: `Could not download PDF (${pdfRes.status})` }, { status: 502 });
    const { text, pages } = await pdfToText(await pdfRes.arrayBuffer());
    return Response.json({ text, pages, paper: meta });
  } catch (err) {
    return Response.json({ error: `Could not read PDF: ${(err as Error).message}` }, { status: 500 });
  }
}
