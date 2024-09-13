import { runCli } from "../utils";

describe("checks stdin with --list-different", () => {
  runCli("with-shebang", [
    "--list-different",
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

describe("checks stdin with -l (alias for --list-different)", () => {
  runCli("with-shebang", [
    "-l",
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

//TODO: force CI-mode for the test below, which the current CLI dosn't really have
describe("--list-different works in CI just as in a non-TTY mode", () => {
  const result0 = runCli("write", [
    "--list-different",
    "formatted.js",
    "unformatted.js",
  ]).test({
    status: 1,
  });

  const result1 = runCli("write", [
    "--list-different",
    "formatted.js",
    "unformatted.js",
  ]).test({
    status: 1,
  });

  test("Should be the same", async () => {
    expect(await result0.stdout).toEqual(await result1.stdout);
  });
});
