"use client";

import { useEffect, useId, useState } from "react";

let initialized: "light" | "dark" | null = null;

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Mermaid often chokes on unquoted labels with punctuation; quote them as a last resort. */
function sanitize(src: string) {
  return src
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/```\s*$/, "")
    .replace(/(\b[A-Za-z0-9_]+)\[([^\]"]*[()<>:;,/'][^\]"]*)\]/g, (_, id, label) => `${id}["${label.replace(/"/g, "'")}"]`);
}

export function Mermaid({ code }: { code: string }) {
  const id = "m" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      const mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
      if (initialized !== mode) {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
          themeVariables: {
            darkMode: mode === "dark",
            background: cssVar("--card"),
            primaryColor: cssVar("--accent-soft"),
            primaryBorderColor: cssVar("--accent"),
            primaryTextColor: cssVar("--ink"),
            secondaryColor: cssVar("--blue-soft"),
            tertiaryColor: cssVar("--sunk"),
            lineColor: cssVar("--muted"),
            textColor: cssVar("--ink"),
            clusterBkg: cssVar("--sunk"),
            clusterBorder: cssVar("--line"),
            fontSize: "14px",
          },
        });
        initialized = mode;
      }
      for (const candidate of [code, sanitize(code)]) {
        try {
          const { svg } = await mermaid.render(id, candidate);
          if (!cancelled) setSvg(svg);
          return;
        } catch {
          document.getElementById("d" + id)?.remove(); // mermaid leaves an error node behind
        }
      }
      if (!cancelled) setFailed(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (failed) {
    return (
      <div className="rounded-lg border border-line bg-sunk p-3 text-xs">
        <p className="mb-2 text-muted">This diagram couldn&apos;t be rendered. Source:</p>
        <pre className="overflow-x-auto font-mono whitespace-pre">{code}</pre>
      </div>
    );
  }
  if (!svg) return <div className="skeleton h-48 w-full" />;
  return <div className="mermaid-host flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}
