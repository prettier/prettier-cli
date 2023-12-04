import os from "node:os";
import WorkTank from "worktank";
import { resolve } from "./utils.js";
import type { Options, Prettier } from "./types.js";

function makeParallel(options: Options): Prettier {
  const pool = new WorkTank<Prettier>({
    name: "prettier",
    size: options.parallelWorkers || Math.max(1, os.cpus().length - 1),
    methods: new URL("./prettier_serial.js", import.meta.url),
    warmup: true,
  });

  return {
    async check(filePath, fileContent, formatOptions, contextOptions) {
      return pool.exec("check", [filePath, fileContent, await resolve(formatOptions), contextOptions]);
    },
    async checkWithPath(filePath, formatOptions, contextOptions) {
      return pool.exec("checkWithPath", [filePath, await resolve(formatOptions), contextOptions]);
    },
    async format(filePath, fileContent, formatOptions, contextOptions) {
      return pool.exec("format", [filePath, fileContent, await resolve(formatOptions), contextOptions]);
    },
    async formatWithPath(filePath, formatOptions, contextOptions) {
      return pool.exec("formatWithPath", [filePath, await resolve(formatOptions), contextOptions]);
    },
    async write(filePath, fileContent, formatOptions, contextOptions) {
      return pool.exec("write", [filePath, fileContent, await resolve(formatOptions), contextOptions]);
    },
    async writeWithPath(filePath, formatOptions, contextOptions) {
      return pool.exec("writeWithPath", [filePath, await resolve(formatOptions), contextOptions]);
    },
  };
}

export { makeParallel };
