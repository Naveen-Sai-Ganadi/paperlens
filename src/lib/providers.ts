export type Provider = "claude-code" | "codex" | "anthropic" | "openai";

export type ProviderInfo = {
  label: string;
  vendor: string;
  /** "subscription" runs through the user's signed-in official CLI (desktop app only). */
  kind: "subscription" | "api";
  models: { id: string; label: string }[];
  keyHint?: string;
  keyUrl?: string;
  setup?: { install: string; login: string };
};

export const PROVIDERS: Record<Provider, ProviderInfo> = {
  "claude-code": {
    label: "Claude",
    vendor: "Claude Pro / Max subscription",
    kind: "subscription",
    models: [
      { id: "sonnet", label: "Claude Sonnet (balanced)" },
      { id: "opus", label: "Claude Opus (deepest)" },
      { id: "haiku", label: "Claude Haiku (fastest)" },
    ],
    setup: { install: "npm install -g @anthropic-ai/claude-code", login: "claude" },
  },
  codex: {
    label: "ChatGPT",
    vendor: "ChatGPT Plus / Pro subscription",
    kind: "subscription",
    models: [
      { id: "gpt-5.6-sol", label: "GPT-5.6 Sol" },
      { id: "", label: "Codex default" },
    ],
    setup: { install: "npm install -g @openai/codex", login: "codex login" },
  },
  anthropic: {
    label: "Claude",
    vendor: "Anthropic API key",
    kind: "api",
    models: [
      { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 (balanced)" },
      { id: "claude-opus-5-5", label: "Claude Opus 5.5 (deepest)" },
      { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 (fastest)" },
    ],
    keyHint: "sk-ant-…",
    keyUrl: "https://console.anthropic.com/settings/keys",
  },
  openai: {
    label: "ChatGPT",
    vendor: "OpenAI API key",
    kind: "api",
    models: [
      { id: "gpt-6.1-sol", label: "GPT-6.1 Sol" },
      { id: "gpt-5.6", label: "GPT-5.6" },
      { id: "gpt-5.5", label: "GPT-5.5" },
    ],
    keyHint: "sk-…",
    keyUrl: "https://platform.openai.com/api-keys",
  },
};
