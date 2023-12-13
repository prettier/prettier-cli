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
    async check(filePath, fileContent, formatOptions, contextOptions, pluginsOptions) {
      return pool.exec("check", [filePath, fileContent, await resolve(formatOptions), contextOptions, pluginsOptions]);
    },
    async checkWithPath(filePath, formatOptions, contextOptions, pluginsOptions) {
      return pool.exec("checkWithPath", [filePath, await resolve(formatOptions), contextOptions, pluginsOptions]);
    },
    async format(filePath, fileContent, formatOptions, contextOptions, pluginsOptions) {
      return pool.exec("format", [filePath, fileContent, await resolve(formatOptions), contextOptions, pluginsOptions]);
    },
    async formatWithPath(filePath, formatOptions, contextOptions, pluginsOptions) {
      return pool.exec("formatWithPath", [filePath, await resolve(formatOptions), contextOptions, pluginsOptions]);
    },
    async write(filePath, fileContent, formatOptions, contextOptions, pluginsOptions) {
      return pool.exec("write", [filePath, fileContent, await resolve(formatOptions), contextOptions, pluginsOptions]);
    },
    async writeWithPath(filePath, formatOptions, contextOptions, pluginsOptions) {
      return pool.exec("writeWithPath", [filePath, await resolve(formatOptions), contextOptions, pluginsOptions]);
    },
  };
}

export { makeParallel };
