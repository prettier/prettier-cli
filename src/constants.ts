import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prettierPackage = require("prettier/package.json");
const cliPackage = require("@prettier/cli/package.json");

const PRETTIER_VERSION = prettierPackage.version;
const CLI_VERSION = cliPackage.version;

export { PRETTIER_VERSION, CLI_VERSION };
