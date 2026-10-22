"use client";

import { Apple, ArrowLeft, BookOpenText, Download, Monitor, ShieldCheck, Terminal } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

// Forks set NEXT_PUBLIC_GITHUB_REPO so downloads point at their own releases.
const REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || "Naveen-Sai-Ganadi/paperlens";
// Version-free asset names (see package.json build.artifactName) keep these links stable.
const latest = (file: string) => `https://github.com/${REPO}/releases/latest/download/${file}`;

type PlatformKey = "mac-arm64" | "mac-x64" | "win" | "linux";

const PLATFORMS: Record<PlatformKey, { label: string; detail: string; file: string; icon: typeof Apple }> = {
  "mac-arm64": { label: "macOS", detail: "Apple Silicon (M1 and newer)", file: "PaperLens-mac-arm64.dmg", icon: Apple },
  "mac-x64": { label: "macOS", detail: "Intel", file: "PaperLens-mac-x64.dmg", icon: Apple },
  win: { label: "Windows", detail: "Windows 10 and 11, 64-bit", file: "PaperLens-win-x64.exe", icon: Monitor },
  linux: { label: "Linux", detail: "AppImage, 64-bit", file: "PaperLens-linux-x86_64.AppImage", icon: Terminal },
};

// The installers aren't signed with paid Apple/Microsoft certificates yet, so the first launch needs one extra click.
const STEPS: Record<"mac" | "win" | "linux", string[]> = {
  mac: [
    "Open the downloaded .dmg file and drag PaperLens into your Applications folder.",
    "Open PaperLens. macOS says it can't check the app for malicious software; click Done.",
    "Open System Settings → Privacy & Security, scroll down and click Open Anyway next to PaperLens, then Open.",
    "From then on, PaperLens opens normally.",
  ],
  win: [
    "Run the downloaded installer.",
    "If Windows says it protected your PC, click More info, then Run anyway.",
    "Choose where to install and click Install, then open PaperLens from the Start menu.",
  ],
  linux: ["Make the file executable: chmod +x PaperLens-linux-x86_64.AppImage", "Double-click it, or run ./PaperLens-linux-x86_64.AppImage"],
};

type Release = { tag: string; date: string; sizes: Record<string, number> } | null;

function detect(): PlatformKey {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return "win";
  if (/Linux/i.test(ua) && !/Android/i.test(ua)) return "linux";
  // Browsers report Intel in the user agent even on Apple Silicon; WebGL's renderer tells them apart.
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    const renderer = gl?.getParameter(gl.getExtension("WEBGL_debug_renderer_info")?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER);
    if (typeof renderer === "string" && /Intel/i.test(renderer)) return "mac-x64";
  } catch {
    // assume Apple Silicon
  }
  return "mac-arm64";
}

export function DownloadPage() {
  const [platform, setPlatform] = useState<PlatformKey>("mac-arm64");
  const [release, setRelease] = useState<Release | undefined>(undefined);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlatform(detect());
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then((r) => (r.ok ? r.json() : null))
      .then((r) =>
        setRelease(
          r
            ? {
                tag: r.tag_name,
                date: r.published_at,
                sizes: Object.fromEntries((r.assets ?? []).map((a: { name: string; size: number }) => [a.name, a.size])),
              }
            : null,
        ),
      )
      .catch(() => setRelease(null));
  }, []);

  const ready = Boolean(release);
  const main = PLATFORMS[platform];
  const size = (file: string) => (release?.sizes[file] ? ` · ${Math.round(release.sizes[file] / 1e6)} MB` : "");
  const family = platform.startsWith("mac") ? "mac" : (platform as "win" | "linux");

  return (
    <div className="h-full overflow-y-auto">
      <header className="flex h-14 items-center gap-3 border-b border-line bg-card/70 px-4 backdrop-blur">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink text-paper">
            <BookOpenText size={17} />
          </span>
          <span className="font-serif text-xl font-semibold tracking-tight">PaperLens</span>
        </Link>
        <Link href="/" className="ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-sunk">
          <ArrowLeft size={15} /> Use it in the browser
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="mb-3 text-sm font-medium tracking-wide text-accent uppercase">Desktop app</p>
        <h1 className="font-serif text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
          Understand papers with the <em className="text-muted">subscription you already have</em>.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">
          The desktop app can use your Claude Pro/Max or ChatGPT Plus/Pro plan, so there&apos;s no API key to buy. Everything runs on your computer.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          {ready ? (
            <a
              href={latest(main.file)}
              className="inline-flex items-center gap-2.5 rounded-xl bg-accent px-5 py-3.5 font-semibold text-white shadow-sm hover:opacity-90"
            >
              <Download size={18} /> Download for {main.label} <span className="font-normal opacity-80">({main.detail})</span>
            </a>
          ) : (
            <span className="inline-flex items-center gap-2.5 rounded-xl border border-line bg-card px-5 py-3.5 font-semibold text-muted">
              <Download size={18} /> {release === undefined ? "Checking for the latest version…" : "First release coming soon"}
            </span>
          )}
          {release && (
            <span className="text-sm text-muted">
              {release.tag} · released {new Date(release.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          )}
        </div>

        <section className="mt-12">
          <h2 className="mb-4 font-serif text-2xl font-semibold">All platforms</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => {
              const p = PLATFORMS[key];
              const Icon = p.icon;
              const body = (
                <>
                  <Icon size={22} className="shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{p.label}</span>
                    <span className="block text-sm text-muted">
                      {p.detail}
                      {size(p.file)}
                    </span>
                  </span>
                  <Download size={16} className="shrink-0 text-muted" />
                </>
              );
              const cls = `flex items-center gap-3 rounded-xl border bg-card p-4 ${key === platform ? "border-ink" : "border-line"}`;
              return ready ? (
                <a key={key} href={latest(p.file)} className={`${cls} hover:border-ink`}>
                  {body}
                </a>
              ) : (
                <div key={key} className={`${cls} opacity-60`} aria-disabled>
                  {body}
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12 grid gap-5 md:grid-cols-2">
          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="mb-3 font-serif text-lg font-semibold">Install on {family === "mac" ? "Mac" : family === "win" ? "Windows" : "Linux"}</h2>
            <ol className="space-y-2 text-sm">
              {STEPS[family].map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="rounded-xl border border-line bg-card p-5">
            <h2 className="mb-3 font-serif text-lg font-semibold">Use your subscription</h2>
            <p className="mb-3 text-sm text-muted">Install and sign in to one of these official tools once. PaperLens finds it automatically.</p>
            <p className="mb-1 text-sm font-medium">Claude Pro or Max</p>
            <code className="mb-3 block rounded-md bg-ink px-3 py-2 font-mono text-xs text-paper">npm install -g @anthropic-ai/claude-code && claude</code>
            <p className="mb-1 text-sm font-medium">ChatGPT Plus or Pro</p>
            <code className="block rounded-md bg-ink px-3 py-2 font-mono text-xs text-paper">npm install -g @openai/codex && codex login</code>
          </div>
        </section>

        <section className="mt-5 flex gap-3 rounded-xl bg-sunk p-5 text-sm text-muted">
          <ShieldCheck size={18} className="mt-0.5 shrink-0 text-good" />
          <div className="space-y-2">
            <p>
              <strong className="text-ink">How subscriptions work:</strong> PaperLens asks the official Claude Code or Codex app on your computer to answer, with its tools switched off. Your login stays in those apps and PaperLens never sees it. Anthropic&apos;s and OpenAI&apos;s terms for Claude Code and Codex apply to that usage.
            </p>
            <p>
              <strong className="text-ink">Why the security prompt:</strong> PaperLens isn&apos;t signed with a paid Apple or Microsoft developer certificate yet, so your computer asks you to confirm it once. The installers are built by GitHub Actions straight from the public source code.
            </p>
            <p>
              Prefer not to install anything? <Link href="/" className="text-blue underline">Use PaperLens in the browser</Link> with an Anthropic or OpenAI API key. PaperLens is open source on{" "}
              <a href={`https://github.com/${REPO}`} className="text-blue underline">GitHub</a>.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
