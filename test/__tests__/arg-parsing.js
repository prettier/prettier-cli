import { runCli } from "../utils";

describe("boolean flags do not swallow the next argument", () => {
  runCli("arg-parsing", [
    "--end-of-line",
    "lf",
    "--single-quote",
    "file.js",
  ]).test({
    status: 0,
  });
});

describe("negated options work", () => {
  runCli("arg-parsing", [
    "--end-of-line",
    "lf",
    "--no-semi",
    "file.js",
  ]).test({
    status: 0,
  });
});

describe("unknown options are errored", () => {
  runCli("arg-parsing", [
    "--end-of-line",
    "lf",
    "file.js",
    "--unknown",
  ]).test({
    status: 1,
  });
});

describe("unknown negated options are errored", () => {
  runCli("arg-parsing", [
    "--end-of-line",
    "lf",
    "file.js",
    "--no-unknown",
  ]).test({
    status: 1,
  });
});

describe("unknown options may trigger a suggestion `_`", () => {
  runCli("arg-parsing", [
    "file.js",
    "-a",
  ]).test({
    status: 1,
    write: [],
  });
});

describe("allow overriding flags", () => {
  runCli("arg-parsing", [
    "--tab-width=1",
    "--tab-width=3",
    "--parser=babel",
  ], {
    input: "function a() { b }",
  }).test({
    stdout: "function a() {\n   b;\n}",
    status: 0,
  });
});

describe("number file/dir", () => {
  const patterns = ["1", "2.2", "3", "4.44"];
  for (const pattern of patterns) {
    runCli("arg-parsing/number", [
      "--parser=babel",
      "--list-different",
      pattern,
    ]).test({
      stderr: "",
      status: 1,
      write: [],
    });
  }
  runCli("arg-parsing/number", [
    "--parser=babel",
    "--list-different",
    ...patterns,
  ]).test({
    stderr: "",
    status: 1,
    write: [],
  });
});

describe.skip("options with `cliName` should not allow to pass directly", () => {
  // `filepath` can only pass through `--stdin-filepath`
  // `plugins` works the same
  runCli("arg-parsing", [
    "--stdin-filepath",
    "file.js",
  ], {
    isTTY: false,
    input: "prettier()",
  }).test({
    status: 0,
    stderr: "",
    write: [],
  });
  runCli("arg-parsing", [
    "--filepath",
    "file.js",
  ], {
    isTTY: false,
    input: "prettier()",
  }).test({
    status: 2,
    write: [],
  });
});
