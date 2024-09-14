import path from "node:path";
import dirname from "tiny-dirname";
import { runCli } from "../utils";

describe("support absolute filename", () => {
  runCli("ignore-absolute-path", [
    path.resolve(dirname(import.meta.url), "../__fixtures__/ignore-absolute-path/ignored/module.js"),
    path.resolve(dirname(import.meta.url), "../__fixtures__/ignore-absolute-path/depth1/ignored/*.js"),
    path.resolve(dirname(import.meta.url), "../__fixtures__/ignore-absolute-path/regular-module.js"),
    "-l",
  ]).test({
    status: 1,
  });
});
