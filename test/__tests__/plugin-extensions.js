import { runCli } from "../utils";

describe("uses 'extensions' from languages to determine parser", () => {
  runCli("plugin-extensions", [
    "*.foo",
    "--plugin=./plugin.cjs",
  ], {
    ignoreLineEndings: true,
  }).test({
    stdout: "!contents",
    stderr: "",
    status: 0,
    write: [],
  });
});
