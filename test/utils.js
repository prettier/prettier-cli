import once from "function-once";
import * as Archive from "json-archive";
import exec from "nanoexec";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import Base64 from "radix64-encoding";
import zeptoid from "zeptoid";

import { expect, test } from "@jest/globals";
import serializerRaw from "jest-snapshot-serializer-raw";
import serializerAnsi from "jest-snapshot-serializer-ansi";

expect.addSnapshotSerializer(serializerRaw);
expect.addSnapshotSerializer(serializerAnsi);

const ROOT_PATH = process.cwd();
const BIN_PATH = path.join(ROOT_PATH, "dist", "bin.js");
const FIXTURES_PATH = path.join(ROOT_PATH, "test", "__fixtures__");
const TESTS_PATH = path.join(ROOT_PATH, "test");

async function getArchive(folderPath) {
  const packPrev = await Archive.pack(folderPath);
  const archive = {
    getPack: once(() => {
      return Archive.pack(folderPath);
    }),
    getChanged: once(async () => {
      const packNext = await archive.getPack();
      const changed = [];
      for (const fileName in packPrev) {
        if (fileName.includes(".prettier-caches")) continue;
        const filePrev = packPrev[fileName];
        const fileNext = packNext[fileName];
        if (filePrev.contents === fileNext.contents) continue;
        changed.push(fileName);
      }
      for (const fileName in packNext) {
        if (fileName.includes(".prettier-caches")) continue;
        if (packPrev[fileName]) continue;
        changed.push(fileName);
      }
      return changed;
    }),
    getDiff: async () => {
      const packNext = await archive.getPack();
      const changed = await archive.getChanged();
      const diff = [];
      for (const fileName of changed) {
        const fileNext = packNext[fileName];
        diff.push({
          filename: fileName,
          content: Base64.decodeStr(fileNext.contents),
        });
      }
      return diff;
    },
    reset: async () => {
      const changed = await archive.getChanged();
      for (const fileName of changed) {
        const filePath = path.join(folderPath, fileName);
        const filePrev = packPrev[fileName];
        if (filePrev) {
          await fs.writeFile(filePath, filePrev.contents, filePrev.encoding);
        } else {
          await fs.rm(filePath);
        }
      }
    },
  };
  return archive;
}

function getFixturesPath(dir) {
  return path.join(FIXTURES_PATH, dir);
}

async function getIsolatedFixtures(dir) {
  const [rootPart, ...subParts] = dir.split("/");
  const fixturesPath = getFixturesPath(rootPart);
  const tempPath = await getTempPath(`prettier-${rootPart}`);
  const tempGitPath = path.join(tempPath, ".git");
  const isolatedPath = path.join(tempPath, ...subParts);

  await fs.mkdir(tempPath, { recursive: true });
  await fs.mkdir(tempGitPath, { recursive: true });
  await fs.cp(fixturesPath, tempPath, { recursive: true });

  const dispose = () => {
    return fs.rm(tempPath, { recursive: true, force: true });
  };

  return {
    path: isolatedPath,
    dispose,
  };
}

function getNormalizedOutput(output, cwd) {
  // \r is trimmed from jest snapshots by default;
  // manually replacing this character with /*CR*/ to test its true presence
  // If ignoreLineEndings is specified, \r is simply deleted instead
  // output = output.replace(/\r/gu, options.ignoreLineEndings ? "" : "/*CR*/"); //TODO
  output = output.replace(/(\r?\n|\r)$/, "");
  output = output.replaceAll(cwd, "$CWD");
  return output;
}

async function getTempPath(prefix) {
  const rootPath = await fs.realpath(os.tmpdir());
  const tempPath = path.join(rootPath, `${prefix}-${zeptoid()}`);
  return tempPath;
}

async function runCommand(dir, args, options) {
  const fixtures = dir ? await getIsolatedFixtures(dir) : undefined;
  const archive = fixtures ? await getArchive(fixtures.path) : undefined;
  const cwd = fixtures ? fixtures.path : TESTS_PATH;
  const argsWithReplacements = args.map((arg) => arg.replaceAll("$CWD", cwd));
  const result = exec("node", [BIN_PATH, ...argsWithReplacements], { cwd, stdio: "pipe" });

  if (options.input) {
    result.process.stdin.write(options.input);
    result.process.stdin.end();
  }

  const status = await result.code;
  const stdout = getNormalizedOutput((await result.stdout).toString(), cwd);
  const stderr = getNormalizedOutput((await result.stderr).toString(), cwd);
  const write = (await archive?.getDiff()) || [];

  await fixtures?.dispose();

  return { cwd, status, stdout, stderr, write };
}

async function runTest(name, expected, getResult, options) {
  const title = options.title || "";
  test(`${title}(${name})`, async () => {
    let result = await getResult();
    let value = result[name];
    if (expected !== undefined) {
      if (name === "status" && expected === "non-zero") {
        expect(value).not.toBe(0);
      } else if (typeof expected === "function") {
        expected(value);
      } else {
        if (typeof value === "string") {
          value = value.replaceAll(result.cwd, "$CWD");
        }
        expect(value).toEqual(expected);
      }
    } else {
      expect(value).toMatchSnapshot();
    }
  });
}

function runCli(dir, args = [], options = {}) {
  const getResult = once(() => {
    return runCommand(dir, args, options);
  });
  const result = {
    get status() {
      return getResult().then((result) => result.status);
    },
    get stdout() {
      return getResult().then((result) => result.stdout);
    },
    get stderr() {
      return getResult().then((result) => result.stderr);
    },
    get write() {
      return getResult().then((result) => result.write);
    },
    test: (tests) => {
      for (const name of ["status", "stdout", "stderr", "write"]) {
        const expected = tests[name];
        runTest(name, expected, getResult, options);
      }
      return result;
    },
    then: (onFulfilled, onRejected) => {
      return getResult().then(onFulfilled, onRejected);
    },
  };
  return result;
}

export { getFixturesPath, runCli };
