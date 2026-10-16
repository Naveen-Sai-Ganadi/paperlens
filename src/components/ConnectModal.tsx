"use client";

import { Check, Copy, ExternalLink, KeyRound, Loader2, Monitor, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { postJSON, type Connection } from "@/lib/client";
import { PROVIDERS, type Provider } from "@/lib/providers";
import { Button } from "./ui";

type CliStatus = { installed: boolean; signedIn: boolean; detail: string };
type LocalStatus = { local: false } | { local: true; "claude-code": CliStatus; codex: CliStatus };

const SUBS: Provider[] = ["claude-code", "codex"];
const KEYS: Provider[] = ["anthropic", "openai"];

export function ConnectModal({
  current,
  onSave,
  onClose,
}: {
  current: Connection | null;
  onSave: (c: Connection | null) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"subscription" | "api">(current && PROVIDERS[current.provider].kind === "api" ? "api" : "subscription");
  const [provider, setProvider] = useState<Provider>(current?.provider ?? "claude-code");
  const [apiKey, setApiKey] = useState(current?.apiKey ?? "");
  const [model, setModel] = useState(current?.model ?? PROVIDERS[provider].models[0].id);
  const [status, setStatus] = useState<"idle" | "testing" | "error">("idle");
  const [error, setError] = useState("");
  const [local, setLocal] = useState<LocalStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      setLocal(await (await fetch("/api/connect/status")).json());
    } catch {
      setLocal({ local: false });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const pick = (p: Provider) => {
    setProvider(p);
    setModel(PROVIDERS[p].models[0].id);
    if (current?.provider !== p) setApiKey("");
    setStatus("idle");
    setError("");
  };

  const switchMode = (m: "subscription" | "api") => {
    setMode(m);
    pick(m === "subscription" ? "claude-code" : "anthropic");
  };

  const info = PROVIDERS[provider];
  const cli = local?.local && info.kind === "subscription" ? local[provider as "claude-code" | "codex"] : null;
  const canConnect = info.kind === "api" ? apiKey.trim().length > 0 : Boolean(cli?.installed && cli.signedIn);

  const connect = async () => {
    const conn: Connection = { provider, model, ...(info.kind === "api" ? { apiKey: apiKey.trim() } : {}) };
    setStatus("testing");
    setError("");
    try {
      await postJSON("/api/connect", {}, conn);
      onSave(conn);
      onClose();
    } catch (e) {
      setStatus("error");
      setError((e as Error).message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-full w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold">Connect your AI account</h2>
            <p className="mt-1 text-sm text-muted">PaperLens&apos;s agents run on your own Claude or ChatGPT account.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-sunk" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 rounded-lg border border-line bg-sunk p-1 text-sm">
          {(["subscription", "api"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex items-center justify-center gap-1.5 rounded-md py-1.5 font-medium ${mode === m ? "bg-card shadow-sm" : "text-muted"}`}
            >
              {m === "subscription" ? <Monitor size={14} /> : <KeyRound size={14} />}
              {m === "subscription" ? "My subscription" : "API key"}
            </button>
          ))}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3">
          {(mode === "subscription" ? SUBS : KEYS).map((p) => {
            const s = local?.local && PROVIDERS[p].kind === "subscription" ? local[p as "claude-code" | "codex"] : null;
            return (
              <button
                key={p}
                onClick={() => pick(p)}
                className={`relative rounded-xl border p-4 text-left transition ${provider === p ? "border-ink bg-sunk" : "border-line hover:bg-sunk/60"}`}
              >
                {provider === p && <Check size={16} className="absolute top-3 right-3" />}
                <div className="font-semibold">{PROVIDERS[p].label}</div>
                <div className="text-xs text-muted">{PROVIDERS[p].vendor}</div>
                {s && (
                  <div className={`mt-2 flex items-center gap-1.5 text-xs ${s.signedIn ? "text-good" : "text-muted"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${s.signedIn ? "bg-good" : "bg-muted"}`} />
                    {s.signedIn ? "Signed in" : s.installed ? "Not signed in" : "Not installed"}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {info.kind === "subscription" ? (
          <SubscriptionSetup local={local} cli={cli} provider={provider} checking={checking} onRefresh={refresh} />
        ) : (
          <>
            <label className="mb-1.5 block text-sm font-medium">API key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={info.keyHint}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 font-mono text-sm outline-none focus:border-ink"
            />
            <a href={info.keyUrl} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-blue hover:underline">
              Get a {info.label} API key <ExternalLink size={11} />
            </a>
            <p className="mt-2 text-xs text-muted">API keys are billed per use by {provider === "anthropic" ? "Anthropic" : "OpenAI"}, separately from a Claude or ChatGPT subscription.</p>
          </>
        )}

        <label className="mt-4 mb-1.5 block text-sm font-medium">Model</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        >
          {info.models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-sunk p-3 text-xs text-muted">
          <ShieldCheck size={15} className="mt-px shrink-0 text-good" />
          {info.kind === "subscription"
            ? `PaperLens asks the official ${provider === "codex" ? "Codex" : "Claude Code"} app on this computer to answer, with its tools switched off. Your login stays in that app; PaperLens never sees it. ${provider === "codex" ? "OpenAI's Codex" : "Anthropic's Claude Code"} terms apply.`
            : `Your key is stored only on this device and sent with each request straight to ${provider === "anthropic" ? "Anthropic" : "OpenAI"}.`}
        </div>

        {status === "error" && <p className="mt-3 rounded-lg bg-bad-soft p-2.5 text-sm text-bad">{error}</p>}

        <div className="mt-5 flex items-center justify-between">
          {current ? (
            <Button
              variant="ghost"
              onClick={() => {
                onSave(null);
                onClose();
              }}
              className="text-bad"
            >
              Disconnect
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={connect} disabled={!canConnect || status === "testing"}>
            {status === "testing" ? <Loader2 size={15} className="animate-spin" /> : null}
            {status === "testing" ? "Checking…" : "Test & connect"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SubscriptionSetup({
  local,
  cli,
  provider,
  checking,
  onRefresh,
}: {
  local: LocalStatus | null;
  cli: CliStatus | null;
  provider: Provider;
  checking: boolean;
  onRefresh: () => void;
}) {
  if (!local) return <div className="skeleton h-20 w-full" />;
  if (!local.local) {
    return (
      <div className="rounded-lg border border-line p-4 text-sm">
        <p className="font-semibold">Available in the PaperLens desktop app</p>
        <p className="mt-1 text-muted">Using your subscription needs the app on your own computer. On the web, use an API key instead.</p>
        <a href="/download" className="mt-2 inline-block font-medium text-blue hover:underline">Download the desktop app →</a>
      </div>
    );
  }
  const setup = PROVIDERS[provider].setup!;
  if (cli?.signedIn) {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-good-soft px-3 py-2.5 text-sm text-good">
        <Check size={15} /> {provider === "codex" ? "Codex" : "Claude Code"} is signed in on this computer.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-line p-4 text-sm">
      <p className="mb-3 font-semibold">One-time setup in Terminal</p>
      <ol className="space-y-3">
        {!cli?.installed && <Step n={1} label="Install" cmd={setup.install} />}
        <Step n={cli?.installed ? 1 : 2} label="Sign in with your subscription" cmd={setup.login} />
      </ol>
      <Button variant="outline" className="mt-4" onClick={onRefresh} disabled={checking}>
        <RefreshCw size={14} className={checking ? "animate-spin" : ""} /> I&apos;ve done this — check again
      </Button>
    </div>
  );
}

function Step({ n, label, cmd }: { n: number; label: string; cmd: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <li>
      <p className="mb-1 text-muted">
        {n}. {label}
      </p>
      <div className="flex items-center gap-2 rounded-md bg-ink px-3 py-2 font-mono text-xs text-paper">
        <span className="flex-1 truncate">{cmd}</span>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(cmd);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          aria-label="Copy command"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
    </li>
  );
}
