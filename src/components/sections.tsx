"use client";

import { AlertTriangle, BookMarked, Code2, Compass, FlaskConical, GitCompare, ListChecks, Sigma, Sparkles, Trophy, Workflow } from "lucide-react";
import katex from "katex";
import type { Approach, Examples, Overview } from "@/lib/schemas";
import { Markdown } from "./Markdown";
import { Mermaid } from "./Mermaid";
import { Bullets, Card } from "./ui";

export function OverviewView({ data }: { data: Overview }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-ink p-5 text-paper">
        <p className="mb-1 text-xs font-semibold tracking-widest uppercase opacity-60">TL;DR</p>
        <p className="font-serif text-xl leading-snug">{data.tldr}</p>
      </div>

      <Card title="Explain it simply" icon={<Sparkles size={17} className="text-accent" />} tone="accent">
        <Markdown>{data.eli5}</Markdown>
      </Card>

      <Card title="The problem" icon={<Compass size={17} className="text-accent" />}>
        <Markdown>{data.problem}</Markdown>
      </Card>

      <Card title="Key contributions" icon={<ListChecks size={17} className="text-accent" />}>
        <ol className="space-y-2.5">
          {data.keyContributions.map((c, i) => (
            <li key={i} className="flex gap-3 text-[0.95rem] leading-relaxed">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">{i + 1}</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div>
        <h3 className="mb-3 flex items-center gap-2 font-serif text-lg font-semibold">
          <BookMarked size={17} className="text-accent" /> Key concepts
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.keyConcepts.map((k) => (
            <div key={k.term} className="rounded-xl border border-line bg-card p-4">
              <p className="font-semibold">{k.term}</p>
              <p className="mt-1 text-sm leading-relaxed">{k.explanation}</p>
              <p className="mt-2 border-l-2 border-blue/40 pl-2.5 text-sm text-muted italic">{k.analogy}</p>
            </div>
          ))}
        </div>
      </div>

      <Card title="Results" icon={<Trophy size={17} className="text-accent" />}>
        <Markdown>{data.results}</Markdown>
      </Card>

      <div className="grid gap-5 sm:grid-cols-2">
        <Card title="Know these first" icon={<FlaskConical size={17} className="text-blue" />}>
          <Bullets items={data.prerequisites} />
        </Card>
        <Card title="Limitations" icon={<AlertTriangle size={17} className="text-bad" />}>
          <Bullets items={data.limitations} />
        </Card>
      </div>
    </div>
  );
}

function Equation({ latex }: { latex: string }) {
  const html = katex.renderToString(latex.replace(/^\$+|\$+$/g, ""), { displayMode: true, throwOnError: false });
  return <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ApproachView({ data }: { data: Approach }) {
  return (
    <div className="space-y-5">
      <Card title="The core idea" icon={<Sparkles size={17} className="text-accent" />} tone="accent">
        <Markdown>{data.intuition}</Markdown>
      </Card>

      {data.diagrams.map((d, i) => (
        <figure key={i} className="rounded-xl border border-line bg-card p-5">
          <figcaption className="mb-4">
            <p className="flex items-center gap-2 font-serif text-lg font-semibold">
              <Workflow size={17} className="text-accent" /> {d.title}
            </p>
          </figcaption>
          <Mermaid code={d.mermaid} />
          <p className="mt-4 border-t border-line pt-3 text-sm text-muted">{d.caption}</p>
        </figure>
      ))}

      <div>
        <h3 className="mb-3 font-serif text-lg font-semibold">How it works, step by step</h3>
        <ol className="relative space-y-4 border-l-2 border-line pl-6">
          {data.steps.map((s, i) => (
            <li key={i} className="relative">
              <span className="absolute top-0 -left-[2.15rem] grid h-7 w-7 place-items-center rounded-full border-2 border-paper bg-accent text-xs font-bold text-white">
                {i + 1}
              </span>
              <div className="rounded-xl border border-line bg-card p-4">
                <p className="font-semibold">{s.title}</p>
                <Markdown className="mt-1">{s.detail}</Markdown>
                <p className="mt-2 rounded-md bg-blue-soft/60 px-2.5 py-1.5 text-sm">
                  <span className="font-semibold text-blue">Why it matters: </span>
                  {s.whyItMatters}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {data.equations.length > 0 && (
        <Card title="Key equations, in plain English" icon={<Sigma size={17} className="text-accent" />}>
          <div className="space-y-5">
            {data.equations.map((e, i) => (
              <div key={i}>
                <p className="text-sm font-semibold">{e.name}</p>
                <div className="my-2 rounded-lg bg-sunk px-3 py-1">
                  <Equation latex={e.latex} />
                </div>
                <Markdown className="text-muted">{e.plainEnglish}</Markdown>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Compared with earlier approaches" icon={<GitCompare size={17} className="text-accent" />}>
        <div className="overflow-hidden rounded-lg border border-line">
          {data.comparison.map((c, i) => (
            <div key={i} className="grid gap-1 border-b border-line p-3 last:border-0 sm:grid-cols-[10rem_1fr] sm:gap-4">
              <p className="text-sm font-semibold">{c.approach}</p>
              <p className="text-sm leading-relaxed">{c.difference}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function ExamplesView({ data }: { data: Examples }) {
  return (
    <div className="space-y-5">
      {data.workedExamples.map((ex, i) => (
        <Card key={i} title={`Example ${i + 1}: ${ex.title}`} icon={<FlaskConical size={17} className="text-accent" />}>
          <p className="mb-3 rounded-lg bg-sunk px-3 py-2 text-sm">
            <span className="font-semibold">Scenario: </span>
            {ex.scenario}
          </p>
          <Markdown>{ex.walkthrough}</Markdown>
        </Card>
      ))}

      <Card title="Code sketch" icon={<Code2 size={17} className="text-accent" />}>
        <Markdown>{`\`\`\`${data.codeSketch.language}\n${data.codeSketch.code}\n\`\`\``}</Markdown>
        <Markdown className="text-muted">{data.codeSketch.explanation}</Markdown>
      </Card>

      <Card title="Where this is used" icon={<Compass size={17} className="text-accent" />}>
        <Bullets items={data.applications} />
      </Card>
    </div>
  );
}

export function ProblemView({ data, problem }: { data: Examples; problem: string }) {
  const a = data.applyToProblem;
  return (
    <div className="space-y-5">
      {!problem.trim() && (
        <p className="rounded-lg bg-blue-soft/60 px-4 py-3 text-sm">
          Add the problem you&apos;re working on in the box above and press <strong>Re-tailor</strong> for advice specific to you.
        </p>
      )}
      <Card title="How well this paper fits" icon={<Compass size={17} className="text-accent" />} tone="accent">
        <Markdown>{a.fit}</Markdown>
      </Card>
      <Card title="How to apply it" icon={<ListChecks size={17} className="text-accent" />}>
        <ol className="space-y-2.5">
          {a.howToApply.map((s, i) => (
            <li key={i} className="flex gap-3 text-[0.95rem] leading-relaxed">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-paper">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </Card>
      <div className="grid gap-5 sm:grid-cols-2">
        <Card title="Watch out for" icon={<AlertTriangle size={17} className="text-bad" />}>
          <Bullets items={a.caveats} />
        </Card>
        <Card title="Also look at" icon={<BookMarked size={17} className="text-blue" />}>
          <Bullets items={a.relatedIdeas} />
        </Card>
      </div>
    </div>
  );
}
