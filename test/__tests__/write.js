import { runCli } from "../utils.js";

//TODO: Align the output for the following tests

describe.skip("write file with --write + unformatted file", () => {
  runCli("write", [
    "--write",
    "unformatted.js",
  ]).test({
    status: 0,
  });
});

describe.skip("write file with -w + unformatted file", () => {
  runCli("write", [
    "-w",
    "unformatted.js",
  ]).test({
    status: 0,
  });
});

describe.skip("do not write file with --write + formatted file", () => {
  runCli("write", [
    "--write",
    "formatted.js",
  ]).test({
    write: [],
    status: 0,
  });
});

describe.skip("do not write file with --write + invalid file", () => {
  runCli("write", [
    "--write",
    "invalid.js",
  ]).test({
    write: [],
    status: "non-zero",
  });
});
