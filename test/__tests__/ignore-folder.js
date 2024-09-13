import { runCli } from "../utils";

describe("ignores files in ignored folders", () => {
  runCli("ignore-folder", [
    "**/*.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("ignores ignore files when processing stdin", () => {
  runCli("ignore-folder", [
    "--stdin-filepath",
    "ignored/我的样式.css",
  ], {
    input: ".name {                         display: none; }",
  }).test({
    status: 0,
  });
});
