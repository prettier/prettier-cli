import { runCli } from "../utils";
import dedent from "dedent";

describe("format correctly if stdin content compatible with stdin-filepath", () => {
  runCli(
    "",
    ["--stdin-filepath", "abc.css"],
    { input: ".name { display: none; }" }, // css
  ).test({
    status: 0,
  });
});

describe("throw error if stdin content incompatible with stdin-filepath", () => {
  runCli(
    "",
    ["--stdin-filepath", "abc.js"],
    { input: ".name { display: none; }" }, // css
  ).test({
    status: "non-zero",
  });
});

describe("gracefully handle stdin-filepath with nonexistent directory", () => {
  runCli(
    "",
    ["--stdin-filepath", "definitely/nonexistent/path.css"],
    { input: ".name { display: none; }" }, // css
  ).test({
    status: 0,
  });
});

describe("apply editorconfig for stdin-filepath with nonexistent file", () => {
  runCli("", ["--stdin-filepath", "editorconfig/nonexistent.js"], {
    input: dedent`
      function f() {
        console.log("should be indented with a tab");
      }
    `, // js
  }).test({
    status: 0,
  });
});

describe("apply editorconfig for stdin-filepath with nonexistent directory", () => {
  runCli(
    "",
    ["--stdin-filepath", "editorconfig/nonexistent/one/two/three.js"],
    {
      input: dedent`
        function f() {
          console.log("should be indented with a tab");
        }
      `, // js
    },
  ).test({
    status: 0,
  });
});

describe("apply editorconfig for stdin-filepath with a deep path", () => {
  runCli(
    "",
    ["--stdin-filepath", "editorconfig/" + "a/".repeat(30) + "three.js"],
    {
      input: dedent`
        function f() {
          console.log("should be indented with a tab");
        }
      `, // js
    },
  ).test({
    status: 0,
  });
});

describe("apply editorconfig for stdin-filepath in root", () => {
  const code = dedent`
    function f() {
      console.log("should be indented with a tab");
    }
  `;
  runCli("", ["--stdin-filepath", "/foo.js"], {
    input: code, // js
  }).test({
    status: 0,
    stdout: code,
    stderr: "",
    write: [],
  });
});

describe("apply editorconfig for stdin-filepath with a deep path", () => {
  runCli(
    "",
    ["--stdin-filepath", "editorconfig/" + "a/".repeat(30) + "three.js"],
    {
      input: dedent`
        function f() {
          console.log("should be indented with a tab");
        }
      `, // js
    },
  ).test({
    status: 0,
  });
});

describe("don’t apply editorconfig outside project for stdin-filepath with nonexistent directory", () => {
  runCli(
    "",
    [
      "--stdin-filepath",
      "editorconfig/repo-root/nonexistent/one/two/three.js",
    ],
    {
      input: dedent`
        function f() {
          console.log("should be indented with 2 spaces");
        }
      `, // js
    },
  ).test({
    status: 0,
  });
});

describe("output file as-is if stdin-filepath matched patterns in ignore-path", () => {
  runCli("stdin-ignore", ["--stdin-filepath", "ignore/example.js"], {
    input: "hello_world( );",
  }).test({
    stdout: "hello_world( );",
    status: 0,
  });
});

describe("Should format stdin even if it's empty", () => {
  runCli("", ["--stdin-filepath", "example.js"], {
    isTTY: true,
  }).test({
    stdout: "",
    status: 0,
    stderr: "",
    write: [],
  });
});
