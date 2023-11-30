import os from "node:os";
import WorkTank from "worktank";
import { resolve } from "./utils.js";
import type { Options, Prettier } from "./types.js";

function makeParallel(options: Options): Prettier {
  const pool = new WorkTank<Prettier>({
    name: "prettier",
    size: options.parallelWorkers || Math.max(1, os.cpus().length - 1),
    methods: new URL("./prettier_serial.js", import.meta.url),
  });

  return {
    async check(filePath, fileContent, formatOptions) {
      return pool.exec("check", [filePath, fileContent, await resolve(formatOptions)]);
    },
    async checkWithPath(filePath, formatOptions) {
      return pool.exec("checkWithPath", [filePath, await resolve(formatOptions)]);
    },
    async format(filePath, fileContent, formatOptions) {
      return pool.exec("format", [filePath, fileContent, await resolve(formatOptions)]);
    },
    async formatWithPath(filePath, formatOptions) {
      return pool.exec("formatWithPath", [filePath, await resolve(formatOptions)]);
    },
    async write(filePath, fileContent, formatOptions) {
      return pool.exec("write", [filePath, fileContent, await resolve(formatOptions)]);
    },
    async writeWithPath(filePath, formatOptions) {
      return pool.exec("writeWithPath", [filePath, await resolve(formatOptions)]);
    },
  };
}

export { makeParallel };
