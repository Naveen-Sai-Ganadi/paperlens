"use client";

import { Headphones, Loader2, Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { SectionState } from "@/lib/client";
import type { Podcast } from "@/lib/schemas";
import { Button } from "./ui";

const LANG_CODES: Record<string, string> = {
  English: "en", Spanish: "es", French: "fr", German: "de", Portuguese: "pt", Italian: "it", Hindi: "hi", Telugu: "te", Tamil: "ta",
  Bengali: "bn", "Chinese (Simplified)": "zh", Japanese: "ja", Korean: "ko", Arabic: "ar", Russian: "ru", Turkish: "tr", Vietnamese: "vi", Indonesian: "id",
};

/** Picks two different voices for the language so the host and expert sound distinct. */
function pickVoices(language: string): [SpeechSynthesisVoice | null, SpeechSynthesisVoice | null] {
  const code = LANG_CODES[language] ?? "en";
  const all = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(code));
  // Prefer higher-quality voices when the OS offers them.
  const ranked = [...all].sort((a, b) => Number(/premium|enhanced|natural|neural|google/i.test(b.name)) - Number(/premium|enhanced|natural|neural|google/i.test(a.name)));
  const host = ranked[0] ?? null;
  const expert = ranked.find((v) => v.name !== host?.name) ?? host;
  return [host, expert];
}

export function AudioOverview({
  state,
  language,
  onGenerate,
}: {
  state: SectionState | undefined;
  language: string;
  onGenerate: () => void;
}) {
  const podcast = state?.status === "done" ? (state.data as Podcast) : null;
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [voicesReady, setVoicesReady] = useState(false);
  const playingRef = useRef(false);
  const listRef = useRef<HTMLOListElement>(null);
  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  useEffect(() => {
    if (!supported) return;
    const ready = () => setVoicesReady(window.speechSynthesis.getVoices().length > 0);
    ready();
    window.speechSynthesis.addEventListener("voiceschanged", ready);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", ready);
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  const speakFrom = useCallback(
    (start: number) => {
      if (!podcast) return;
      window.speechSynthesis.cancel();
      const [host, expert] = pickVoices(language);
      const say = (i: number) => {
        if (!playingRef.current || i >= podcast.turns.length) {
          setPlaying(false);
          playingRef.current = false;
          if (i >= podcast.turns.length) setIndex(-1);
          return;
        }
        setIndex(i);
        const turn = podcast.turns[i];
        const u = new SpeechSynthesisUtterance(turn.text);
        const voice = turn.speaker === "host" ? host : expert;
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        }
        // Even with one available voice, a pitch shift tells the speakers apart.
        u.pitch = turn.speaker === "host" ? 1.1 : 0.9;
        u.rate = rate;
        u.onend = () => say(i + 1);
        window.speechSynthesis.speak(u);
      };
      playingRef.current = true;
      setPlaying(true);
      say(start);
    },
    [podcast, language, rate],
  );

  const toggle = () => {
    if (playing) {
      playingRef.current = false;
      window.speechSynthesis.cancel();
      setPlaying(false);
    } else {
      speakFrom(Math.max(0, index));
    }
  };

  useEffect(() => {
    listRef.current?.querySelector(`[data-turn="${index}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [index]);

  if (!supported) return <Panel><p className="text-sm text-muted">Your browser can&apos;t play speech. Try Chrome, Edge or Safari.</p></Panel>;

  if (!state || state.status === "idle") {
    return (
      <Panel>
        <div className="flex flex-wrap items-center gap-3">
          <p className="flex-1 text-sm text-muted">A short, two-voice conversation that explains this paper, in {language}.</p>
          <Button onClick={onGenerate}>
            <Headphones size={14} /> Create audio overview
          </Button>
        </div>
      </Panel>
    );
  }
  if (state.status === "loading") {
    return (
      <Panel>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={15} className="animate-spin" /> Writing the conversation…
        </p>
      </Panel>
    );
  }
  if (state.status === "error" || !podcast) {
    return (
      <Panel>
        <p className="text-sm text-bad">{state.error ?? "Couldn't create the audio overview."}</p>
        <Button variant="outline" className="mt-2" onClick={onGenerate}>Try again</Button>
      </Panel>
    );
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={toggle}
          disabled={!voicesReady}
          className="grid h-10 w-10 place-items-center rounded-full bg-accent text-white disabled:opacity-50"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <Pause size={17} /> : <Play size={17} className="translate-x-px" />}
        </button>
        <button onClick={() => speakFrom(Math.max(0, index - 1))} className="rounded-lg p-2 hover:bg-sunk" aria-label="Previous line">
          <SkipBack size={15} />
        </button>
        <button onClick={() => speakFrom(Math.min(podcast.turns.length - 1, index + 1))} className="rounded-lg p-2 hover:bg-sunk" aria-label="Next line">
          <SkipForward size={15} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{podcast.title}</p>
          <p className="text-xs text-muted">
            {index >= 0 ? `Line ${index + 1} of ${podcast.turns.length}` : `${podcast.turns.length} lines`} · {language}
          </p>
        </div>
        <select value={rate} onChange={(e) => setRate(Number(e.target.value))} className="rounded-md border border-line bg-paper px-1.5 py-1 text-xs" aria-label="Speed">
          {[0.75, 1, 1.25, 1.5, 1.75].map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
        <button onClick={onGenerate} className="rounded-lg p-2 text-muted hover:bg-sunk" title="Regenerate" aria-label="Regenerate">
          <RotateCcw size={14} />
        </button>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-medium text-muted">Transcript</summary>
        <ol ref={listRef} className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {podcast.turns.map((t, i) => (
            <li key={i} data-turn={i}>
              <button
                onClick={() => speakFrom(i)}
                className={`w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition ${i === index ? "bg-accent-soft" : "hover:bg-sunk"}`}
              >
                <span className={`mr-1.5 text-xs font-bold uppercase ${t.speaker === "host" ? "text-blue" : "text-accent"}`}>{t.speaker}</span>
                {t.text}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </Panel>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="shrink-0 border-b border-line bg-card/60 px-4 py-3">{children}</div>;
}
