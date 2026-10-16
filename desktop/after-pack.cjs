/* eslint-disable @typescript-eslint/no-require-imports -- runs under electron-builder (CommonJS) */
// electron-builder drops node_modules and dot-folders from extraResources, both of
// which Next's standalone server needs, so copy the bundle in after packaging.
const { cpSync } = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const resources =
    context.electronPlatformName === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources");
  cpSync(path.join(context.packager.projectDir, ".next", "standalone"), path.join(resources, "server"), { recursive: true, verbatimSymlinks: true });
};
