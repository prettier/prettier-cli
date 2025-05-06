import fs from "node:fs";
import { getFixturesPath, runCli } from "../utils.js";

// These `.js` files are ignored in `.gitignore`, so we need to write them manually here
[
  "ignore-path/ignore-path-test/ignored-by-customignore.js",
  "ignore-path/ignore-path-test/ignored-by-gitignore.js",
  "ignore-path/ignore-path-test/ignored-by-prettierignore.js",
].forEach(file => {
  fs.writeFileSync(getFixturesPath(file), "   a+   b");
});

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
