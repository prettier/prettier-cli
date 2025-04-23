import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prettierPackage = require("prettier/package.json");
const cliPackage = require("@prettier/cli/package.json");

const PRETTIER_VERSION = prettierPackage.version;
const CLI_VERSION = cliPackage.version;

const DEFAULT_PARSERS = [
  "flow",
  "babel",
  "babel-flow",
  "babel-ts",
  "typescript",
  "acorn",
  "espree",
  "meriyah",
  "css",
  "less",
  "scss",
  "json",
  "json5",
  "jsonc",
  "json-stringify",
  "graphql",
  "markdown",
  "mdx",
  "vue",
  "yaml",
  "glimmer",
  "html",
  "angular",
  "lwc",
];

export { PRETTIER_VERSION, CLI_VERSION, DEFAULT_PARSERS };
