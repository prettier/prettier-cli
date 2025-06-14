import { runCli } from "../utils";
import { color } from "specialist";

describe("stdin no path and no parser", () => {
  describe("logs error and exits with 2", () => {
    runCli("infer-parser", [], {
      input: "foo"
    }).test({
      status: 1,
      stdout: "",
      write: [],
    });
  });

  // TODO (43081j): in prettier, this tests that it exits with 0 for
  // whatever reason. should we do the same?
  describe("--check logs error but exits with 1", () => {
    runCli("infer-parser", [
      "--check"
    ], {
      input: "foo",
    }).test({
      status: 1,
      stdout: "",
      write: [],
    });
  });

  // TODO (43081j): in prettier, this tests that it exits with 0 for
  // whatever reason. should we do the same?
  describe("--list-different logs error but exits with 1", () => {
    runCli("infer-parser", ["--list-different"], {
      input: "foo",
    }).test({
      status: 1,
      stdout: "",
      write: [],
    });
  });
});

describe("stdin with unknown path and no parser", () => {
  describe("logs error and exits with 2", () => {
    runCli("infer-parser", [
      "--stdin-filepath",
      "foo"
    ], {
      input: "foo",
    }).test({
      status: 1,
      stdout: "",
      write: [],
    });
  });

  // TODO (43081j): in prettier, this tests that it exits with 0 for
  // whatever reason. should we do the same?
  describe("--check logs error but exits with 1", () => {
    runCli("infer-parser", [
      "--check",
      "--stdin-filepath",
      "foo"
    ], {
      input: "foo",
    }).test({
      status: 1,
      stdout: "",
      write: [],
    });
  });

  // TODO (43081j): in prettier, this tests that it exits with 0 for
  // whatever reason. should we do the same?
  describe("--list-different logs error but exits with 1", () => {
    runCli("infer-parser", [
      "--list-different",
      "--stdin-filepath",
      "foo"
    ], {
      input: "foo"
    }).test({
      status: 1,
      stdout: "",
      write: [],
    });
  });
});

describe("unknown path and no parser", () => {
  describe("specific file is ignored", () => {
    runCli("infer-parser", [
      "--end-of-line",
      "lf",
      "FOO"
    ]).test({
      status: 0,
      stdout: "",
      write: [],
    });
  });

  describe("multiple files are ignored", () => {
    runCli("infer-parser", [
      "--end-of-line",
      "lf",
      "*"
    ]).test({
      status: 1,
      write: [],
    });
  });
});

describe("--check with unknown path and no parser", () => {
  describe("specific file is ignored", () => {
    runCli("infer-parser", [
      "--check",
      "FOO"
    ]).test({
      status: 0,
      write: [],
    });
  });

  describe("multiple files", () => {
    runCli("infer-parser", [
      "--check",
      "*"
    ]).test({
      status: 1,
      write: [],
      stderr: `[${color.red('error')}] FOO: UndefinedParserError: No parser could be inferred for file "$CWD/FOO".
[${color.yellow('warn')}] foo.js
[${color.yellow('warn')}] Code style issues found in 1 file. Run Prettier with --write to fix.`
    });
  });
});

describe("--list-different with unknown path and no parser", () => {
  describe("specific file should be ignored", () => {
    runCli("infer-parser", [
      "--list-different",
      "FOO"
    ]).test({
      status: 0,
      stdout: "",
      write: [],
    });
  });

  describe("multiple files", () => {
    runCli("infer-parser", [
      "--list-different",
      "*"
    ]).test({
      status: 1,
      stdout: "foo.js",
      write: [],
    });
  });
});

describe("--write with unknown path and no parser", () => {
  describe("specific file should be ignored", () => {
    runCli("infer-parser", [
      "--write",
      "FOO"
    ]).test({
      status: 0,
      stdout: "",
      write: [],
    });
  });

  describe("multiple files", () => {
    runCli("infer-parser", [
      "--write",
      "*"
    ]).test({
      status: 1,
      stderr: `[${color.red('error')}] FOO: UndefinedParserError: No parser could be inferred for file "$CWD/FOO".`,
    });
  });
});

describe("Known/Unknown", () => {
  runCli("infer-parser/known-unknown", [
    "--end-of-line",
    "lf",
    "--list-different",
    ".",
  ]).test({
    status: 1,
    stderr: "",
    write: [],
  });
});
