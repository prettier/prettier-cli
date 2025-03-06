import { runCli } from "../utils";

describe("infers postcss parser", () => {
  runCli("with-parser-inference", [
    "--end-of-line",
    "lf",
    "*",
  ]).test({
    status: 0,
  });
});

describe("infers postcss parser with --check", () => {
  runCli("with-parser-inference", [
    "--check",
    "*",
  ]).test({
    status: 0,
  });
});

describe("infers postcss parser with --list-different", () => {
  runCli("with-parser-inference", [
    "--list-different",
    "*",
  ]).test({
    status: 0,
  });
});

describe("infers parser from filename (.prettierrc)", () => {
  runCli("with-parser-inference", [
    "--stdin-filepath",
    "x/y/.prettierrc",
  ], {
    input: "  {   }  ",
  }).test({
    status: 0,
    stderr: "",
    write: [],
  });
});

describe("infers parser from filename (.stylelintrc)", () => {
  runCli("with-parser-inference", [
    "--stdin-filepath",
    "x/y/.stylelintrc",
  ], {
    input: "  {   }  ",
  }).test({
    status: 0,
    stderr: "",
    write: [],
  });
});

describe("infers parser from filename (.stylelintrc YAML)", () => {
  runCli("with-parser-inference", [
    "--stdin-filepath",
    "x/y/.stylelintrc",
  ], {
    input: "  extends:    ''  ",
  }).test({
    status: 0,
    stderr: "",
    write: [],
  });
});

describe("infers parser from filename (jakefile)", () => {
  runCli("with-parser-inference", [
    "--stdin-filepath",
    "x/y/Jakefile",
  ], {
    input: "let foo = ( x = 1 ) => x",
  }).test({
    status: 0,
    stderr: "",
    write: [],
  });
});

describe("infers parser from filename (swcrc)", () => {
  runCli("with-parser-inference", [
    "--stdin-filepath",
    "x/y/.swcrc",
  ], {
    input:
        /* indent */ `
          {
                      "jsc": {
                    // Requires v1.2.50 or upper and requires target to be es2016 or upper.
                        "keepClassNames": false
                      }}
        `,
  }).test({
    status: 0,
    stderr: "",
    write: [],
  });
});

describe("infers parser from filename (lintstagedrc)", () => {
  runCli("with-parser-inference", [
    "--stdin-filepath",
    "x/y/.lintstagedrc",
  ], {
    input: "  {  '*':   'your-cmd'  }  ",
  }).test({
    status: 0,
    stderr: "",
    write: [],
  });
});

describe("infers parser from filename (lintstagedrc YAML)", () => {
  runCli("with-parser-inference", [
    "--stdin-filepath",
    "x/y/.lintstagedrc",
  ], {
    input:
        /* indent */ `
          '*':
                 - your-cmd
        `,
  }).test({
    status: 0,
    stderr: "",
    write: [],
  });
});
