"use client";

import { ArrowRight, Clock, FileUp, Loader2, Search, Sparkles, Target } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import type { Paper } from "@/lib/arxiv";
import { postJSON, type Connection, type OpenPaper, type Profile } from "@/lib/client";
import type { Level } from "@/lib/prompts";
import type { Recommendation } from "@/lib/schemas";
import type { Recent } from "./App";

const STARTER_TOPICS = [
  "retrieval augmented generation",
  "diffusion models",
  "LLM agents tool use",
  "state space models",
  "graph neural networks",
  "reinforcement learning from human feedback",
];

type Rec = Recommendation & { paper: Paper };

export function Discover({
  hydrated,
  connection,
  profile,
  setProfile,
  recent,
  onOpen,
  requireConnect,
}: {
  hydrated: boolean;
  connection: Connection | null;
  profile: Profile;
  setProfile: (p: Profile) => void;
  recent: Recent[];
  onOpen: (p: OpenPaper) => void;
  requireConnect: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Paper[] | null>(null);
  const [recs, setRecs] = useState<Rec[] | null>(null);
  const [busy, setBusy] = useState<"search" | "recommend" | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const search = async (q: string, sort: "relevance" | "latest" = "relevance") => {
    if (!q.trim()) return;
    setBusy("search");
    setError("");
    try {
      const res = await fetch(`/api/papers/search?q=${encodeURIComponent(q)}&sort=${sort}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data.papers);
      if (data.papers.length === 1 && /arxiv\.org|^\d{4}\.\d{4,5}/.test(q.trim())) void openArxiv(data.papers[0]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const recommend = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!profile.problem.trim() && !profile.topic.trim()) return setError("Tell us a topic or the problem you want to solve.");
    if (!connection) {
      // Without a model we can still show the newest papers on the topic.
      setRecs(null);
      return search(profile.topic || profile.problem, "latest");
    }
    setBusy("recommend");
    setError("");
    try {
      const { recommendations } = await postJSON<{ recommendations: Rec[] }>(
        "/api/papers/recommend",
        { topic: profile.topic, problem: profile.problem },
        connection,
      );
      setRecs(recommendations);
      setResults(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openArxiv = async (p: Pick<OpenPaper, "id" | "title" | "authors" | "published" | "absUrl">) => {
    setOpening(p.id);
    setError("");
    try {
      const { text, pages } = await postJSON<{ text: string; pages: number }>("/api/papers/text", { arxivId: p.id }, null);
      onOpen({ ...p, source: "arxiv", pdfSrc: `/api/pdf?id=${p.id}`, text, pages });
    } catch (e) {
      setError((e as Error).message);
      setOpening(null);
    }
  };

  const upload = async (file: File) => {
    if (file.type !== "application/pdf") return setError("Please upload a PDF file.");
    setOpening("upload");
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/papers/text", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const firstLine = (data.text as string).split("\n").find((l) => l.trim().length > 12)?.trim();
      onOpen({
        id: `upload-${file.name}-${file.size}`,
        title: firstLine && firstLine.length < 160 ? firstLine : file.name.replace(/\.pdf$/i, ""),
        authors: [],
        source: "upload",
        pdfSrc: URL.createObjectURL(file),
        text: data.text,
        pages: data.pages,
      });
    } catch (e) {
      setError((e as Error).message);
      setOpening(null);
    }
  };

  const list: { paper: Paper; rec?: Rec }[] | null = recs ? recs.map((r) => ({ paper: r.paper, rec: r })) : results?.map((paper) => ({ paper })) ?? null;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-10 max-w-3xl">
          <p className="mb-3 text-sm font-medium tracking-wide text-accent uppercase">Research, made readable</p>
          <h1 className="font-serif text-4xl leading-[1.1] font-semibold tracking-tight sm:text-5xl">
            Read the paper on the left. <em className="text-muted">Understand it</em> on the right.
          </h1>
          <p className="mt-4 text-lg text-muted">
            Tell us what you&apos;re trying to solve. We&apos;ll suggest the best recent papers, then explain any of them with diagrams, worked examples, and a quiz to check you got it.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
          <form onSubmit={recommend} className="rounded-2xl border border-line bg-card p-5 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 font-serif text-xl font-semibold">
              <Target size={18} className="text-accent" /> What problem do you want to solve?
            </h2>
            <textarea
              value={profile.problem}
              onChange={(e) => setProfile({ ...profile, problem: e.target.value })}
              rows={3}
              placeholder="e.g. My support chatbot gives wrong answers about our product docs. I want it to cite the right page."
              className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2.5 text-[0.95rem] outline-none focus:border-ink"
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                value={profile.topic}
                onChange={(e) => setProfile({ ...profile, topic: e.target.value })}
                placeholder="Topic (optional), e.g. retrieval augmented generation"
                className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
              />
              <select
                value={profile.level}
                onChange={(e) => setProfile({ ...profile, level: e.target.value as Level })}
                className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                aria-label="Your level"
              >
                <option value="beginner">I&apos;m new to this</option>
                <option value="intermediate">I know the basics</option>
                <option value="expert">I&apos;m a practitioner</option>
              </select>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={busy !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {busy === "recommend" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {busy === "recommend" ? "Finding the best papers…" : "Suggest the best latest papers"}
              </button>
              {hydrated && !connection && (
                <button type="button" onClick={requireConnect} className="text-sm text-muted underline-offset-2 hover:underline">
                  Connect a model for personalised picks
                </button>
              )}
            </div>
          </form>

          <div className="flex flex-col gap-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setRecs(null);
                void search(query);
              }}
              className="rounded-2xl border border-line bg-card p-5"
            >
              <h2 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold">
                <Search size={16} /> Find a specific paper
              </h2>
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Title, keywords, or arXiv link"
                  className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                />
                <button type="submit" className="rounded-lg bg-ink px-3 text-paper" aria-label="Search">
                  {busy === "search" ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                </button>
              </div>
            </form>

            <button
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void upload(f);
              }}
              className="flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-card/50 p-5 text-center transition hover:border-ink hover:bg-card"
            >
              {opening === "upload" ? <Loader2 className="animate-spin text-accent" /> : <FileUp className="text-accent" />}
              <span className="font-medium">{opening === "upload" ? "Reading your PDF…" : "Upload a PDF"}</span>
              <span className="text-xs text-muted">Drop a paper here or click to browse</span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {error && <p className="mt-5 rounded-lg bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

        {!list && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-sm text-muted">Popular topics:</span>
            {STARTER_TOPICS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setQuery(t);
                  setRecs(null);
                  void search(t, "latest");
                }}
                className="rounded-full border border-line bg-card px-3 py-1 text-sm hover:border-ink"
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {list && (
          <section className="mt-10">
            <h2 className="mb-4 font-serif text-2xl font-semibold">
              {recs ? "Recommended for your problem" : `${list.length} papers found`}
            </h2>
            {list.length === 0 && <p className="text-muted">No papers matched. Try broader keywords.</p>}
            <div className="grid gap-3">
              {list.map(({ paper, rec }, i) => (
                <article key={paper.id} className="group rounded-xl border border-line bg-card p-5 transition hover:border-ink/40">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    {rec && <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-white">#{i + 1}</span>}
                    <span>{paper.published?.slice(0, 10)}</span>
                    <span>·</span>
                    <span className="truncate">{paper.authors.slice(0, 3).join(", ")}{paper.authors.length > 3 && " et al."}</span>
                    {rec && <span className="rounded-full bg-blue-soft px-2 py-0.5 text-blue capitalize">{rec.level}</span>}
                    {paper.categories?.slice(0, 2).map((c) => (
                      <span key={c} className="rounded bg-sunk px-1.5 py-0.5 font-mono">{c}</span>
                    ))}
                  </div>
                  <h3 className="mt-2 font-serif text-lg leading-snug font-semibold">{paper.title}</h3>
                  {rec ? (
                    <p className="mt-2 rounded-lg bg-accent-soft/50 px-3 py-2 text-sm"><strong>Why read it:</strong> {rec.reason}</p>
                  ) : (
                    <p className="mt-2 line-clamp-3 text-sm text-muted">{paper.summary}</p>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      onClick={() => openArxiv(paper)}
                      disabled={opening !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 text-sm font-medium text-paper disabled:opacity-60"
                    >
                      {opening === paper.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      {opening === paper.id ? "Opening…" : "Read & explain"}
                    </button>
                    <a href={paper.absUrl} target="_blank" rel="noreferrer" className="text-sm text-muted hover:underline">
                      arXiv page
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {recent.filter((r) => r.source === "arxiv").length > 0 && (
          <section className="mt-12">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wide text-muted uppercase">
              <Clock size={14} /> Recently opened
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {recent
                .filter((r) => r.source === "arxiv")
                .slice(0, 6)
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openArxiv(r)}
                    disabled={opening !== null}
                    className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2.5 text-left text-sm hover:border-ink/40"
                  >
                    {opening === r.id ? <Loader2 size={14} className="shrink-0 animate-spin" /> : <ArrowRight size={14} className="shrink-0 text-muted" />}
                    <span className="truncate">{r.title}</span>
                  </button>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
