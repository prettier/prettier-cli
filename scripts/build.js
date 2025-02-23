import esbuild from "esbuild";
import path from "node:path";
import url from "node:url";

const toPath = (file) => url.fileURLToPath(new URL(file, import.meta.url));

await esbuild.build({
  entryPoints: [toPath("../src/bin.ts"), toPath("../src/prettier_serial.ts")],
  bundle: true,
  platform: "node",
  target: "node14",
  outdir: toPath("../dist/"),
  format: "esm",
  banner: {
    js: `
import { createRequire as __prettierCliCreateRequire } from 'node:module';
var require = __prettierCliCreateRequire(import.meta.url);
    `.trim(),
  },
  external: ["prettier", "./src/prettier_serial.js"],
  legalComments: "none",
});
