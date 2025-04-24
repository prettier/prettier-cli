import { readFile, writeFile } from "atomically";
import process from "node:process";
import * as prettier from "prettier/standalone";
import { getPluginsOrExit, getPluginsBuiltin, resolve } from "./utils.js";
import type { ContextOptions, LazyFormatOptions, PluginsOptions } from "./types.js";

async function check(
  filePath: string,
  fileContent: string,
  formatOptions: LazyFormatOptions,
  contextOptions: ContextOptions,
  pluginsDefaultOptions: PluginsOptions,
  pluginsCustomOptions: PluginsOptions,
): Promise<boolean> {
  const fileContentFormatted = await format(filePath, fileContent, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions);
  return fileContent === fileContentFormatted;
}

async function checkWithPath(
  filePath: string,
  formatOptions: LazyFormatOptions,
  contextOptions: ContextOptions,
  pluginsDefaultOptions: PluginsOptions,
  pluginsCustomOptions: PluginsOptions,
): Promise<boolean> {
  const fileContent = await readFile(filePath, "utf8");
  return check(filePath, fileContent, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions);
}

async function format(
  filePath: string,
  fileContent: string,
  formatOptions: LazyFormatOptions,
  contextOptions: ContextOptions,
  pluginsDefaultOptions: PluginsOptions,
  pluginsCustomOptions: PluginsOptions,
): Promise<string> {
  formatOptions = await resolve(formatOptions);
  const pluginsBuiltin = await getPluginsBuiltin();
  const plugins = await getPluginsOrExit(formatOptions.plugins || []);
  const pluginsOverride = contextOptions.configPrecedence !== "file-override";

  const options = {
    ...pluginsDefaultOptions,
    ...(pluginsOverride ? formatOptions : pluginsCustomOptions),
    ...(pluginsOverride ? pluginsCustomOptions : formatOptions),
    ...contextOptions,
    filepath: filePath,
    plugins: [...pluginsBuiltin, ...plugins],
  };

  const result = await prettier.formatWithCursor(fileContent, options as any); //FIXME: Prettier's own types are incorrect here

  if (result.cursorOffset >= 0) {
    process.stderr.write(`${result.cursorOffset}\n`); //TODO: This should be implemented differently, pretty ugly doing it like this
  }

  return result.formatted;
}

async function formatWithPath(
  filePath: string,
  formatOptions: LazyFormatOptions,
  contextOptions: ContextOptions,
  pluginsDefaultOptions: PluginsOptions,
  pluginsCustomOptions: PluginsOptions,
): Promise<string> {
  const fileContent = await readFile(filePath, "utf8");
  return format(filePath, fileContent, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions);
}

async function write(
  filePath: string,
  fileContent: string,
  formatOptions: LazyFormatOptions,
  contextOptions: ContextOptions,
  pluginsDefaultOptions: PluginsOptions,
  pluginsCustomOptions: PluginsOptions,
): Promise<boolean> {
  const fileContentFormatted = await format(filePath, fileContent, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions);
  if (fileContent === fileContentFormatted) return true;
  await writeFile(filePath, fileContentFormatted, "utf8");
  return false;
}

async function writeWithPath(
  filePath: string,
  formatOptions: LazyFormatOptions,
  contextOptions: ContextOptions,
  pluginsDefaultOptions: PluginsOptions,
  pluginsCustomOptions: PluginsOptions,
): Promise<boolean> {
  const fileContent = await readFile(filePath, "utf8");
  return write(filePath, fileContent, formatOptions, contextOptions, pluginsDefaultOptions, pluginsCustomOptions);
}

export { check, checkWithPath, format, formatWithPath, write, writeWithPath };
