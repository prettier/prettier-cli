import { parentPort } from "node:worker_threads";
import type { Prettier, PrettierAsyncTask } from "./types.js";

if (!parentPort) {
  throw new Error("Parent port missing in parallel runner");
}

let prettierSerial: typeof import("./prettier_serial.js");
parentPort.on("message", async (value: Pick<PrettierAsyncTask<keyof Prettier>, "method" | "args">) => {
  try {
    if (!prettierSerial) {
      prettierSerial = await import(import.meta.resolve("./prettier_serial.js", import.meta.url));
    }

    const method = prettierSerial[value.method];
    if (!method) {
      throw new Error(`Unknown prettier method: [${value.method}]`);
    }

    const result = await (method as (...args: unknown[]) => unknown).apply(undefined, value.args as unknown[]);
    parentPort!.postMessage({ result });
  } catch (error) {
    const { name, message, stack } = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
    parentPort!.postMessage({ error: { name, message, stack } });
  }
});
