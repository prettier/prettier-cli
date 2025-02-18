import { runCli } from "../utils";

describe("Line breaking after filepath with errors", () => {
  runCli("print-code", ["./ignored.js"], {
    stdoutIsTTY: true,
  }).test({ status: 0, write: [], stderr: "" });
  runCli("print-code", ["./not-ignored.js"], {
    stdoutIsTTY: true,
  }).test({ status: 0, write: [], stderr: "" });
});
