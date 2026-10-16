"use client";

import { BookOpenText, Download, Library, Loader2, PlugZap } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseArxivId } from "@/lib/arxiv";
import { load, loadArxivPaper, save, type Connection, type OpenPaper, type Profile } from "@/lib/client";
import { PROVIDERS } from "@/lib/providers";
import { ConnectModal } from "./ConnectModal";
import { Discover } from "./Discover";
import { Workspace } from "./Workspace";

export type Recent = Omit<OpenPaper, "pdfSrc" | "text"> & { openedAt: number };

/** /paper/<id>, and arXiv-style /abs/<id> or /pdf/<id> (swap arxiv.org for our domain). */
function idFromPath(path: string) {
  const m = path.match(/^\/(?:paper|abs|pdf)\/(.+)$/);
  return m ? parseArxivId(decodeURIComponent(m[1])) : null;
}

const DEFAULT_PROFILE: Profile = { problem: "", topic: "", level: "intermediate", language: "English" };

export function App() {
  const [hydrated, setHydrated] = useState(false);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [paper, setPaper] = useState<OpenPaper | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [routeLoading, setRouteLoading] = useState<string | null>(null);
  const [routeError, setRouteError] = useState("");

  useEffect(() => {
    // Reading localStorage must happen after mount to avoid hydration mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConnection(load<Connection | null>("connection", null));
    setProfile({ ...DEFAULT_PROFILE, ...load<Partial<Profile>>("profile", {}) });
    setRecent(load<Recent[]>("recent", []));
    setDesktop(/Electron/.test(navigator.userAgent));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save("profile", profile);
  }, [profile, hydrated]);

  const updateConnection = (c: Connection | null) => {
    setConnection(c);
    save("connection", c);
  };

  const openPaper = useCallback((p: OpenPaper, { push = true }: { push?: boolean } = {}) => {
    setPaper(p);
    const path = p.source === "arxiv" ? `/paper/${p.id}` : "/";
    if (push && window.location.pathname !== path) window.history.pushState(null, "", path);
    else if (window.location.pathname !== path) window.history.replaceState(null, "", path);
    setRecent((prev) => {
      const meta: Recent = { id: p.id, title: p.title, authors: p.authors, published: p.published, absUrl: p.absUrl, source: p.source, pages: p.pages, openedAt: Date.now() };
      const next = [meta, ...prev.filter((r) => r.id !== p.id)].slice(0, 12);
      save("recent", next);
      return next;
    });
  }, []);

  const closePaper = useCallback(() => {
    setPaper(null);
    if (window.location.pathname !== "/") window.history.pushState(null, "", "/");
  }, []);

  // Open the paper named in the URL, and follow the browser's back/forward buttons.
  const paperRef = useRef<OpenPaper | null>(null);
  useEffect(() => {
    paperRef.current = paper;
  }, [paper]);
  useEffect(() => {
    const sync = () => {
      const id = idFromPath(window.location.pathname);
      setRouteError("");
      if (!id) {
        if (paperRef.current?.source !== "upload") setPaper(null);
        return;
      }
      if (paperRef.current?.id === id) return;
      setRouteLoading(id);
      loadArxivPaper(id)
        .then((loaded) => openPaper(loaded, { push: false }))
        .catch((e) => setRouteError(`Couldn't open arXiv:${id}. ${(e as Error).message}`))
        .finally(() => setRouteLoading(null));
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [openPaper]);

  return (
    <div className="flex h-full flex-col">
      <header
        className={`flex h-14 shrink-0 items-center gap-3 border-b border-line bg-card/70 px-4 backdrop-blur ${
          // Leave room for the macOS window buttons and let the bar drag the window.
          desktop ? "pl-20 [-webkit-app-region:drag] [&_button]:[-webkit-app-region:no-drag]" : ""
        }`}
      >
        <button onClick={closePaper} className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-paper">
            <BookOpenText size={17} />
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight">PaperLens</span>
        </button>
        {paper && (
          <>
            <span className="text-line">/</span>
            <span className="hidden min-w-0 truncate text-sm text-muted sm:block">{paper.title}</span>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">
          {hydrated && !desktop && (
            <Link href="/download" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-sunk">
              <Download size={15} /> <span className="hidden sm:inline">Download app</span>
            </Link>
          )}
          {paper && (
            <button onClick={closePaper} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-sunk">
              <Library size={15} /> <span className="hidden sm:inline">Library</span>
            </button>
          )}
          <button
            onClick={() => setConnectOpen(true)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
              connection ? "border-good/40 bg-good-soft text-good" : "border-accent bg-accent text-white hover:opacity-90"
            }`}
          >
            {connection ? (
              <>
                <span className="h-2 w-2 rounded-full bg-good" />
                {PROVIDERS[connection.provider].label} connected
              </>
            ) : (
              <>
                <PlugZap size={15} /> Connect Claude or ChatGPT
              </>
            )}
          </button>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {routeLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
            <Loader2 className="animate-spin text-accent" />
            <p className="text-sm">Opening arXiv:{routeLoading}…</p>
          </div>
        ) : routeError && !paper ? (
          <div className="mx-auto max-w-lg p-10 text-center">
            <p className="rounded-xl bg-bad-soft p-4 text-sm text-bad">{routeError}</p>
            <button onClick={closePaper} className="mt-4 text-sm text-blue underline">
              Go to the library
            </button>
          </div>
        ) : paper ? (
          <Workspace
            key={paper.id}
            paper={paper}
            connection={connection}
            profile={profile}
            setProfile={setProfile}
            requireConnect={() => setConnectOpen(true)}
            onOpenPaper={openPaper}
          />
        ) : (
          <Discover
            hydrated={hydrated}
            connection={connection}
            profile={profile}
            setProfile={setProfile}
            recent={recent}
            onOpen={openPaper}
            requireConnect={() => setConnectOpen(true)}
          />
        )}
      </main>

      {connectOpen && <ConnectModal current={connection} onSave={updateConnection} onClose={() => setConnectOpen(false)} />}
    </div>
  );
}
