import { runCli } from "../utils";
import { PRETTIER_VERSION } from "../../dist/constants.js";

describe("show version with --version", () => {
  runCli("with-shebang", ["--version"]).test({
    stdout: PRETTIER_VERSION,
    status: 0,
  });
});

describe("show usage with --help", () => {
  runCli("", ["--help"]).test({
    status: 0,
  });
});

describe("throw error with --check + --list-different", () => {
  runCli("", ["--check", "--list-different"]).test({
    status: 1,
  });
});

describe("throw unsupported error with --file-info", () => {
  runCli("", ["--file-info", "abc.js", "def.js"]).test({
    status: 1,
  });
});

describe("throw error with something unexpected", () => {
  runCli("", [], { isTTY: true }).test({
    status: "non-zero",
  });
});
