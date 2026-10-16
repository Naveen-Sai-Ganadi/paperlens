"use client";

import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { Mermaid } from "./Mermaid";
import { usePageJump } from "./PageJump";

/** [p3], [p3-4] and [p3, p5] citations become links handled by the paper viewer. */
function linkPageCitations(src: string) {
  return src.replace(/\[(p\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*p?\d+(?:\s*[-–]\s*\d+)?)*)\](?!\()/g, (_, inner: string) =>
    inner
      .split(/\s*,\s*/)
      .map((part) => {
        const page = part.match(/\d+/)?.[0];
        return `[${part.startsWith("p") ? part : `p${part}`}](#page-${page})`;
      })
      .join(" "),
  );
}

/** Models frequently emit \( \) and \[ \] delimiters; remark-math only knows $ and $$. */
function normalizeMath(src: string) {
  return src
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, m) => `$$${m}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, m) => `$${m}$`);
}

export function Markdown({ children, className = "" }: { children: string; className?: string }) {
  const jump = usePageJump();
  return (
    <div className={`prose-lens ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children }) {
            const lang = /language-(\w+)/.exec(className ?? "")?.[1];
            if (lang === "mermaid") return <Mermaid code={String(children).trim()} />;
            return <code className={className}>{children}</code>;
          },
          a: ({ children, href }) => {
            const page = href?.match(/^#page-(\d+)$/)?.[1];
            if (page) {
              return (
                <button
                  type="button"
                  onClick={() => jump?.(Number(page))}
                  title={`Show page ${page} of the paper`}
                  className="mx-0.5 inline-flex -translate-y-px items-center rounded bg-blue-soft px-1.5 py-px align-middle font-mono text-[0.7rem] font-semibold text-blue no-underline hover:bg-blue hover:text-paper"
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {linkPageCitations(normalizeMath(children ?? ""))}
      </ReactMarkdown>
    </div>
  );
}
