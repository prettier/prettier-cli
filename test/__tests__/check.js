import { runCli } from "../utils.js";

describe("checks stdin with --check", () => {
  runCli("with-shebang", [
    "--check",
    "--parser",
    "babel",
  ], {
    input: "0",
  }).test({
    stdout: "(stdin)",
    stderr: "",
    status: "non-zero",
  });
});

describe("checks stdin with -c (alias for --check)", () => {
  runCli("with-shebang", [
    "-c",
    "--parser",
    "babel",
  ], {
    input: "0",
  }).test({
    stdout: "(stdin)",
    stderr: "",
    status: "non-zero",
  });
});

describe("--checks works in CI just as in a non-TTY mode", () => {
  const result0 = runCli("write", [
    "--check",
    "formatted.js",
    "unformatted.js",
  ]).test({
    status: 1,
  });

  const result1 = runCli("write", [
    "--check",
    "formatted.js",
    "unformatted.js",
  ], {
    tty: false, //TODO: actually implement this, read .isTTY via a env-mockable module
  }).test({
    status: 1,
  });

  test("Should have same stdout", async () => {
    expect(await result0.stdout).toEqual(await result1.stdout);
  });
});

describe("--checks should print the number of files that need formatting", () => {
  runCli("write", [
    "--check",
    "unformatted.js",
    "unformatted2.js",
  ], {
    input: "0",
  }).test({
    status: 1,
  });
});
