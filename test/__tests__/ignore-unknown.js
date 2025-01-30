import { runCli } from "../utils";

describe("ignore-unknown dir", () => {
  runCli("ignore-unknown", [
    ".",
    "--ignore-unknown",
    "--list-different",
  ]).test({
    status: "non-zero",
    stderr: "",
    write: [],
  });
});

describe("ignore-unknown alias", () => {
  runCli("ignore-unknown", [".", "-u", "--list-different"]).test({
    status: "non-zero",
    stderr: "",
    write: [],
  });
});

describe("ignore-unknown pattern", () => {
  runCli("ignore-unknown", [
    "*",
    "--ignore-unknown",
    "--list-different",
  ]).test({
    status: "non-zero",
    stderr: "",
    write: [],
  });
});

describe("ignore-unknown check", () => {
  runCli("ignore-unknown", [".", "--ignore-unknown", "--check"]).test({
    status: 1,
  });
});

describe("None exist file", () => {
  runCli("ignore-unknown", ["non-exist-file", "--ignore-unknown"]).test({
    status: 1,
  });
});

describe("Not matching pattern", () => {
  runCli("ignore-unknown", [
    "*.non-exist-pattern",
    "--ignore-unknown",
  ]).test({
    status: 1,
  });
});

describe("Ignored file", () => {
  runCli("ignore-unknown", ["ignored.js", "--ignore-unknown"]).test({
    status: 0,
  });
});
