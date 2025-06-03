import { runCli } from "../utils.js";

describe("ignores .prettierignore folder", () => {
  runCli("invalid-ignore", [
    "something.js",
  ]).test({
    status: 0
  });
});
