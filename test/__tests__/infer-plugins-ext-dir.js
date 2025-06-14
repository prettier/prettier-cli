import { runCli } from "../utils";
import dedent from "dedent";

describe("infer file ext that supported by only plugins", () => {
  describe("basic", () => {
    runCli("infer-plugins-ext-dir", [
      "--write",
      "src"
    ]).test({
      status: 0,
      stdout: "src/file.foo",
      write: [
        {
          content: "!contents\n",
          filename: "src/file.foo",
        },
      ],
    });
  });

  describe("with config option", () => {
    runCli("infer-plugins-ext-dir-with-config", [
      "--config-path",
      "foo.mjs",
      "--write",
      "src",
    ]).test({
      status: 0,
      stdout: "src/file.foo",
      write: [
        {
          content: "!contents\n",
          filename: "src/file.foo",
        },
      ],
    });
  });

  describe("with overrides options", () => {
    runCli("infer-plugins-ext-dir-with-overrides", [
      "--write",
      "src",
    ]).test({
      status: 0,
      stdout: "src/file.bar\nsrc/file.foo",
      write: [
        {
          content: "!contents\n",
          filename: "src/file.bar",
        },
        {
          content: "!contents\n",
          filename: "src/file.foo",
        },
      ],
    });
  });

  describe("with defaultOptions", () => {
    runCli("infer-plugins-ext-dir-with-default-options", [
      "--write",
      "--no-editorconfig",
      "src",
    ]).test({
      status: 0,
      stdout: "src/file.foo\nsrc/index.js",
      write: [
        {
          content: '{"tabWidth":8,"bracketSpacing":false}',
          filename: "src/file.foo",
        },
        {
          // formatted with `tabWidth: 2`
          content: dedent`
            function main() {
              console.log("Hello, World!");
            }\n
          `,
          filename: "src/index.js",
        },
      ],
    });
  });

  describe("with overrides and defaultOptions", () => {
    runCli("infer-plugins-ext-dir-with-overrides-and-default-options", [
      "--write",
      "--no-editorconfig",
      "src",
    ]).test({
      status: 0,
      stdout: "src/file.foo\nsrc/index.js",
      write: [
        {
          content: '{"tabWidth":8,"bracketSpacing":false}',
          filename: "src/file.foo",
        },
        {
          // formatted with `tabWidth: 2`
          content: dedent`
            function main() {
              console.log("Hello, World!");
            }\n
          `,
          filename: "src/index.js",
        },
      ],
    });
  });

  //FIXME: relative plugins in nested configs are resolved from the CWD, incorrectly
  describe.skip("with multiple config for nested dir", () => {
    runCli("infer-plugins-with-multiple-config", [
      "--write",
      "--no-editorconfig",
      ".",
    ]).test({
      status: 0,
      stdout: dedent`
        dir/.prettierrc.mjs
        dir/subdir/.prettierrc.mjs
        dir/subdir/2.foo
      `,
      write: [
        {
          content: "export default {};\n",
          filename: "dir/.prettierrc.mjs",
        },
        {
          content: dedent`
            export default {
              plugins: ["../plugin-default-options/plugin.cjs"],
            };\n
          `,
          filename: "dir/subdir/.prettierrc.mjs",
        },
        {
          content: '{"tabWidth":8,"bracketSpacing":false}',
          filename: "dir/subdir/2.foo",
        },
      ],
    });
  });

  //FIXME: relative plugins in nested configs are resolved from the CWD, incorrectly
  describe.skip("with multiple config for nested dir 2", () => {
    runCli("infer-plugins-with-multiple-config", [
      "--write",
      "--no-editorconfig",
      "dir",
      "dir/subdir",
    ]).test({
      status: 0,
      stdout: dedent`
        dir/.prettierrc.mjs
        dir/subdir/.prettierrc.mjs
        dir/subdir/2.foo
      `,
      write: [
        {
          content: "export default {};\n",
          filename: "dir/.prettierrc.mjs",
        },
        {
          content: dedent`
            export default {
              plugins: ["../plugin-default-options/plugin.cjs"],
            };\n
          `,
          filename: "dir/subdir/.prettierrc.mjs",
        },
        {
          content: '{"tabWidth":8,"bracketSpacing":false}',
          filename: "dir/subdir/2.foo",
        },
      ],
    });
  });

  //FIXME: relative plugins in nested configs are resolved from the CWD, incorrectly
  describe.skip("with multiple config for nested dir 2", () => {
    runCli("infer-plugins-ext-dir-with-complex-overrides", [
      "--write",
      "--no-editorconfig",
      ".",
    ]).test({
      status: 0,
      stdout: dedent`
        .prettierrc.mjs
        dir/2.foo
      `,
      write: [
        {
          content: dedent`
            export default {
              overrides: [
                {
                  files: ["dir/*.foo"],
                  options: {
                    plugins: ["../plugin-extensions/plugin.cjs"],
                  },
                },
              ],
            };\n
          `,
          filename: ".prettierrc.mjs",
        },
        {
          content: "!2.foo\n",
          filename: "dir/2.foo",
        },
      ],
    });
  });
});
