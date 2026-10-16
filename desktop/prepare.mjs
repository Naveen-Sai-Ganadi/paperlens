// Next's standalone output leaves out static assets; copy them next to server.js.
import { cpSync, existsSync } from "node:fs";

const out = ".next/standalone";
if (!existsSync(`${out}/server.js`)) throw new Error("Run `next build` first (output: standalone).");
cpSync(".next/static", `${out}/.next/static`, { recursive: true });
if (existsSync("public")) cpSync("public", `${out}/public`, { recursive: true });
console.log("Desktop server bundle ready in", out);
