import path from "node:path";
import dirname from "tiny-dirname";
import { runCli } from "../utils";

describe("support absolute filename", () => {
  runCli("ignore-absolute-path", [
    "$CWD/ignored/module.js",
    "$CWD/depth1/ignored/*.js",
    "$CWD/regular-module.js",
    "-l",
  ]).test({
    status: 1,
  });
});
