import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const pkg = require("prettier/package.json");

const PRETTIER_VERSION = pkg.version;
const CLI_VERSION = "0.1.2"; //TODO: Hard-coding this is error-prone

export { PRETTIER_VERSION, CLI_VERSION };
