import { runCli } from "../utils";

describe("--stdin-filepath discovers config on disk", () => {
  runCli("stdin-filepath-config", [
    "--stdin-filepath",
    "example.js",
  ], {
    input: `const x = "foo"`,
  }).test({
    status: 0,
    stdout: `const x = 'foo';`,
    stderr: "",
    write: [],
  });
});

describe("--stdin-filepath with a non-existent path still discovers ancestor config", () => {
  runCli("stdin-filepath-config", [
    "--stdin-filepath",
    "./non-existent-dir/non-existent-file.js",
  ], {
    input: `const x = "foo"`,
  }).test({
    status: 0,
    stdout: `const x = 'foo';`,
    stderr: "",
    write: [],
  });
});
