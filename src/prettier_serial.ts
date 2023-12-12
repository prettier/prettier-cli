import { readFile, writeFile } from "atomically";
import process from "node:process";
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
import { getPlugins, resolve } from "./utils.js";
import type { ContextOptions, LazyFormatOptions } from "./types.js";

//TODO: Avoid loading plugins until they are actually needed

async function check(filePath: string, fileContent: string, formatOptions: LazyFormatOptions, contextOptions: ContextOptions): Promise<boolean> {
  const fileContentFormatted = await format(filePath, fileContent, formatOptions, contextOptions);
  return fileContent === fileContentFormatted;
}

async function checkWithPath(filePath: string, formatOptions: LazyFormatOptions, contextOptions: ContextOptions): Promise<boolean> {
  const fileContent = await readFile(filePath, "utf8");
  return check(filePath, fileContent, formatOptions, contextOptions);
}

async function format(filePath: string, fileContent: string, formatOptions: LazyFormatOptions, contextOptions: ContextOptions): Promise<string> {
  formatOptions = await resolve(formatOptions);
  const plugins = await getPlugins(formatOptions.plugins || []);

  const options = {
    ...formatOptions,
    ...contextOptions,
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
      ...plugins,
    ],
  };

  const result = await prettier.formatWithCursor(fileContent, options as any); //FIXME: Prettier's own types are incorrect here

  if (result.cursorOffset >= 0) {
    process.stderr.write(`${result.cursorOffset}\n`); //TODO: This should be implemented differently, pretty ugly doing it like this
  }

  return result.formatted;
}

async function formatWithPath(filePath: string, formatOptions: LazyFormatOptions, contextOptions: ContextOptions): Promise<string> {
  const fileContent = await readFile(filePath, "utf8");
  return format(filePath, fileContent, formatOptions, contextOptions);
}

async function write(filePath: string, fileContent: string, formatOptions: LazyFormatOptions, contextOptions: ContextOptions): Promise<boolean> {
  const fileContentFormatted = await format(filePath, fileContent, formatOptions, contextOptions);
  if (fileContent === fileContentFormatted) return true;
  await writeFile(filePath, fileContentFormatted, "utf8");
  return false;
}

async function writeWithPath(filePath: string, formatOptions: LazyFormatOptions, contextOptions: ContextOptions): Promise<boolean> {
  const fileContent = await readFile(filePath, "utf8");
  return write(filePath, fileContent, formatOptions, contextOptions);
}

export { check, checkWithPath, format, formatWithPath, write, writeWithPath };
