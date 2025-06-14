import { runCli } from "../utils.js";

describe("flush all line-suffix content", () => {
  runCli("plugin-flush-line-suffix", [
    "*.foo",
    "--plugin=./plugin.cjs",
  ], {
    ignoreLineEndings: true,
  }).test({
    stdout: "contents",
    stderr: "",
    status: 0,
    write: [],
  });
});
