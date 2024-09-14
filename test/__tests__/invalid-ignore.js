import { runCli } from "../utils";

describe("ignores .prettierignore folder", () => {
  runCli("invalid-ignore", [
    "something.js",
  ]).test({
    status: 0
  });
});
