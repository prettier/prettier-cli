import { runCli } from "../utils.js";

describe("json-stringify takes precedence over json for package.json", () => {
  runCli("", [
    "--stdin-filepath=package.json",
  ], {
    input:
      '{ "a": "longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglong" }',
  }).test({
    stdout:
      '{\n  "a": "longlonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglonglong"\n}',
    stderr: "",
    status: 0,
    write: [],
  });
});
