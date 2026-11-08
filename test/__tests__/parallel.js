import { runCli } from "../utils";

describe("files are processed when parallelism is left at its defaults", () => {
  runCli("write", [
    "--list-different",
    "formatted.js",
    "unformatted.js",
    "unformatted2.js",
  ], {
    parallel: true,
  }).test({
    stdout: "unformatted.js\nunformatted2.js",
    stderr: "",
    status: 1,
    write: [],
  });
});

describe("files are processed when an explicit worker count is given", () => {
  runCli("write", [
    "--parallel-workers",
    "2",
    "--list-different",
    "formatted.js",
    "unformatted.js",
    "unformatted2.js",
  ], {
    parallel: true,
  }).test({
    stdout: "unformatted.js\nunformatted2.js",
    stderr: "",
    status: 1,
    write: [],
  });
});

describe("parallel mode works when an environment variable contains a replacement pattern", () => {
  runCli("write", [
    "--list-different",
    "formatted.js",
    "unformatted.js",
    "unformatted2.js",
  ], {
    parallel: true,
    env: { PRETTIER_CLI_TEST_ENV: "abc$`def" },
  }).test({
    stdout: "unformatted.js\nunformatted2.js",
    stderr: "",
    status: 1,
    write: [],
  });
});

describe("parallel mode keeps the error name, so ignore-unknown still works", () => {
  runCli(
    "ignore-unknown",
    [".", "--ignore-unknown", "--list-different"],
    { parallel: true },
  ).test({
    status: "non-zero",
    stderr: "",
    write: [],
  });
});
