import { readFile, writeFile } from "atomically";
import prettier from "prettier/standalone";
import prettierAcorn from "prettier/plugins/acorn";
import prettierAngular from "prettier/plugins/angular";
import prettierBabel from "prettier/plugins/babel";
import prettierEstree from "prettier/plugins/estree";
import prettierFlow from "prettier/plugins/flow";
import prettierGlimmer from "prettier/plugins/glimmer";
import prettierGraphql from "prettier/plugins/graphql";
import prettierHtml from "prettier/plugins/html";
import prettierMarkdown from "prettier/plugins/markdown";
import prettierMeriyah from "prettier/plugins/meriyah";
import prettierPostcss from "prettier/plugins/postcss";
import prettierTypescript from "prettier/plugins/typescript";
import prettierYaml from "prettier/plugins/yaml";
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
