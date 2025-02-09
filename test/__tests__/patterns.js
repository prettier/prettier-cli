import { runCli } from "../utils";

describe("multiple patterns", () => {
  runCli("patterns", [
    "directory/**/*.js",
    "other-directory/**/*.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("multiple patterns with an extra non-existent pattern", () => {
  runCli("patterns", [
    "directory/**/*.js",
    "non-existent.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("multiple patterns with a negated pattern", () => {
  runCli("patterns", [
    "**/*.js",
    "!**/nested-directory/**",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("multiple patterns with a negated pattern, ignores node_modules by default", () => {
  runCli("patterns", [
    "**/*.js",
    "!directory/**",
    "-l",
  ]).test({
    status: 1,
  });
});

// TODO: Handle leading `./` and `../` in patterns.
describe.skip("multiple patterns with a negated pattern and leading `./`, ignores node_modules by default", () => {
  runCli("patterns", [
    "./**/*.js",
    "!./directory/**",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("multiple patterns with a negated pattern, doesn't ignore node_modules with the --with-node-modules flag", () => {
  runCli("patterns", [
    "**/*.js",
    "!directory/**",
    "-l",
    "--with-node-modules",
  ]).test({
    status: 1,
  });
});

describe("exits with an informative message when there are no patterns provided", () => {
  runCli("patterns").test({
    status: 1,
  });
});

describe("multiple patterns, throws an error and exits with a non-zero code when there are no matches", () => {
  runCli("patterns", [
    "non-existent.js",
    "other-non-existent.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("file names with special characters", () => {
  runCli("patterns-special-characters/square-brackets", [
    "[with-square-brackets].js",
    "-l",
  ]).test({
    status: 1,
    write: [],
    stderr: "",
    stdout: "[with-square-brackets].js",
  });

  runCli("patterns-special-characters/dots", [
    "[...with-square-brackets-and-dots].js",
    "-l",
  ]).test({
    status: 1,
    write: [],
    stderr: "",
    stdout: "[...with-square-brackets-and-dots].js",
  });
});
