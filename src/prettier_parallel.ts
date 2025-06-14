import os from "node:os";
import process from "node:process";
import WorkTank from "worktank";
import { resolve } from "./utils.js";
import type { Options, Prettier } from "./types.js";

function makeParallel(options: Options): Prettier {
  const pool = new WorkTank<Prettier>({
    pool: {
      name: "prettier",
      size: options.parallelWorkers || Math.max(1, os.cpus().length - 1),
    },
    worker: {
      autoInstantiate: true,
      env: process.env,
      methods: new URL("./prettier_serial.js", import.meta.url),
    },
  });

  return {
    async check(filePath, fileContent, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions) {
      return pool.exec("check", [filePath, fileContent, await resolve(formatOptions), contextOptions, pluginsDefaultOptions, pluginsCustomOptions]);
    },
    async checkWithPath(filePath, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions) {
      return pool.exec("checkWithPath", [filePath, await resolve(formatOptions), contextOptions, pluginsDefaultOptions, pluginsCustomOptions]);
    },
    async format(filePath, fileContent, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions) {
      return pool.exec("format", [filePath, fileContent, await resolve(formatOptions), contextOptions, pluginsDefaultOptions, pluginsCustomOptions]);
    },
    async formatWithPath(filePath, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions) {
      return pool.exec("formatWithPath", [filePath, await resolve(formatOptions), contextOptions, pluginsDefaultOptions, pluginsCustomOptions]);
    },
    async write(filePath, fileContent, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions) {
      return pool.exec("write", [filePath, fileContent, await resolve(formatOptions), contextOptions, pluginsDefaultOptions, pluginsCustomOptions]);
    },
    async writeWithPath(filePath, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions) {
      return pool.exec("writeWithPath", [filePath, await resolve(formatOptions), contextOptions, pluginsDefaultOptions, pluginsCustomOptions]);
    },
  };
}

export { makeParallel };
