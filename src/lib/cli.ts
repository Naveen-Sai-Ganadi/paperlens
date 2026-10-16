import spawn from "cross-spawn"; // starts .cmd shims on Windows with correct argument quoting
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Runs the user's own, officially installed Claude Code / Codex CLIs so requests
 * use the subscription they signed in with (`claude` / `codex login`). PaperLens
 * never reads or stores their tokens — the official clients handle auth.
 *
 * Only available when the app runs on the user's machine (desktop app or dev).
 */
export const LOCAL_MODE = process.env.PAPERLENS_LOCAL === "1" || process.env.NODE_ENV === "development";

export type CliKind = "claude-code" | "codex";

/**
 * The desktop app sets a per-launch token and its window adds it to every request,
 * so other programs or websites can't use the localhost server to spend the
 * user's subscription.
 */
export function assertLocalCaller(req: Request) {
  const token = process.env.PAPERLENS_TOKEN;
  if (token && req.headers.get("x-paperlens-token") !== token) throw new Error("Request not from the PaperLens app.");
}

const TIMEOUT_MS = 6 * 60_000;

// If an API key is in the environment the CLIs would bill it instead of the subscription.
function cliEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^(ANTHROPIC|OPENAI)_API_KEY/.test(k) || k === "ANTHROPIC_AUTH_TOKEN") delete env[k];
  return env;
}

type RunResult = { code: number | null; stdout: string; stderr: string };

function run(bin: string, args: string[], { stdin, cwd, onStdout }: { stdin?: string; cwd?: string; onStdout?: (s: string) => void } = {}) {
  return new Promise<RunResult>((resolve, reject) => {
    const child = spawn(bin, args, { cwd, env: cliEnv(), stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), TIMEOUT_MS);
    child.stdout!.on("data", (d: Buffer) => {
      const s = d.toString();
      stdout += s;
      onStdout?.(s);
    });
    child.stderr!.on("data", (d: Buffer) => (stderr += d.toString()));
    child.on("error", (err: NodeJS.ErrnoException) =>
      reject(err.code === "ENOENT" ? new Error(`${bin} is not installed or not on PATH.`) : err),
    );
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.stdin!.end(stdin ?? "");
  });
}

export type CliStatus = { installed: boolean; signedIn: boolean; detail: string };

export async function cliStatus(kind: CliKind): Promise<CliStatus> {
  try {
    if (kind === "codex") {
      const r = await run("codex", ["login", "status"]);
      const out = (r.stdout + r.stderr).trim();
      return { installed: true, signedIn: r.code === 0 && /logged in/i.test(out), detail: out.split("\n")[0] };
    }
    const r = await run("claude", ["auth", "status"]);
    const out = (r.stdout + r.stderr).trim();
    let signedIn = r.code === 0;
    try {
      signedIn = Boolean(JSON.parse(out).loggedIn ?? signedIn);
    } catch {
      // Older versions print plain text.
    }
    return { installed: true, signedIn, detail: out.split("\n")[0] };
  } catch (e) {
    return { installed: false, signedIn: false, detail: (e as Error).message };
  }
}

function cliError(kind: CliKind, r: RunResult) {
  const raw = (r.stderr || r.stdout).trim();
  const msg = raw.match(/"message":"([^"]+)"/)?.[1] ?? raw.split("\n").filter(Boolean).slice(-1)[0] ?? `exit code ${r.code}`;
  if (/not logged in|login|authenticat/i.test(msg)) {
    return new Error(`${kind === "codex" ? "Codex" : "Claude Code"} isn't signed in. Run \`${kind === "codex" ? "codex login" : "claude"}\` in a terminal first.`);
  }
  return new Error(`${kind === "codex" ? "Codex" : "Claude Code"} failed: ${msg.slice(0, 400)}`);
}

const CLAUDE_BASE = [
  "-p",
  "--tools", "", // no file/shell/web access: it only reads what we pipe in
  "--no-session-persistence",
  "--setting-sources", "", // ignore the user's hooks/plugins/settings
  "--strict-mcp-config",
];

/** One request through the CLI. With `schema`, returns parsed JSON matching it. */
export async function cliGenerate(
  kind: CliKind,
  { model, system, prompt, schema }: { model?: string; system: string; prompt: string; schema?: object },
): Promise<string | unknown> {
  if (kind === "claude-code") {
    const args = [...CLAUDE_BASE, "--output-format", "json", "--system-prompt", system];
    if (model) args.push("--model", model);
    if (schema) args.push("--json-schema", JSON.stringify(schema));
    args.push("Follow the instructions in the input.");
    const r = await run("claude", args, { stdin: prompt });
    let out: { is_error?: boolean; result?: string; structured_output?: unknown };
    try {
      out = JSON.parse(r.stdout);
    } catch {
      throw cliError(kind, r);
    }
    if (r.code !== 0 || out.is_error) throw cliError(kind, { ...r, stderr: out.result ?? r.stderr });
    return schema ? (out.structured_output ?? JSON.parse(out.result ?? "")) : (out.result ?? "");
  }

  const dir = await mkdtemp(join(tmpdir(), "paperlens-"));
  try {
    const outFile = join(dir, "out.txt");
    const args = ["exec", "--skip-git-repo-check", "--ephemeral", "-s", "read-only", "-o", outFile];
    if (model) args.push("-m", model);
    if (schema) {
      await writeFile(join(dir, "schema.json"), JSON.stringify(strictSchema(schema)));
      args.push("--output-schema", join(dir, "schema.json"));
    }
    args.push("-");
    const r = await run("codex", args, {
      cwd: dir,
      stdin: `${system}\n\nDo not run any commands or read files; answer only from the text below.\n\n${prompt}`,
    });
    const text = await readFile(outFile, "utf8").catch(() => "");
    if (r.code !== 0 || !text) throw cliError(kind, r);
    return schema ? JSON.parse(text) : text;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Streams plain text. Claude Code streams token deltas; Codex returns the answer in one piece. */
export function cliStream(kind: CliKind, opts: { model?: string; system: string; prompt: string }): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        if (kind === "codex") {
          controller.enqueue(enc.encode(String(await cliGenerate(kind, opts))));
          return controller.close();
        }
        const args = [...CLAUDE_BASE, "--output-format", "stream-json", "--verbose", "--include-partial-messages", "--system-prompt", opts.system];
        if (opts.model) args.push("--model", opts.model);
        args.push("Follow the instructions in the input.");
        let buf = "";
        let sent = false;
        const r = await run("claude", args, {
          stdin: opts.prompt,
          onStdout: (chunk) => {
            buf += chunk;
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              try {
                const ev = JSON.parse(line);
                const delta = ev.type === "stream_event" && ev.event?.delta?.type === "text_delta" ? ev.event.delta.text : null;
                if (delta) {
                  sent = true;
                  controller.enqueue(enc.encode(delta));
                }
              } catch {
                // partial or non-JSON line
              }
            }
          },
        });
        if (!sent && r.code !== 0) throw cliError(kind, r);
        controller.close();
      } catch (e) {
        controller.enqueue(enc.encode(`⚠️ ${(e as Error).message}`));
        controller.close();
      }
    },
  });
}

/** OpenAI strict structured outputs require additionalProperties:false on every object. */
function strictSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(strictSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node)) if (k !== "$schema") out[k] = strictSchema(v);
  if (out.type === "object") out.additionalProperties = false;
  return out;
}
