import exec from "nanoexec";
import path from "node:path";
import process from "node:process";

import { expect, test } from "@jest/globals";
import serializerRaw from "jest-snapshot-serializer-raw";
import serializerAnsi from "jest-snapshot-serializer-ansi";

expect.addSnapshotSerializer(serializerRaw);
expect.addSnapshotSerializer(serializerAnsi);

const ROOT_PATH = process.cwd();
const BIN_PATH = path.join(ROOT_PATH, "dist", "bin.js");
const FIXTURES_PATH = path.join(ROOT_PATH, "test", "__fixtures__");

function getFixturesPath(dir) {
  return path.join(FIXTURES_PATH, dir);
}

function getNormalizedOutput(output, options) {
  // \r is trimmed from jest snapshots by default;
  // manually replacing this character with /*CR*/ to test its true presence
  // If ignoreLineEndings is specified, \r is simply deleted instead
  // output = output.replace(/\r/gu, options.ignoreLineEndings ? "" : "/*CR*/"); //TODO
  output = output.replace(/(\r?\n|\r)$/, "");
  return output;
}

async function runCommand(dir, args, options) {
  const cwd = getFixturesPath(dir);
  const result = exec("node", [BIN_PATH, ...args], { cwd, stdio: "pipe" });

  if (options.input) {
    result.process.stdin.write(options.input);
    result.process.stdin.end();
  }

  const status = await result.code;
  const stdout = getNormalizedOutput((await result.stdout).toString());
  const stderr = getNormalizedOutput((await result.stderr).toString());
  const write = []; //TODO

  return { status, stdout, stderr, write };
}

async function runTest(name, expected, result, options) {
  const title = options.title || "";
  test(`${title}(${name})`, async () => {
    const value = (await result)[name];
    if (expected !== undefined) {
      if (name === "status" && expected === "non-zero") {
        expect(value).not.toBe(0);
      } else if (typeof expected === "function") {
        expected(value);
      } else {
        expect(value).toEqual(expected);
      }
    } else {
      expect(value).toMatchSnapshot();
    }
  });
}

function runCli(dir, args = [], options = {}) {
  const promise = runCommand(dir, args, options);
  const result = {
    get status() {
      return promise.then((result) => result.status);
    },
    get stdout() {
      return promise.then((result) => result.stdout);
    },
    get stderr() {
      return promise.then((result) => result.stderr);
    },
    get write() {
      return promise.then((result) => result.write);
    },
    test: (tests) => {
      for (const name of ["status", "stdout", "stderr", "write"]) {
        const expected = tests[name];
        runTest(name, expected, promise, options);
      }
      return result;
    },
    then: (onFulfilled, onRejected) => {
      return promise.then(onFulfilled, onRejected);
    },
  };
  return result;
}

export { getFixturesPath, runCli };
