"use client";

import { ArrowRight, ExternalLink, GitCompare, Loader2, Quote, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { RelatedPaper } from "@/app/api/papers/related/route";
import { findArxivByTitle, loadArxivPaper, postJSON, type Connection, type OpenPaper, type Profile } from "@/lib/client";
import type { Comparison } from "@/lib/schemas";
import { Markdown } from "./Markdown";
import { Button, Skeleton } from "./ui";

type Related = { citations: number; similar: RelatedPaper[]; references: RelatedPaper[]; citedBy: RelatedPaper[] };
type Group = "similar" | "references" | "citedBy";

const GROUPS: { key: Group; label: string; blurb: string }[] = [
  { key: "similar", label: "Similar", blurb: "Papers on closely related topics." },
  { key: "references", label: "References", blurb: "Work this paper builds on, most cited first." },
  { key: "citedBy", label: "Cited by", blurb: "The most influential papers that cite this one." },
];

export function RelatedView({
  paper,
  connection,
  profile,
  onOpen,
  requireConnect,
}: {
  paper: OpenPaper;
  connection: Connection | null;
  profile: Profile;
  onOpen: (p: OpenPaper) => void;
  requireConnect: () => void;
}) {
  const [data, setData] = useState<Related | null>(null);
  const [error, setError] = useState("");
  const [group, setGroup] = useState<Group>("similar");
  const [busy, setBusy] = useState<{ title: string; action: "open" | "compare" } | null>(null);
  const [notice, setNotice] = useState("");
  const [comparison, setComparison] = useState<{ other: OpenPaper; result: Comparison } | null>(null);

  useEffect(() => {
    if (paper.source !== "arxiv") return;
    fetch(`/api/papers/related?id=${paper.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error);
        setData(d);
      })
      .catch((e) => setError((e as Error).message));
  }, [paper]);

  const resolve = async (p: RelatedPaper, action: "open" | "compare") => {
    setBusy({ title: p.title, action });
    setNotice("");
    try {
      const meta = await findArxivByTitle(p.title);
      if (!meta) {
        setNotice(`“${p.title}” isn't on arXiv, so it can't be opened here. Use the source link instead.`);
        return null;
      }
      return await loadArxivPaper(meta.id, meta);
    } catch (e) {
      setNotice((e as Error).message);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const open = async (p: RelatedPaper) => {
    const loaded = await resolve(p, "open");
    if (loaded) onOpen(loaded);
  };

  const compare = async (p: RelatedPaper) => {
    if (!connection) return requireConnect();
    const other = await resolve(p, "compare");
    if (!other) return;
    setBusy({ title: p.title, action: "compare" });
    try {
      const result = await postJSON<Comparison>(
        "/api/compare",
        {
          a: { title: paper.title, text: paper.text },
          b: { title: other.title, text: other.text },
          problem: profile.problem,
          level: profile.level,
          language: profile.language,
        },
        connection,
      );
      setComparison({ other, result });
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  if (paper.source !== "arxiv") {
    return <p className="rounded-xl border border-line bg-card p-5 text-sm text-muted">Related papers are available for arXiv papers. Uploaded PDFs don&apos;t have citation data.</p>;
  }
  if (comparison) {
    return <ComparisonView a={paper} b={comparison.other} result={comparison.result} onClose={() => setComparison(null)} onOpen={() => onOpen(comparison.other)} />;
  }
  if (error) return <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">Couldn&apos;t load related papers: {error}</p>;
  if (!data) return <Skeleton lines={9} />;

  const list = data[group];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-card p-4">
        <Quote size={18} className="text-accent" />
        <p className="text-sm">
          Cited <strong>{data.citations.toLocaleString()}</strong> times
        </p>
      </div>

      <div className="flex gap-1 rounded-lg bg-sunk p-1 text-sm">
        {GROUPS.map((g) => (
          <button key={g.key} onClick={() => setGroup(g.key)} className={`flex-1 rounded-md py-1.5 font-medium ${group === g.key ? "bg-card shadow-sm" : "text-muted"}`}>
            {g.label} <span className="text-xs text-muted">({data[g.key].length})</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{GROUPS.find((g) => g.key === group)!.blurb}</p>

      {notice && <p className="rounded-lg bg-blue-soft/60 px-3 py-2 text-sm">{notice}</p>}

      {list.length === 0 && <p className="text-sm text-muted">Nothing here yet.</p>}
      <div className="space-y-2.5">
        {list.map((p) => {
          const loading = busy?.title === p.title;
          return (
            <article key={p.title} className="rounded-xl border border-line bg-card p-4">
              <h3 className="font-serif leading-snug font-semibold">{p.title}</h3>
              <p className="mt-1 truncate text-xs text-muted">
                {p.authors.join(", ")}
                {p.year && ` · ${p.year}`} · {p.citations.toLocaleString()} citations
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => open(p)}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-paper disabled:opacity-50"
                >
                  {loading && busy.action === "open" ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />} Open
                </button>
                <button
                  onClick={() => compare(p)}
                  disabled={busy !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-sunk disabled:opacity-50"
                >
                  {loading && busy.action === "compare" ? <Loader2 size={13} className="animate-spin" /> : <GitCompare size={13} />}
                  {loading && busy.action === "compare" ? "Comparing…" : "Compare with this paper"}
                </button>
                <a href={p.url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 text-xs text-muted hover:underline">
                  Source <ExternalLink size={11} />
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

// Page citations are ambiguous in a two-paper comparison (whose page 8?), so drop them.
const noCites = (t: string) => t.replace(/\s*\[(?:[AB]\s*)?p\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*(?:[AB]\s*)?p?\d+(?:\s*[-–]\s*\d+)?)*\]/g, "");

function ComparisonView({ a, b, result, onClose, onOpen }: { a: OpenPaper; b: OpenPaper; result: Comparison; onClose: () => void; onOpen: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold">Side-by-side comparison</h2>
        <button onClick={onClose} className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-muted hover:bg-sunk">
          <X size={14} /> Close
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <PaperChip label="Paper A (this one)" title={a.title} />
        <PaperChip label="Paper B" title={b.title} action={<Button variant="outline" className="mt-2 !py-1 text-xs" onClick={onOpen}>Open paper B</Button>} />
      </div>
      <div className="rounded-xl border border-line bg-card p-5">
        <Markdown>{noCites(result.summary)}</Markdown>
      </div>
      <div className="overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-sunk text-left text-xs tracking-wide text-muted uppercase">
              <th className="w-32 p-3">Aspect</th>
              <th className="p-3">Paper A</th>
              <th className="p-3">Paper B</th>
            </tr>
          </thead>
          <tbody>
            {result.dimensions.map((d) => (
              <tr key={d.dimension} className="border-b border-line align-top last:border-0">
                <td className="p-3 font-semibold">{d.dimension}</td>
                <td className="p-3 leading-relaxed">{noCites(d.a)}</td>
                <td className="p-3 leading-relaxed">{noCites(d.b)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-card p-4 text-sm">
          <p className="mb-1 font-semibold">Choose A when…</p>
          <p className="leading-relaxed">{noCites(result.chooseA)}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4 text-sm">
          <p className="mb-1 font-semibold">Choose B when…</p>
          <p className="leading-relaxed">{noCites(result.chooseB)}</p>
        </div>
      </div>
      <div className="rounded-xl border border-accent/40 bg-accent-soft/40 p-5">
        <p className="mb-1 font-serif text-lg font-semibold">For your problem</p>
        <Markdown>{noCites(result.forYourProblem)}</Markdown>
      </div>
    </div>
  );
}

function PaperChip({ label, title, action }: { label: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <p className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</p>
      <p className="mt-1 font-serif leading-snug font-semibold">{title}</p>
      {action}
    </div>
  );
}
