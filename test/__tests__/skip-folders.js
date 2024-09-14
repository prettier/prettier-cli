import { runCli } from "../utils";

describe("skips folders in glob", () => {
  runCli("skip-folders", [
    "**/*",
    "-l",
  ]).test({
    status: 1,
    stderr: "",
  });
});

describe("skip folders passed specifically", () => {
  runCli("skip-folders", [
    "a",
    "a/file.js",
    "b",
    "b/file.js",
    "-l",
  ]).test({
    status: 1,
    stderr: "",
  });
});
