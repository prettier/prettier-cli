import { runCli } from "../utils";
import { PRETTIER_VERSION } from "../../dist/constants.js";

describe("show version with --version", () => {
  runCli("with-shebang", [
    "--version",
  ]).test({
    stdout: PRETTIER_VERSION,
    status: 0,
  });
});

describe("show usage with --help", () => {
  it("shows help text", async () => {
    const result = await runCli("", [
      "--help",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout.replaceAll(PRETTIER_VERSION, "$VERSION")).toMatchSnapshot();
    expect(result.stderr).toMatchSnapshot();
    expect(result.write).toMatchSnapshot();
  });
});

describe("throw error with --check + --list-different", () => {
  runCli("", [
    "--check",
    "--list-different",
  ]).test({
    status: 1,
  });
});

describe("throw error with --check + --write", () => {
  runCli("", [
    "--check",
    "--write",
  ]).test({
    status: 1,
  });
});

describe("throw error with --list-different + --write", () => {
  runCli("", [
    "--list-different",
    "--write",
  ]).test({
    status: 1,
  });
});

describe("throw unsupported error with --file-info", () => {
  runCli("", [
    "--file-info",
    "abc.js",
    "def.js",
  ]).test({
    status: 1,
  });
});

describe("throw unsupported error with --find-config-path", () => {
  runCli("", [
    "--find-config-path",
    "abc.js",
    "def.js",
  ]).test({
    status: 1,
  });
});

describe("throw unsupported error with --support-info", () => {
  runCli("", [
    "--support-info",
    "abc.js",
    "def.js",
  ]).test({
    status: 1,
  });
});

describe("throw error with something unexpected", () => {
  runCli("", [], {
    isTTY: true,
  }).test({
    status: "non-zero",
  });
});
