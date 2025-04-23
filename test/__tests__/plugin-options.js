import { runCli } from "../utils.js";

test("show external options with `--help`", async () => {
  const originalStdout = await runCli("plugin-options", ["--help"]).stdout;
  const pluggedStdout = await runCli("plugin-options", ["--help", "--plugin=./plugin.cjs"]).stdout;

  const originalLines = originalStdout.split("\n");
  const pluggedLines = pluggedStdout.split("\n");
  const differentLines = pluggedLines.filter((line) => !originalLines.includes(line));
  expect(differentLines.join("\n")).toMatchSnapshot();
});

describe("external options from CLI should work", () => {
  runCli("plugin-options", [
    "--plugin=./plugin.cjs",
    "--stdin-filepath",
    "example.foo",
    "--foo-option",
    "baz",
  ], {
    input: "hello-world",
  }).test({
    stdout: "foo:baz",
    stderr: "",
    status: 0,
    write: [],
  });
});

// TODO (43081j): re-enable this once #21 is fixed
describe.skip("external options from config file should work", () => {
  runCli("plugin-options", [
    "--config-path=./config.json",
    "--stdin-filepath",
    "example.foo",
  ], {
    input: "hello-world",
  }).test({
    stdout: "foo:baz",
    stderr: "",
    status: 0,
    write: [],
  });
});
