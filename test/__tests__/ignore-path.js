import fs from "node:fs/promises";
import { getFixturesPath, runCli } from "../utils";

// `.js` files are ignored in `.gitignore`
const files = [
  "ignore-path/ignore-path-test/ignored-by-customignore.js",
  "ignore-path/ignore-path-test/ignored-by-gitignore.js",
  "ignore-path/ignore-path-test/ignored-by-prettierignore.js",
].map(getFixturesPath);

const clean = () =>
  Promise.all(files.map((file) => fs.rm(file, { force: true })));
const setup = () =>
  Promise.all(files.map((file) => fs.writeFile(file, "   a+   b")));

beforeAll(setup);
afterAll(clean);

const getUnformattedFiles = async (args) => {
  const { stdout } = await runCli("ignore-path/ignore-path-test/", [
    "**/*.js",
    "-l",
    ...args,
  ]);
  return stdout ? stdout.split("\n").sort() : [];
};

test("custom ignore path", async () => {
  expect(await getUnformattedFiles(["--ignore-path", ".customignore"])).toEqual(
    ["ignored-by-gitignore.js", "ignored-by-prettierignore.js"],
  );
});

test("ignore files by .prettierignore and .gitignore by default", async () => {
  expect(
    await getUnformattedFiles(["--ignore-path", ".non-exists-ignore-file"]),
  ).toEqual([
    "ignored-by-customignore.js",
    "ignored-by-gitignore.js",
    "ignored-by-prettierignore.js",
  ]);
  expect(await getUnformattedFiles([])).toEqual([]);
});

test("multiple `--ignore-path`", async () => {
  expect(
    await getUnformattedFiles([
      "--ignore-path",
      ".customignore",
      "--ignore-path",
      ".prettierignore",
      "--ignore-path",
      ".non-exists-ignore-file",
    ]),
  ).toEqual(["ignored-by-gitignore.js"]);
});
