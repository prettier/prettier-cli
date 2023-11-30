import { readFile, writeFile } from "atomically";
import prettier from "prettier-internal/standalone";
import prettierAcorn from "prettier-internal/plugins/acorn";
import prettierAngular from "prettier-internal/plugins/angular";
import prettierBabel from "prettier-internal/plugins/babel";
import prettierEstree from "prettier-internal/plugins/estree";
import prettierFlow from "prettier-internal/plugins/flow";
import prettierGlimmer from "prettier-internal/plugins/glimmer";
import prettierGraphql from "prettier-internal/plugins/graphql";
import prettierHtml from "prettier-internal/plugins/html";
import prettierMarkdown from "prettier-internal/plugins/markdown";
import prettierMeriyah from "prettier-internal/plugins/meriyah";
import prettierPostcss from "prettier-internal/plugins/postcss";
import prettierTypescript from "prettier-internal/plugins/typescript";
import prettierYaml from "prettier-internal/plugins/yaml";
import type { FormatOptions } from "./types.js";

//TODO: Avoid loading plugins until they are actually needed

async function check(filePath: string, fileContent: string, formatOptions: FormatOptions): Promise<boolean> {
  const fileContentFormatted = await format(filePath, fileContent, formatOptions);
  return fileContent === fileContentFormatted;
}

async function checkWithPath(filePath: string, formatOptions: FormatOptions): Promise<boolean> {
  const fileContent = await readFile(filePath, "utf8");
  return check(filePath, fileContent, formatOptions);
}

async function format(filePath: string, fileContent: string, formatOptions: FormatOptions): Promise<string> {
  return prettier.format(fileContent, {
    ...formatOptions,
    filepath: filePath,
    plugins: [
      prettierAcorn,
      prettierAngular,
      prettierBabel,
      prettierEstree,
      prettierFlow,
      prettierGlimmer,
      prettierGraphql,
      prettierHtml,
      prettierMarkdown,
      prettierMeriyah,
      prettierPostcss,
      prettierTypescript,
      prettierYaml,
    ],
  });
}

async function formatWithPath(filePath: string, formatOptions: FormatOptions): Promise<string> {
  const fileContent = await readFile(filePath, "utf8");
  return format(filePath, fileContent, formatOptions);
}

async function write(filePath: string, fileContent: string, formatOptions: FormatOptions): Promise<boolean> {
  const fileContentFormatted = await format(filePath, fileContent, formatOptions);
  if (fileContent === fileContentFormatted) return true;
  await writeFile(filePath, fileContentFormatted, "utf8");
  return false;
}

async function writeWithPath(filePath: string, formatOptions: FormatOptions): Promise<boolean> {
  const fileContent = await readFile(filePath, "utf8");
  return write(filePath, fileContent, formatOptions);
}

export { check, checkWithPath, format, formatWithPath, write, writeWithPath };
