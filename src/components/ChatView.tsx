"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { authHeaders, type Connection, type OpenPaper, type Profile } from "@/lib/client";
import { Markdown } from "./Markdown";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Explain the main idea with a real-life analogy",
  "Draw a diagram of the architecture",
  "What would break if I removed the key component?",
  "How would I implement this in Python?",
];

export function ChatView({
  paper,
  connection,
  profile,
  requireConnect,
  inject,
}: {
  paper: OpenPaper;
  connection: Connection | null;
  profile: Profile;
  requireConnect: () => void;
  /** A question sent from elsewhere (e.g. text selected in the PDF); the nonce makes repeats send again. */
  inject?: { text: string; nonce: number } | null;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    if (!connection) return requireConnect();
    const history: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(connection) },
        body: JSON.stringify({
          messages: history,
          title: paper.title,
          text: paper.text,
          problem: profile.problem,
          level: profile.level,
          language: profile.language,
        }),
      });
      if (!res.ok || !res.body) throw new Error((await res.json().catch(() => ({}))).error ?? `Request failed (${res.status})`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: acc }]);
      }
      if (!acc) throw new Error("The model returned an empty response. Check your key and model.");
    } catch (e) {
      setMessages([...history, { role: "assistant", content: `⚠️ ${(e as Error).message}` }]);
    } finally {
      setStreaming(false);
    }
  };

  const lastInjected = useRef(0);
  useEffect(() => {
    if (inject && inject.nonce !== lastInjected.current) {
      lastInjected.current = inject.nonce;
      void send(inject.text);
    }
    // send is recreated every render; only a new injection should trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inject]);

  return (
    <div className="flex min-h-[60vh] flex-col">
      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="rounded-xl border border-line bg-card p-5">
            <p className="font-serif text-lg font-semibold">Ask anything about this paper</p>
            <p className="mt-1 text-sm text-muted">The agent has read the whole paper and knows the problem you&apos;re working on.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-lg border border-line px-3 py-2 text-left text-sm hover:border-ink hover:bg-sunk">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-4 py-2.5 text-sm text-paper">
              {m.content}
            </div>
          ) : (
            <div key={i} className="rounded-2xl rounded-bl-sm border border-line bg-card px-4 py-3">
              {m.content ? <Markdown>{m.content}</Markdown> : <Loader2 size={16} className="animate-spin text-muted" />}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-0 mt-4 flex items-end gap-2 rounded-2xl border border-line bg-card p-2 shadow-lg"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          placeholder="Ask a follow-up question…"
          className="max-h-40 min-h-[2.5rem] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
        />
        <button type="submit" disabled={streaming || !input.trim()} className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white disabled:opacity-40" aria-label="Send">
          {streaming ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
        </button>
      </form>
    </div>
  );
}
