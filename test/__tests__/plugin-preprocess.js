import { runCli } from "../utils";

describe("parser preprocess function is used to reshape input text", () => {
  runCli("plugin-preprocess", [
    "*.foo",
    "--plugin=./plugin.cjs",
  ], {
    ignoreLineEndings: true,
  }).test({
    stdout: "preprocessed:contents",
    stderr: "",
    status: 0,
    write: [],
  });
});
