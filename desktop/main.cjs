/* eslint-disable @typescript-eslint/no-require-imports -- Electron main process is CommonJS */
// PaperLens desktop shell: runs the bundled Next.js server on localhost and
// opens it in a window. Running locally is what lets the app use the user's own
// signed-in Claude Code / Codex CLIs (their subscriptions).
const { app, BrowserWindow, shell, session } = require("electron");
const { spawn, execFileSync } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const net = require("node:net");
const path = require("node:path");

let server;

/** Apps launched from Finder get a minimal PATH; borrow the login shell's so `claude`/`codex` resolve. */
function loginShellPath() {
  if (process.platform === "win32") return process.env.PATH; // Windows apps already get the user's PATH
  try {
    const shellBin = process.env.SHELL || "/bin/zsh";
    const out = execFileSync(shellBin, ["-ilc", 'printf "__PATH__%s__PATH__" "$PATH"'], { encoding: "utf8", timeout: 5000 });
    const m = out.match(/__PATH__(.*)__PATH__/);
    if (m) return m[1];
  } catch {
    // fall through
  }
  return [process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin", path.join(process.env.HOME || "", ".local/bin")].filter(Boolean).join(path.delimiter);
}

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("PaperLens server did not start");
}

async function start() {
  const port = await freePort();
  // Per-launch secret: only this window can trigger subscription requests, not other local apps or websites.
  const token = randomBytes(24).toString("hex");
  const origin = `http://127.0.0.1:${port}`;
  const serverDir = app.isPackaged ? path.join(process.resourcesPath, "server") : path.join(__dirname, "..", ".next", "standalone");

  server = spawn(process.execPath, [path.join(serverDir, "server.js")], {
    cwd: serverDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      PATH: loginShellPath(),
      PAPERLENS_LOCAL: "1",
      PAPERLENS_TOKEN: token,
    },
    stdio: "inherit",
  });
  server.on("exit", (code) => {
    if (code && !app.isQuitting) app.quit();
  });

  // URL filters can't include a port, so match the host and check the origin here.
  session.defaultSession.webRequest.onBeforeSendHeaders({ urls: ["http://127.0.0.1/*"] }, (details, cb) => {
    if (details.url.startsWith(`${origin}/`)) details.requestHeaders["x-paperlens-token"] = token;
    cb({ requestHeaders: details.requestHeaders });
  });

  await waitForServer(origin);

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "PaperLens",
    ...(process.platform === "darwin" ? { titleBarStyle: "hiddenInset", trafficLightPosition: { x: 14, y: 20 } } : {}),
    backgroundColor: "#f5f1e8",
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  // Links (arXiv pages, API key consoles) open in the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(origin)) {
      e.preventDefault();
      void shell.openExternal(url);
    }
  });
  await win.loadURL(`${origin}/?desktop=1`);
}

app.whenReady().then(start).catch((err) => {
  console.error(err);
  app.quit();
});

app.on("before-quit", () => {
  app.isQuitting = true;
  server?.kill();
});
app.on("window-all-closed", () => app.quit());
