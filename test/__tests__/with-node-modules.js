import { runCli } from "../utils.js";

describe("ignores node_modules by default", () => {
  runCli("with-node-modules", [
    "**/*.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("ignores node_modules by with ./**/*.js", () => {
  runCli("with-node-modules", [
    "./**/*.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("doesn't ignore node_modules with --with-node-modules flag", () => {
  runCli("with-node-modules", [
    "**/*.js",
    "-l",
    "--with-node-modules",
  ]).test({
    status: 1,
  });
});

describe("does not ignore node_modules for manual file list", () => {
  runCli("with-node-modules", [
    "node_modules/node-module.js",
    "not_node_modules/file.js",
    "nested/node_modules/node-module.js",
    "regular-module.js",
    "-l",
  ]).test({
    status: 1,
  });
});
