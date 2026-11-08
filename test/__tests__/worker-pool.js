import path from "node:path";
import { writeFileSync, mkdtempSync } from "node:fs";
import os from "node:os";
import { pathToFileURL } from "node:url";
import WorkerPool from "../../dist/worker_pool.js";

// Settles to { value } | { error } | { hung: true }, so a hanging task fails the test instead of the whole run
const settle = (promise) => {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ hung: true }), 5000);
  });
  return Promise.race([promise.then((value) => ({ value }), (error) => ({ error })), timeout]).finally(() => clearTimeout(timer));
};

const makeScript = (source) => {
  const file = path.join(mkdtempSync(path.join(os.tmpdir(), "worker-pool-")), "worker.mjs");
  writeFileSync(file, source);
  return pathToFileURL(file);
};

const MISSING_SCRIPT = pathToFileURL(path.join(os.tmpdir(), "worker-pool-missing", "worker.js"));

const SCRIPTS = {
  // check -> false, anything else -> an error with a custom name
  results: `
    import { parentPort } from "node:worker_threads";
    parentPort.on("message", (m) => {
      if (m.method === "check") parentPort.postMessage({ result: false });
      else parentPort.postMessage({ error: { name: "UndefinedParserError", message: "nope" } });
    });
  `,
  // check -> the worker exits, anything else -> "ok"
  crashOnCheck: `
    import { parentPort } from "node:worker_threads";
    parentPort.on("message", (m) => {
      if (m.method === "check") process.exit(1);
      parentPort.postMessage({ result: "ok" });
    });
  `,
  // check -> throws something that is not an Error
  throwsNonError: `
    import { parentPort } from "node:worker_threads";
    parentPort.on("message", () => {
      throw "boom";
    });
  `,
  // never replies
  silent: `
    import { parentPort } from "node:worker_threads";
    parentPort.on("message", () => {});
  `,
};

describe("WorkerPool", () => {
  const pools = [];
  const makePool = (script, size = 1) => {
    const pool = new WorkerPool(script, size);
    pools.push(pool);
    return pool;
  };

  // Live worker threads keep the test process from exiting
  afterEach(() => {
    while (pools.length) pools.pop().destroy();
  });

  test("resolves falsy results and rejects with the original error name and message", async () => {
    const pool = makePool(makeScript(SCRIPTS.results));
    expect(await settle(pool.exec("check", []))).toEqual({ value: false });
    const { error } = await settle(pool.exec("format", []));
    expect(error.name).toBe("UndefinedParserError");
    expect(error.message).toBe("nope");
  });

  test("a crashing worker only fails its own task and queued tasks still run", async () => {
    const pool = makePool(makeScript(SCRIPTS.crashOnCheck));
    const results = await Promise.all([settle(pool.exec("check", [])), settle(pool.exec("format", [])), settle(pool.exec("format", []))]);
    expect(results[0].error?.message).toMatch(/exit code 1/);
    expect(results[1]).toEqual({ value: "ok" });
    expect(results[2]).toEqual({ value: "ok" });
  });

  test("a worker that throws a non-Error value still rejects the task with an Error", async () => {
    const pool = makePool(makeScript(SCRIPTS.throwsNonError));
    const result = await settle(pool.exec("format", []));
    expect(result.hung).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toMatch(/boom/);
  });

  test("a worker that fails to start rejects every task, with a message, without hanging", async () => {
    const pool = makePool(MISSING_SCRIPT);
    const results = await Promise.all([settle(pool.exec("format", [])), settle(pool.exec("format", []))]);
    for (const result of results) {
      expect(result.hung).toBeUndefined();
      expect(result.error.message).toMatch(/Cannot find module/);
    }
    const again = await settle(pool.exec("format", []));
    expect(again.hung).toBeUndefined();
    expect(again.error.message).toMatch(/Cannot find module/);
  });

  test("a worker that fails to start is not respawned forever", async () => {
    const pool = makePool(MISSING_SCRIPT);
    await settle(pool.exec("format", []));
    await new Promise((resolve) => setTimeout(resolve, 500));
    // Replacements are only created for queued work, so the pool is empty once nothing is pending
    expect(pool.poolSize).toBe(0);
    expect(pool.queueSize).toBe(0);
  });

  test("destroy rejects in-flight and queued tasks, and later tasks", async () => {
    const pool = makePool(makeScript(SCRIPTS.silent));
    const pending = [settle(pool.exec("format", [])), settle(pool.exec("format", [])), settle(pool.exec("format", []))];
    await new Promise((resolve) => setTimeout(resolve, 200));
    pool.destroy();
    for (const result of await Promise.all(pending)) {
      expect(result.hung).toBeUndefined();
      expect(result.error.message).toMatch(/terminated/);
    }
    const after = await settle(pool.exec("format", []));
    expect(after.hung).toBeUndefined();
    expect(after.error.message).toMatch(/destroyed/);
    expect(pool.isTerminated).toBe(true);
    expect(pool.poolSize).toBe(0);
  });
});
