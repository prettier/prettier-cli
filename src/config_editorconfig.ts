import fs from "node:fs/promises";
import path from "node:path";
import * as EditorConfig from "tiny-editorconfig";
import Known from "./known.js";
import { fastJoinedPath, findLastIndex, memoize, zipObject } from "./utils.js";
import type { Config, ConfigWithOverrides } from "tiny-editorconfig";
import type { FormatOptions } from "./types.js";

const getEditorConfig = memoize(async (folderPath: string): Promise<ConfigWithOverrides | undefined> => {
  if (!Known.hasFileName(".editorconfig")) return;
  const filePath = fastJoinedPath(folderPath, ".editorconfig");
  if (!Known.hasFilePath(filePath)) return;
  try {
    const fileContent = await fs.readFile(filePath, "utf8");
    const config = EditorConfig.parse(fileContent);
    return config;
  } catch {
    return;
  }
});

const getEditorConfigsMap = async (foldersPaths: string[]): Promise<Partial<Record<string, ConfigWithOverrides>>> => {
  const configs = await Promise.all(foldersPaths.map(getEditorConfig));
  const map = zipObject(foldersPaths, configs);
  return map;
};

const getEditorConfigsUp = memoize(async (folderPath: string): Promise<ConfigWithOverrides[]> => {
  const config = await getEditorConfig(folderPath);
  const folderPathUp = path.dirname(folderPath);
  const configsUp = folderPath !== folderPathUp ? await getEditorConfigsUp(folderPathUp) : [];
  const configs = config ? [...configsUp, config] : configsUp;
  const lastRootIndex = findLastIndex(configs, (config) => config.root);
  return lastRootIndex > 0 ? configs.slice(lastRootIndex) : configs;
});

const getEditorConfigResolved = async (filePath: string): Promise<Config> => {
  const folderPath = path.dirname(filePath);
  const configs = await getEditorConfigsUp(folderPath);
  const config = EditorConfig.resolve(configs, filePath);
  return config;
};

const getEditorConfigFormatOptions = (config: Config): FormatOptions => {
  const formatOptions: FormatOptions = {};

  if ("endOfLine" in config) {
    formatOptions.endOfLine = config.endOfLine;
  }

  if ("indentSize" in config || "tabWidth" in config) {
    formatOptions.tabWidth = config.indentSize ?? config.tabWidth;
  }

  if ("indentStyle" in config) {
    formatOptions.useTabs = config.indentStyle === "tab";
  }

  return formatOptions;
};

export { getEditorConfig, getEditorConfigsMap, getEditorConfigsUp, getEditorConfigResolved, getEditorConfigFormatOptions };
