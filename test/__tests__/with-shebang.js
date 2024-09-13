import { runCli } from "../utils";

describe("preserves shebang", () => {
  runCli("with-shebang", [
    "--end-of-line",
    "lf",
    "issue1890.js",
  ]).test({
    status: 0,
  });
});
