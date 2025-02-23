import esbuild from "esbuild";
import path from "node:path";
import url from "node:url";
import fs from "node:fs/promises";

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

const BIN_FILE = new URL("../dist/bin.js", import.meta.url);
const content = await fs.readFile(BIN_FILE, "utf8");
await fs.writeFile(BIN_FILE, content.replaceAll("../src/prettier_serial.js", "./prettier_serial.js"));
