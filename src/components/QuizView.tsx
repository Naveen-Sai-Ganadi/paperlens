"use client";

import { Check, Eye, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import type { Quiz } from "@/lib/schemas";
import { Markdown } from "./Markdown";
import { Button } from "./ui";

const DIFF = { easy: "bg-good-soft text-good", medium: "bg-blue-soft text-blue", hard: "bg-accent-soft text-accent" };

export function QuizView({ data, onRegenerate }: { data: Quiz; onRegenerate: () => void }) {
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  const mcq = data.questions.map((q, i) => ({ q, i })).filter(({ q }) => q.kind === "multiple-choice" && q.options.length > 0);
  const answered = mcq.filter(({ i }) => picked[i] !== undefined);
  const correct = answered.filter(({ q, i }) => picked[i] === q.correctIndex).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-card p-4">
        <div>
          <p className="font-serif text-lg font-semibold">Check your understanding</p>
          <p className="text-sm text-muted">
            {answered.length === 0
              ? `${data.questions.length} questions. Answer first, then reveal the explanation.`
              : `Score: ${correct} / ${answered.length} multiple-choice answered (${mcq.length} total)`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPicked({});
              setRevealed({});
              setDrafts({});
            }}
          >
            <RotateCcw size={14} /> Reset
          </Button>
          <Button variant="outline" onClick={onRegenerate}>New questions</Button>
        </div>
      </div>

      {data.questions.map((q, i) => {
        const isMcq = q.kind === "multiple-choice" && q.options.length > 0;
        const choice = picked[i];
        const show = revealed[i] || (isMcq && choice !== undefined);
        return (
          <article key={i} className="rounded-xl border border-line bg-card p-5">
            <div className="mb-2 flex items-center gap-2 text-xs">
              <span className="font-semibold text-muted">Q{i + 1}</span>
              <span className={`rounded-full px-2 py-0.5 capitalize ${DIFF[q.difficulty]}`}>{q.difficulty}</span>
              <span className="text-muted">{isMcq ? "Multiple choice" : "Open answer"}</span>
            </div>
            <Markdown className="font-medium">{q.question}</Markdown>

            {isMcq ? (
              <div className="mt-3 grid gap-2">
                {q.options.map((opt, j) => {
                  const isPicked = choice === j;
                  const isRight = j === q.correctIndex;
                  const cls =
                    choice === undefined
                      ? "border-line hover:border-ink hover:bg-sunk"
                      : isRight
                        ? "border-good bg-good-soft"
                        : isPicked
                          ? "border-bad bg-bad-soft"
                          : "border-line opacity-60";
                  return (
                    <button
                      key={j}
                      disabled={choice !== undefined}
                      onClick={() => setPicked((p) => ({ ...p, [i]: j }))}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition ${cls}`}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-semibold">
                        {choice !== undefined && isRight ? <Check size={13} /> : choice !== undefined && isPicked ? <X size={13} /> : String.fromCharCode(65 + j)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-3">
                <textarea
                  value={drafts[i] ?? ""}
                  onChange={(e) => setDrafts((d) => ({ ...d, [i]: e.target.value }))}
                  rows={3}
                  placeholder="Write your answer in your own words, then compare…"
                  className="w-full resize-none rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
                />
                {!show && (
                  <Button variant="outline" className="mt-2" onClick={() => setRevealed((r) => ({ ...r, [i]: true }))}>
                    <Eye size={14} /> Show model answer
                  </Button>
                )}
              </div>
            )}

            {show && (
              <div className="mt-4 rounded-lg border-l-4 border-blue bg-blue-soft/50 p-3 text-sm">
                {isMcq ? (
                  <p className={`mb-1 font-semibold ${choice === q.correctIndex ? "text-good" : "text-bad"}`}>
                    {choice === q.correctIndex ? "Correct!" : `Not quite — the answer is ${String.fromCharCode(65 + q.correctIndex)}.`}
                  </p>
                ) : (
                  <>
                    <p className="font-semibold text-blue">Model answer</p>
                    <Markdown>{q.answer}</Markdown>
                  </>
                )}
                <Markdown className="text-muted">{q.explanation}</Markdown>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
