import { runCli } from "../utils";

describe("ignores files when executing in a subdirectory", () => {
  runCli("ignore-in-subdirectories/web1", [
    "ignore-me/should-ignore.js",
    "--ignore-path",
    "../.prettierignore",
    "-l",
  ]).test({
    status: 0,
  });

  runCli("ignore-in-subdirectories/web1", [
    "ignore-me/subdirectory/should-ignore.js",
    "--ignore-path",
    "../.prettierignore",
    "-l",
  ]).test({
    status: 0,
  });
});

describe("formats files when executing in a subdirectory", () => {
  runCli("ignore-in-subdirectories/web1", [
    "should-not-ignore.js",
    "--ignore-path",
    "../.prettierignore",
    "-l",
  ]).test({
    status: 1,
  });

  runCli("ignore-in-subdirectories/web2", [
    "should-not-ignore.js",
    "--ignore-path",
    "../.prettierignore",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("ignore files when executing in a subdirectory and using stdin", () => {
  runCli("ignore-in-subdirectories/web1", [
    "--ignore-path",
    "../.prettierignore",
    "--stdin-filepath",
    "ignore-me/example.js",
  ], {
    input: "hello_world( );",
  }).test({
    stdout: "hello_world();",
    status: 0,
  });
});

describe("formats files when executing in a subdirectory and using stdin", () => {
  runCli("ignore-in-subdirectories/web1", [
    "--ignore-path",
    "../.prettierignore",
    "--stdin-filepath",
    "example.js",
  ], {
    input: "hello_world( );",
  }).test({
    stdout: "hello_world();",
    status: 0,
  });
});
