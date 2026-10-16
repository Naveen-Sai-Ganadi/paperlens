"use client";

import { Check, Code2, Copy, ExternalLink, Headphones, Languages, Loader2, Quote, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { Repo } from "@/app/api/papers/code/route";
import type { OpenPaper } from "@/lib/client";

export const LANGUAGES = ["English", "Spanish", "French", "German", "Portuguese", "Italian", "Hindi", "Telugu", "Tamil", "Bengali", "Chinese (Simplified)", "Japanese", "Korean", "Arabic", "Russian", "Turkish", "Vietnamese", "Indonesian"];

function surname(name: string) {
  return name.trim().split(/\s+/).pop() ?? name;
}

function citations(p: OpenPaper) {
  const year = p.published?.slice(0, 4) || String(new Date().getFullYear());
  const authors = p.authors.length ? p.authors : ["Unknown"];
  const key = `${surname(authors[0]).toLowerCase().replace(/[^a-z]/g, "")}${year}${(p.title.match(/[A-Za-z]{4,}/)?.[0] ?? "paper").toLowerCase()}`;
  const arxiv = p.source === "arxiv" ? p.id : null;
  const initials = (n: string) => {
    const parts = n.trim().split(/\s+/);
    const last = parts.pop() ?? n;
    return `${last}, ${parts.map((x) => `${x[0]}.`).join(" ")}`.trim();
  };
  const apaAuthors =
    authors.length > 20
      ? `${authors.slice(0, 19).map(initials).join(", ")}, … ${initials(authors.at(-1)!)}`
      : authors.length > 1
        ? `${authors.slice(0, -1).map(initials).join(", ")}, & ${initials(authors.at(-1)!)}`
        : initials(authors[0]);
  const mlaAuthor = authors.length > 2 ? `${surname(authors[0])}, ${authors[0].split(/\s+/).slice(0, -1).join(" ")}, et al.` : authors.join(" and ");

  return {
    BibTeX: `@article{${key},
  title   = {${p.title}},
  author  = {${authors.join(" and ")}},
  journal = {${arxiv ? `arXiv preprint arXiv:${arxiv}` : "Preprint"}},
  year    = {${year}}${arxiv ? `,\n  url     = {https://arxiv.org/abs/${arxiv}}` : ""}
}`,
    APA: `${apaAuthors} (${year}). ${p.title}.${arxiv ? ` arXiv. https://doi.org/10.48550/arXiv.${arxiv}` : ""}`,
    MLA: `${mlaAuthor} "${p.title}." ${arxiv ? `arXiv, ${year}, arxiv.org/abs/${arxiv}` : year}.`,
  };
}

export function PaperBar({
  paper,
  language,
  onLanguage,
  listening,
  onListen,
}: {
  paper: OpenPaper;
  language: string;
  onLanguage: (l: string) => void;
  listening: boolean;
  onListen: () => void;
}) {
  const [open, setOpen] = useState<"cite" | "code" | null>(null);

  return (
    <div className="shrink-0 border-b border-line bg-card px-4 py-3">
      <h1 className="line-clamp-2 font-serif text-lg leading-snug font-semibold">{paper.title}</h1>
      <p className="mt-0.5 truncate text-xs text-muted">
        {paper.authors.slice(0, 6).join(", ")}
        {paper.authors.length > 6 && ` +${paper.authors.length - 6} more`}
        {paper.published && ` · ${paper.published.slice(0, 10)}`}
        {paper.source === "arxiv" && (
          <>
            {" · "}
            <a href={paper.absUrl} target="_blank" rel="noreferrer" className="font-mono hover:underline">
              arXiv:{paper.id}
            </a>
          </>
        )}
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <BarButton icon={<Quote size={13} />} label="Cite" onClick={() => setOpen("cite")} />
        <BarButton icon={<Code2 size={13} />} label="Code" onClick={() => setOpen("code")} />
        <BarButton icon={<Headphones size={13} />} label={listening ? "Hide audio" : "Listen"} onClick={onListen} active={listening} />
        <label className="ml-auto flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-xs">
          <Languages size={13} className="text-muted" />
          <select value={language} onChange={(e) => onLanguage(e.target.value)} className="bg-transparent outline-none" aria-label="Explanation language">
            {LANGUAGES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      {open === "cite" && <CiteDialog paper={paper} onClose={() => setOpen(null)} />}
      {open === "code" && <CodeDialog paper={paper} onClose={() => setOpen(null)} />}
    </div>
  );
}

function BarButton({ icon, label, onClick, active }: { icon: React.ReactNode; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
        active ? "border-accent bg-accent-soft text-accent" : "border-line hover:bg-sunk"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-sunk" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CiteDialog({ paper, onClose }: { paper: OpenPaper; onClose: () => void }) {
  const formats = citations(paper);
  const [fmt, setFmt] = useState<keyof typeof formats>("BibTeX");
  const [copied, setCopied] = useState(false);
  return (
    <Dialog title="Cite this paper" onClose={onClose}>
      <div className="mb-3 flex gap-1 rounded-lg bg-sunk p-1 text-sm">
        {(Object.keys(formats) as (keyof typeof formats)[]).map((f) => (
          <button
            key={f}
            onClick={() => {
              setFmt(f);
              setCopied(false);
            }}
            className={`flex-1 rounded-md py-1.5 font-medium ${fmt === f ? "bg-card shadow-sm" : "text-muted"}`}
          >
            {f}
          </button>
        ))}
      </div>
      <pre className="overflow-x-auto rounded-lg border border-line bg-paper p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">{formats[fmt]}</pre>
      <button
        onClick={() => {
          void navigator.clipboard.writeText(formats[fmt]);
          setCopied(true);
        }}
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-ink px-3.5 py-2 text-sm font-medium text-paper"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Copied" : `Copy ${fmt}`}
      </button>
      {paper.source === "upload" && <p className="mt-3 text-xs text-muted">Uploaded PDFs have limited metadata; check authors and year before using.</p>}
    </Dialog>
  );
}

function CodeDialog({ paper, onClose }: { paper: OpenPaper; onClose: () => void }) {
  const [data, setData] = useState<{ official: Repo[]; community: Repo[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/papers/code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: paper.source === "arxiv" ? paper.id : undefined, text: paper.text }),
    })
      .then((r) => r.json())
      .then(setData)
      .catch((e) => setError(String(e)));
  }, [paper]);

  return (
    <Dialog title="Code for this paper" onClose={onClose}>
      {!data && !error && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={15} className="animate-spin" /> Looking for code…
        </p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      {data && (
        <div className="space-y-5">
          <RepoList title="Linked in the paper" repos={data.official} empty="The paper doesn't link a GitHub repository." />
          <RepoList
            title="Other repositories that mention it"
            note="Popular repos whose README cites this paper. Some are implementations; others only reference it."
            repos={data.community}
            empty="No popular repositories found."
          />
        </div>
      )}
    </Dialog>
  );
}

function RepoList({ title, note, repos, empty }: { title: string; note?: string; repos: Repo[]; empty: string }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{title}</p>
      {note && <p className="mt-0.5 text-xs text-muted">{note}</p>}
      <div className="mb-2" />
      {repos.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <div className="space-y-2">
          {repos.map((r) => (
            <a key={r.url} href={r.url} target="_blank" rel="noreferrer" className="flex items-start gap-3 rounded-lg border border-line p-3 hover:border-ink">
              <Code2 size={16} className="mt-0.5 shrink-0 text-accent" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-mono text-sm font-medium">{r.name}</span>
                {r.description && <span className="line-clamp-2 block text-xs text-muted">{r.description}</span>}
              </span>
              {r.stars !== null && (
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
                  <Star size={12} /> {r.stars.toLocaleString()}
                </span>
              )}
              <ExternalLink size={13} className="mt-0.5 shrink-0 text-muted" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
