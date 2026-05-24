import { runCli } from "../utils";

describe("write file with --write + unformatted file", () => {
  runCli("write", ["--write", "unformatted.js"]).test({
    status: 0,
  });
});

describe("write file with -w + unformatted file", () => {
  runCli("write", ["-w", "unformatted.js"]).test({
    status: 0,
  });
});

describe("do not write file with --write + formatted file", () => {
  runCli("write", ["--write", "formatted.js"]).test({
    write: [],
    status: 0,
  });
});

describe("do not write file with --write + invalid file", () => {
  runCli("write", ["--write", "invalid.js"]).test({
    write: [],
    status: "non-zero",
  });
});
