import { runCli } from "../utils";

describe("--config-path in another dir resolves override globs relative to the config file", () => {
  runCli("config-path-other-dir", [
    "--config-path",
    "config-dir/prettier.json",
    "config-dir/a-dir/foo.js",
  ]).test({
    status: 0,
    stdout: `const x = "foo"`,
    stderr: "",
    write: [],
  });
});

describe("--config-path in another dir does not resolve override globs relative to the cwd", () => {
  runCli("config-path-other-dir", [
    "--config-path",
    "config-dir/prettier.json",
    "a-dir/foo.js",
  ]).test({
    status: 0,
    stdout: `const x = "foo";`,
    stderr: "",
    write: [],
  });
});

describe("--config-path in another dir resolves override globs pointing outside the config dir", () => {
  runCli("config-path-other-dir", [
    "--config-path",
    "config-dir/prettier.json",
    "b-dir/foo.js",
  ]).test({
    status: 0,
    stdout: `const x = "foo"`,
    stderr: "",
    write: [],
  });
});
