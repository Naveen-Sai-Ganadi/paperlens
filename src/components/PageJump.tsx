"use client";

import { createContext, useContext } from "react";

/** Lets any [p3] citation in an explanation scroll the paper viewer to that page. */
export const PageJumpContext = createContext<((page: number) => void) | null>(null);

export const usePageJump = () => useContext(PageJumpContext);

const CITE = /\[p(\d+)(?:\s*[-–]\s*\d+)?(?:\s*,\s*p?\d+(?:\s*[-–]\s*\d+)?)*\]/g;

/** Plain text with [pN] citations turned into page-jump chips. */
export function Cited({ text }: { text: string }) {
  const jump = usePageJump();
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(CITE)) {
    parts.push(text.slice(last, m.index));
    for (const page of m[0].match(/\d+(?:\s*[-–]\s*\d+)?/g) ?? []) {
      const first = Number(page.match(/\d+/)![0]);
      parts.push(
        <button
          key={`${m.index}-${page}`}
          type="button"
          onClick={() => jump?.(first)}
          title={`Show page ${first} of the paper`}
          className="mx-0.5 inline-flex -translate-y-px items-center rounded bg-blue-soft px-1.5 py-px align-middle font-mono text-[0.7rem] font-semibold text-blue hover:bg-blue hover:text-paper"
        >
          p{page.replace(/\s+/g, "")}
        </button>,
      );
    }
    last = m.index! + m[0].length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}
