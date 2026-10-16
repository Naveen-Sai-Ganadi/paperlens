"use client";

import { Copy, ExternalLink, Languages, Lightbulb, Loader2, MessageCircleQuestion, Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Must be set in the same module that renders <Document> (see react-pdf README).
// The file is copied into public/ by scripts/copy-pdf-worker.mjs on install.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export type SelectionAction = "ask" | "explain" | "translate";

type Popover = { text: string; page: number; x: number; y: number };

/** A page renders only once it's near the viewport; papers can run to 50+ pages. */
function LazyPage({ n, width, ratio, onVisible }: { n: number; width: number; ratio: number; onVisible: (n: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(n <= 2);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setNear(true);
          if (e.intersectionRatio > 0.4) onVisible(n);
        }
      },
      { rootMargin: "800px 0px", threshold: [0, 0.4] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [n, onVisible]);

  return (
    // A fixed size taken from the PDF itself keeps the layout stable while pages render.
    <div ref={ref} data-page={n} className="mx-auto mb-4 overflow-hidden bg-white shadow-md" style={{ width, height: Math.round(width * ratio) }}>
      {near && (
        <Page
          pageNumber={n}
          width={width}
          renderAnnotationLayer
          renderTextLayer
          loading={<div className="skeleton" style={{ width, height: Math.round(width * ratio) }} />}
        />
      )}
    </div>
  );
}

export function PdfViewer({
  src,
  jump,
  onAction,
  originalUrl,
}: {
  src: string;
  /** Set to scroll to a page; the nonce lets the same page be requested twice. */
  jump: { page: number; nonce: number } | null;
  onAction: (action: SelectionAction, text: string, page: number) => void;
  originalUrl?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [ratio, setRatio] = useState(11 / 8.5);
  const [current, setCurrent] = useState(1);
  const [fitWidth, setFitWidth] = useState(600);
  const [zoom, setZoom] = useState(1);
  const [popover, setPopover] = useState<Popover | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setFitWidth(Math.max(280, e.contentRect.width - 32)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const goTo = useCallback((page: number) => {
    const scroll = () => scrollRef.current?.querySelector(`[data-page="${page}"]`)?.scrollIntoView({ block: "start" });
    scroll();
    // Pages near the target render after the jump; settle on the exact spot once they have.
    setTimeout(scroll, 250);
  }, []);

  useEffect(() => {
    if (jump && numPages) goTo(Math.min(Math.max(1, jump.page), numPages));
  }, [jump, numPages, goTo]);

  const onVisible = useCallback((n: number) => setCurrent(n), []);

  // Show the action menu when text is selected inside the paper.
  const onMouseUp = () => {
    const sel = window.getSelection();
    const text = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
    if (!sel || !text || text.length < 2 || !scrollRef.current) return setPopover(null);
    const range = sel.getRangeAt(0);
    const pageEl = (range.startContainer.parentElement as HTMLElement | null)?.closest("[data-page]");
    if (!pageEl || !scrollRef.current.contains(pageEl)) return setPopover(null);
    const rect = range.getBoundingClientRect();
    const host = scrollRef.current.getBoundingClientRect();
    setPopover({
      text: text.slice(0, 2000),
      page: Number(pageEl.getAttribute("data-page")),
      x: Math.min(Math.max(rect.left + rect.width / 2 - host.left, 150), host.width - 150),
      y: rect.top - host.top + scrollRef.current.scrollTop,
    });
    setCopied(false);
  };

  const act = (a: SelectionAction) => {
    if (!popover) return;
    onAction(a, popover.text, popover.page);
    window.getSelection()?.removeAllRanges();
    setPopover(null);
  };

  const width = Math.round(fitWidth * zoom);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-10 shrink-0 items-center gap-1 border-b border-line bg-card px-2 text-xs">
        <span className="px-2 tabular-nums text-muted">
          Page {current} / {numPages || "…"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} className="rounded p-1.5 hover:bg-sunk" aria-label="Zoom out">
            <Minus size={14} />
          </button>
          <button onClick={() => setZoom(1)} className="w-12 rounded py-1 tabular-nums hover:bg-sunk">
            {Math.round(zoom * 100)}%
          </button>
          <button onClick={() => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)))} className="rounded p-1.5 hover:bg-sunk" aria-label="Zoom in">
            <Plus size={14} />
          </button>
          {originalUrl && (
            <a href={originalUrl} target="_blank" rel="noreferrer" className="ml-1 flex items-center gap-1 rounded px-2 py-1 text-muted hover:bg-sunk">
              <ExternalLink size={13} /> Original
            </a>
          )}
        </div>
      </div>

      <div ref={scrollRef} onMouseUp={onMouseUp} className="relative min-h-0 flex-1 overflow-auto bg-sunk px-4 py-4">
        <Document
          file={src}
          onLoadSuccess={async (pdf) => {
            const vp = (await pdf.getPage(1)).getViewport({ scale: 1 });
            setRatio(vp.height / vp.width);
            setNumPages(pdf.numPages);
          }}
          loading={
            <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted">
              <Loader2 size={16} className="animate-spin" /> Loading paper…
            </div>
          }
          error={<p className="py-20 text-center text-sm text-bad">Couldn&apos;t display this PDF. Try the Text view.</p>}
        >
          {Array.from({ length: numPages }, (_, i) => (
            <LazyPage key={i + 1} n={i + 1} width={width} ratio={ratio} onVisible={onVisible} />
          ))}
        </Document>

        {popover && (
          <div
            className="absolute z-20 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-xl border border-line bg-card p-1 text-xs shadow-xl"
            style={{ left: popover.x, top: popover.y - 8 }}
            onMouseUp={(e) => e.stopPropagation()}
          >
            <PopBtn icon={<MessageCircleQuestion size={14} />} label="Ask" onClick={() => act("ask")} />
            <PopBtn icon={<Lightbulb size={14} />} label="Explain simply" onClick={() => act("explain")} />
            <PopBtn icon={<Languages size={14} />} label="Translate" onClick={() => act("translate")} />
            <PopBtn
              icon={<Copy size={14} />}
              label={copied ? "Copied" : "Copy"}
              onClick={() => {
                void navigator.clipboard.writeText(popover.text);
                setCopied(true);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function PopBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-medium whitespace-nowrap hover:bg-sunk">
      {icon}
      {label}
    </button>
  );
}
