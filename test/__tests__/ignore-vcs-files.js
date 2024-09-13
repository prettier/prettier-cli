import { runCli } from "../utils";

describe("ignores files in version control systems, if discovered", () => {
  runCli("ignore-vcs-files", [
    "**/file.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("does not ignore files in version control systems, if manually provided", () => {
  runCli("ignore-vcs-files", [
    ".svn/file.js",
    ".hg/file.js",
    "file.js",
    "-l",
  ]).test({
    status: 1,
  });
});
