import { runCli } from "../utils";

describe("no error on unmatched pattern", () => {
  runCli("error-on-unmatched-pattern", [
    "--no-error-on-unmatched-pattern",
    "**/*.js",
  ]).test({
    status: 0,
  });
});

describe("error on unmatched pattern", () => {
  runCli("error-on-unmatched-pattern", [
    "**/*.toml",
  ]).test({
    status: 1,
  });
});

describe("no error on unmatched pattern when 2nd glob has no match, with flag", () => {
  runCli("error-on-unmatched-pattern", [
    "--no-error-on-unmatched-pattern",
    "**/*.{json,js,yml}",
    "**/*.toml",
  ]).test({
    status: 0,
  });
});

describe("error on unmatched pattern when 2nd glob has no match, by default", () => {
  runCli("error-on-unmatched-pattern", [
    "**/*.{json,js,yml}",
    "**/*.toml",
  ]).test({
    status: 0,
  });
});
