import { runCli } from "../utils.js";

describe("exits with non-zero code when input has a syntax error", () => {
  runCli("with-shebang", [
    "--parser",
    "babel",
  ], {
    input: "a.2",
  }).test({
    status: 1,
  });
});
