import { runCli } from "../utils.js";

describe("ignores file name contains emoji", () => {
  runCli("ignore-emoji", [
    "**/*.js",
    "-l",
  ]).test({
    status: 1,
  });
});

// TODO (43081j): re-enable once we fix #21
describe.skip("stdin", () => {
  runCli("ignore-emoji", [
    "--stdin-filepath",
    "ignored/我的样式.css",
  ], {
    input: ".name {                         display: none; }",
  }).test({
    status: 0,
  });
});
