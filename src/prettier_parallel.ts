import os from "node:os";
import WorkTank from "worktank";
import type { Options, Prettier } from "./types.js";

function makeParallel(options: Options): Prettier {
  const pool = new WorkTank<Prettier>({
    name: "prettier",
    size: options.parallelWorkers || Math.max(1, os.cpus().length - 1),
    methods: new URL("./prettier_serial.js", import.meta.url),
  });

  return pool.proxy();
}

export { makeParallel };
