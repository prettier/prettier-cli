import { runCli } from "../utils";

describe("--config-path in another dir resolves override globs relative to the config file", () => {
  runCli("config-path-other-dir", [
    "--config-path",
    "config/prettier.json",
    "config/src/foo.js",
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
    "config/prettier.json",
    "src/foo.js",
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
    "config/prettier.json",
    "lib/foo.js",
  ]).test({
    status: 0,
    stdout: `const x = "foo"`,
    stderr: "",
    write: [],
  });
});
