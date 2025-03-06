import { runCli } from "../utils";

test("show external options with `--help`", async () => {
  const originalStdout = await runCli("plugin-options-string", ["--help"])
    .stdout;
  const pluggedStdout = await runCli("plugin-options-string", [
    "--help",
    "--plugin=./plugin.cjs",
  ]).stdout;
  const originalLines = originalStdout.split("\n");
  const pluggedLines = pluggedStdout.split("\n");
  const differentLines = pluggedLines.filter((line) =>
    !originalLines.includes(line));
  expect(differentLines.join("\n")).toMatchSnapshot();
});

describe("external options from CLI should work", () => {
  runCli("plugin-options-string", [
    "--plugin=./plugin.cjs",
    "--stdin-filepath",
    "example.foo",
    "--foo-string",
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

// TODO (43081j): this won't work until we fix #21
describe.skip("external options from config file should work", () => {
  runCli("plugin-options-string", [
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

describe("Non exists plugin", () => {
  runCli("plugin-options-string", [
    "--plugin=--foo--",
    "--stdin-filepath",
    "example.foo",
  ], {
    input: "hello-world",
  }).test({
    stdout: "",
    stderr: expect.stringMatching(/The plugin "--foo--" could not be loaded/),
    status: 1,
    write: [],
  });
});
