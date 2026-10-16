// Serve pdf.js's worker as a static file. Bundlers don't reliably rewrite
// `new URL("pdfjs-dist/...", import.meta.url)`, and copying it from the installed
// package keeps the worker's version in lockstep with the library.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
// Resolve the copy react-pdf uses, in case several pdfjs-dist versions are installed.
const pdfjsDir = dirname(require.resolve("pdfjs-dist/package.json", { paths: [dirname(require.resolve("react-pdf"))] }));
mkdirSync("public", { recursive: true });
copyFileSync(join(pdfjsDir, "build", "pdf.worker.min.mjs"), join("public", "pdf.worker.min.mjs"));
console.log("Copied pdf.js worker to public/");
