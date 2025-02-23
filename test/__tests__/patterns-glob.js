import { runCli } from "../utils";

/*
fixtures-1/
├─ !file.js
├─ a.js
└─ b.js
*/

describe("fixtures-1: Should match all files", () => {
  runCli("patterns-glob/fixtures-1", [
    "*.js",
    "!file.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("fixtures-1: Should match files except `a.js`", () => {
  runCli("patterns-glob/fixtures-1", [
  "*.js",
  "!a.js",
  "-l",
  ]).test({
    status: 1,
  });
});

/*
  fixtures-2/
  ├─ a.js
  ├─ !b.js
  └─ !dir.js/
    ├─ 1.css
    └─ 2.css
*/

describe("fixtures-2: Should match `a.js` and `!b.js`", () => {
  runCli("patterns-glob/fixtures-2", [
    "*.js",
    "!b.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("fixtures-2: Should only match `!b.js`", () => {
  runCli("patterns-glob/fixtures-2", [
    "*.js",
    "!a.js",
    "-l",
  ]).test({
    status: 1,
  });
});

/*
  fixtures-3/
  ├─ outside.js
  └─ dir
    ├─ inside.js
    ├─ node_modules/
    │ └─in-node_modules.js
    └─ .svn/
      └─in-svn.js
*/

describe("fixtures-3: Should match `outside.js`, `dir/inside.js` and `dir/node_modules/in-node_modules.js`", () => {
  runCli("patterns-glob/fixtures-3", [
    "**/*.js",
    "-l",
    "--with-node-modules"
  ]).test({
    status: 1,
  });
});

describe("fixtures-3: Should only match `outside.js` and `dir/inside.js`", () => {
  runCli("patterns-glob/fixtures-3", [
    "**/*.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("fixtures-3: Should not exclude `.svn` when specified explicitly", () => {
  describe("(existing)", () => {
    runCli("patterns-glob/fixtures-3", [
      "*.js",
      "dir/.svn/in-svn.js",
      "-l",
    ]).test({
      status: 1,
    });
  });

  describe("(nonexisting)", () => {
    runCli("patterns-glob/fixtures-3", [
      "*.js",
      ".svn/in-svn.js",
      "-l",
    ]).test({
      status: 1,
    });
  });
});

/*
  fixtures-4/
  ├─ level-0.js
  └─ 0
    ├─ level-1.js
    └─ 1/
      ├─ level-2.js
      └─ 2/
        └─ level-3.js
*/

describe("fixtures-4: Should match `level-1.js`", () => {
  runCli("patterns-glob/fixtures-4", [
    "./0/./level-1.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("fixtures-4: Should match `level-1.js` #2", () => {
  runCli("patterns-glob/fixtures-4", [
    "./0/1/2/../../level-1.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("fixtures-4: Should match `level-1.js` #3", () => {
  runCli("patterns-glob/fixtures-4", [
    "./0/non-exists-dir/2/../../level-1.js",
    "-l",
  ]).test({
    status: 1,
  });
});

describe("should not ignore file paths contains object prototype keys", () => {
  runCli("patterns-glob/fixtures-5", [
    "./constructor/should-be-formatted.js",
    "-l"
  ]).test({
    status: 1,
  });
});
