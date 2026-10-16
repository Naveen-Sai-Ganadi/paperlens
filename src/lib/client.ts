"use client";

import type { Provider } from "./providers";
import type { Level } from "./prompts";
import type { SectionKey } from "./schemas";

export type Connection = { provider: Provider; apiKey?: string; model: string };

export type Profile = { problem: string; topic: string; level: Level; language: string };

export type OpenPaper = {
  id: string;
  title: string;
  authors: string[];
  published?: string;
  absUrl?: string;
  source: "arxiv" | "upload";
  /** URL for the left-hand viewer (proxied arXiv PDF or a blob: URL for uploads). */
  pdfSrc: string;
  text: string;
  pages: number;
};

export type SectionState = { status: "idle" | "loading" | "done" | "error"; data?: unknown; error?: string };

export type Analyses = Partial<Record<SectionKey, SectionState>>;

const KEYS = { connection: "pl.connection", profile: "pl.profile", recent: "pl.recent", analyses: "pl.analyses" };

export function load<T>(key: keyof typeof KEYS, fallback: T): T {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: keyof typeof KEYS, value: unknown) {
  try {
    localStorage.setItem(KEYS[key], JSON.stringify(value));
  } catch {
    // Storage full or unavailable — the app still works, it just won't remember.
  }
}

export function authHeaders(c: Connection | null): Record<string, string> {
  if (!c) return {};
  const h: Record<string, string> = { "x-llm-provider": c.provider, "x-llm-model": c.model };
  if (c.apiKey) h["x-llm-key"] = c.apiKey;
  return h;
}

export async function postJSON<T>(url: string, body: unknown, conn: Connection | null): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(conn) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

type PaperMeta = { id: string; title: string; authors: string[]; published?: string; absUrl?: string };

/** Downloads and reads an arXiv paper, preferring arXiv's own metadata over what search returned. */
export async function loadArxivPaper(id: string, hint?: Partial<PaperMeta>): Promise<OpenPaper> {
  const { text, pages, paper } = await postJSON<{ text: string; pages: number; paper: PaperMeta | null }>(
    "/api/papers/text",
    { arxivId: id },
    null,
  );
  const meta = paper ?? hint;
  return {
    id,
    title: meta?.title || `arXiv:${id}`,
    authors: meta?.authors ?? [],
    published: meta?.published,
    absUrl: meta?.absUrl ?? `https://arxiv.org/abs/${id}`,
    source: "arxiv",
    pdfSrc: `/api/pdf?id=${id}`,
    text,
    pages,
  };
}

const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Finds a paper on arXiv by exact title. Returns null if arXiv doesn't have it. */
export async function findArxivByTitle(title: string): Promise<PaperMeta | null> {
  const res = await fetch(`/api/papers/search?mode=title&q=${encodeURIComponent(title)}`);
  if (!res.ok) return null;
  const { papers } = (await res.json()) as { papers: PaperMeta[] };
  return papers.find((p) => norm(p.title) === norm(title)) ?? null;
}
