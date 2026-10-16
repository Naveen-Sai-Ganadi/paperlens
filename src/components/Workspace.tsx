"use client";

import { BookOpen, BrainCircuit, GraduationCap, Lightbulb, MessageCircle, Network, Target, Workflow } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { load, postJSON, save, type Analyses, type Connection, type OpenPaper, type Profile, type SectionState } from "@/lib/client";
import type { SectionKey } from "@/lib/schemas";
import { AudioOverview } from "./AudioOverview";
import { ChatView } from "./ChatView";
import { PageJumpContext } from "./PageJump";
import { PaperBar } from "./PaperBar";
import type { SelectionAction } from "./PdfViewer";
import { QuizView } from "./QuizView";
import { RelatedView } from "./RelatedView";
import { ApproachView, ArticleView, ExamplesView, OverviewView, ProblemView } from "./sections";
import { Button, Skeleton } from "./ui";

// pdf.js needs the browser; never render it on the server.
const PdfViewer = dynamic(() => import("./PdfViewer").then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => <div className="skeleton m-4 flex-1" />,
});

const TABS = [
  { key: "overview", label: "Overview", icon: Lightbulb, section: "overview" },
  { key: "article", label: "Article", icon: BookOpen, section: "article" },
  { key: "approach", label: "Approach & diagrams", icon: Workflow, section: "approach" },
  { key: "examples", label: "Examples", icon: BrainCircuit, section: "examples" },
  { key: "problem", label: "Your problem", icon: Target, section: "examples" },
  { key: "quiz", label: "Quiz", icon: GraduationCap, section: "quiz" },
  { key: "related", label: "Related", icon: Network, section: null },
  { key: "ask", label: "Ask", icon: MessageCircle, section: null },
] as const;

type TabKey = (typeof TABS)[number]["key"];
// Generated as soon as a paper opens. The audio overview is made on request.
const AUTO_SECTIONS: SectionKey[] = ["overview", "article", "approach", "examples", "quiz"];

type Cache = Record<string, { problem: string; level: string; analyses: Analyses }>;

export function Workspace({
  paper,
  connection,
  profile,
  setProfile,
  requireConnect,
  onOpenPaper,
}: {
  paper: OpenPaper;
  connection: Connection | null;
  profile: Profile;
  setProfile: (p: Profile) => void;
  requireConnect: () => void;
  onOpenPaper: (p: OpenPaper) => void;
}) {
  const [tab, setTab] = useState<TabKey>("overview");
  const [analyses, setAnalyses] = useState<Analyses>({});
  const [split, setSplit] = useState(48);
  const [mobilePane, setMobilePane] = useState<"paper" | "explain">("explain");
  const [leftMode, setLeftMode] = useState<"pdf" | "text">("pdf");
  const [problemDraft, setProblemDraft] = useState(profile.problem);
  const [jump, setJump] = useState<{ page: number; nonce: number } | null>(null);
  const [inject, setInject] = useState<{ text: string; nonce: number } | null>(null);
  const [listening, setListening] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const started = useRef<string | null>(null);

  // Explanations are cached per paper and language.
  const cacheKey = `${paper.id}::${profile.language}`;

  const persist = useCallback(
    (next: Analyses) => {
      const cache = load<Cache>("analyses", {});
      const done = Object.fromEntries(Object.entries(next).filter(([, s]) => s?.status === "done"));
      // Keep only the 8 most recent entries to stay well inside localStorage limits.
      const entries = Object.entries({ ...cache, [cacheKey]: { problem: profile.problem, level: profile.level, analyses: done } }).slice(-8);
      save("analyses", Object.fromEntries(entries));
    },
    [cacheKey, profile.problem, profile.level],
  );

  const run = useCallback(
    async (sections: SectionKey[], problem: string = profile.problem) => {
      if (!connection) return requireConnect();
      setAnalyses((a) => ({ ...a, ...Object.fromEntries(sections.map((s) => [s, { status: "loading" }])) }));
      await Promise.all(
        sections.map(async (section) => {
          try {
            const data = await postJSON(
              "/api/analyze",
              { section, title: paper.title, text: paper.text, problem, level: profile.level, language: profile.language },
              connection,
            );
            setAnalyses((a) => {
              const next = { ...a, [section]: { status: "done" as const, data } };
              persist(next);
              return next;
            });
          } catch (e) {
            setAnalyses((a) => ({ ...a, [section]: { status: "error", error: (e as Error).message } }));
          }
        }),
      );
    },
    [connection, paper, profile.problem, profile.level, profile.language, persist, requireConnect],
  );

  // On open (or language change): restore cached explanations, otherwise generate them in parallel.
  useEffect(() => {
    if (started.current === cacheKey) return;
    const cached = load<Cache>("analyses", {})[cacheKey]?.analyses ?? {};
    if (Object.keys(cached).length === 0 && !connection) {
      setAnalyses({});
      return;
    }
    started.current = cacheKey;
    setAnalyses(cached);
    const missing = AUTO_SECTIONS.filter((s) => !cached[s]);
    if (missing.length && connection) void run(missing);
  }, [cacheKey, connection, run]);

  const jumpTo = useCallback((page: number) => {
    setLeftMode("pdf");
    setMobilePane("paper");
    setJump({ page, nonce: Date.now() });
  }, []);

  const onSelection = useCallback(
    (action: SelectionAction, text: string, page: number) => {
      const quote = `“${text}” (page ${page})`;
      const prompt = {
        ask: `About this passage: ${quote}\n\nWhat does it mean, and why does it matter in the paper?`,
        explain: `Explain this passage in simple terms, with an everyday example: ${quote}`,
        translate: `Translate this passage into ${profile.language === "English" ? "plain, simple English" : profile.language}, then explain any technical terms: ${quote}`,
      }[action];
      setTab("ask");
      setMobilePane("explain");
      setInject({ text: prompt, nonce: Date.now() });
    },
    [profile.language],
  );

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    const move = (ev: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setSplit(Math.min(75, Math.max(25, ((ev.clientX - rect.left) / rect.width) * 100)));
    };
    const up = () => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.body.style.userSelect = "";
    };
    document.body.style.userSelect = "none";
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  const current = TABS.find((t) => t.key === tab)!;
  const state: SectionState | undefined = current.section ? analyses[current.section] : undefined;
  const problemChanged = problemDraft.trim() !== profile.problem.trim();

  const renderSection = () => {
    if (tab === "related") {
      return <RelatedView paper={paper} connection={connection} profile={profile} onOpen={onOpenPaper} requireConnect={requireConnect} />;
    }
    if (!connection && !state?.data) {
      return (
        <div className="rounded-xl border border-accent/40 bg-accent-soft/40 p-6 text-center">
          <p className="font-serif text-lg font-semibold">Connect Claude or ChatGPT to start</p>
          <p className="mt-1 text-sm text-muted">Explanations, diagrams, examples, and the quiz are generated with your own account.</p>
          <Button onClick={requireConnect} className="mt-4">
            Connect an account
          </Button>
        </div>
      );
    }
    if (!state || state.status === "loading" || state.status === "idle") {
      return (
        <div>
          <p className="mb-4 flex items-center gap-2 text-sm text-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            Reading the paper and writing your {current.label.toLowerCase()}
            {profile.language !== "English" && ` in ${profile.language}`}…
          </p>
          <Skeleton lines={9} />
        </div>
      );
    }
    if (state.status === "error") {
      return (
        <div className="rounded-xl bg-bad-soft p-5 text-sm text-bad">
          <p className="font-semibold">Couldn&apos;t generate this section.</p>
          <p className="mt-1">{state.error}</p>
          <Button variant="outline" className="mt-3" onClick={() => run([current.section!])}>
            Try again
          </Button>
        </div>
      );
    }
    const data = state.data as never;
    switch (tab) {
      case "overview":
        return <OverviewView data={data} />;
      case "article":
        return <ArticleView data={data} title={paper.title} />;
      case "approach":
        return <ApproachView data={data} />;
      case "examples":
        return <ExamplesView data={data} />;
      case "problem":
        return <ProblemView data={data} problem={profile.problem} />;
      case "quiz":
        return <QuizView key={JSON.stringify(data).length} data={data} onRegenerate={() => run(["quiz"])} />;
    }
  };

  return (
    <PageJumpContext.Provider value={jumpTo}>
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 border-b border-line bg-card md:hidden">
          {(["paper", "explain"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setMobilePane(p)}
              className={`flex-1 py-2.5 text-sm font-medium ${mobilePane === p ? "border-b-2 border-accent" : "text-muted"}`}
            >
              {p === "paper" ? "Paper" : "Explanation"}
            </button>
          ))}
        </div>

        <div ref={containerRef} className="flex min-h-0 flex-1" style={{ ["--split" as string]: `${split}%` }}>
          {/* Left: the paper itself */}
          <section className={`${mobilePane === "paper" ? "flex" : "hidden"} min-w-0 flex-col bg-sunk max-md:w-full md:flex md:w-[var(--split)]`}>
            <div className="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-card px-3 text-xs">
              <span className="text-muted">Select any text in the paper to ask about it, simplify it, or translate it.</span>
              <div className="ml-auto flex rounded-md border border-line bg-paper p-0.5">
                {(["pdf", "text"] as const).map((m) => (
                  <button key={m} onClick={() => setLeftMode(m)} className={`rounded px-2 py-0.5 uppercase ${leftMode === m ? "bg-ink text-paper" : "text-muted"}`}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            {leftMode === "pdf" ? (
              <PdfViewer src={paper.pdfSrc} jump={jump} onAction={onSelection} originalUrl={paper.source === "arxiv" ? paper.absUrl : undefined} />
            ) : (
              <pre className="min-h-0 flex-1 overflow-auto p-5 font-serif text-[0.95rem] leading-relaxed whitespace-pre-wrap">{paper.text}</pre>
            )}
          </section>

          <div onPointerDown={startDrag} className="hidden w-1.5 shrink-0 cursor-col-resize bg-line transition hover:bg-accent md:block" title="Drag to resize" />

          {/* Right: explanations */}
          <section className={`${mobilePane === "explain" ? "flex" : "hidden"} min-w-0 flex-1 flex-col md:flex`}>
            <PaperBar
              paper={paper}
              language={profile.language}
              onLanguage={(language) => setProfile({ ...profile, language })}
              listening={listening}
              onListen={() => setListening((l) => !l)}
            />
            {listening && <AudioOverview state={analyses.podcast} language={profile.language} onGenerate={() => run(["podcast"])} />}

            <nav className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-card px-2">
              {TABS.map((t) => {
                const s = t.section ? analyses[t.section]?.status : undefined;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition ${
                      tab === t.key ? "border-accent font-semibold" : "border-transparent text-muted hover:text-ink"
                    }`}
                  >
                    <t.icon size={15} />
                    {t.label}
                    {s === "loading" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />}
                    {s === "error" && <span className="h-1.5 w-1.5 rounded-full bg-bad" />}
                  </button>
                );
              })}
            </nav>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
                {tab !== "ask" && tab !== "related" && (
                  <div className="mb-5 rounded-xl border border-line bg-card p-3">
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted uppercase">
                      <Target size={12} /> Your problem — explanations are tailored to it
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={problemDraft}
                        onChange={(e) => setProblemDraft(e.target.value)}
                        placeholder="What are you trying to solve? (optional)"
                        className="min-w-0 flex-1 rounded-md border border-line bg-paper px-2.5 py-1.5 text-sm outline-none focus:border-ink"
                      />
                      {problemChanged && (
                        <Button
                          onClick={() => {
                            setProfile({ ...profile, problem: problemDraft });
                            void run(AUTO_SECTIONS, problemDraft);
                          }}
                        >
                          Re-tailor
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                {/* Chat stays mounted so switching tabs doesn't lose the conversation. */}
                <div hidden={tab !== "ask"}>
                  <ChatView paper={paper} connection={connection} profile={profile} requireConnect={requireConnect} inject={inject} />
                </div>
                {tab !== "ask" && renderSection()}
              </div>
            </div>
          </section>
        </div>
      </div>
    </PageJumpContext.Provider>
  );
}
