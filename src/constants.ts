import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prettierPackage = require("prettier/package.json");
const cliPackage = require("@prettier/cli/package.json");

const PRETTIER_VERSION = prettierPackage.version;
const CLI_VERSION = cliPackage.version;
const IS_BUN = !!process.versions["bun"];

export { PRETTIER_VERSION, CLI_VERSION, IS_BUN };
