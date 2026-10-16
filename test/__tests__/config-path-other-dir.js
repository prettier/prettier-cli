import { runCli } from "../utils";

describe("--config-path in another dir resolves override globs from the cwd", () => {
  runCli("config-path-other-dir", [
    "--config-path",
    "config/prettier.json",
    "src/foo.js",
  ]).test({
    status: 0,
    stdout: `const x = "foo"`,
    stderr: "",
    write: [],
  });
});
