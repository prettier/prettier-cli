import fs from "node:fs/promises";
import path from "node:path";
import * as EditorConfig from "tiny-editorconfig";
import Known from "./known.js";
import { fastJoinedPath, findLastIndex, isUndefined, memoize, noop, zipObjectUnless } from "./utils.js";
import type { Config, ConfigWithOverrides } from "tiny-editorconfig";
import type { FormatOptions, PromiseMaybe } from "./types.js";

const getEditorConfig = memoize((folderPath: string, filesNames: string[], ignoreKnown?: boolean): PromiseMaybe<ConfigWithOverrides | undefined> => {
  for (let i = 0, l = filesNames.length; i < l; i++) {
    const fileName = filesNames[i];
    const filePath = fastJoinedPath(folderPath, fileName);
    if (!ignoreKnown && !Known.hasFilePath(filePath)) continue;
    return fs.readFile(filePath, "utf8").then(EditorConfig.parse).catch(noop);
  }
});

const getEditorConfigsMap = async (foldersPaths: string[], filesNames: string[]): Promise<Partial<Record<string, ConfigWithOverrides>>> => {
  const configs = await Promise.all(foldersPaths.map((folderPath) => getEditorConfig(folderPath, filesNames)));
  const map = zipObjectUnless(foldersPaths, configs, isUndefined);
  return map;
};

const getEditorConfigsUp = memoize(async (folderPath: string, filesNames: string[], ignoreKnown?: boolean): Promise<ConfigWithOverrides[]> => {
  const config = await getEditorConfig(folderPath, filesNames, ignoreKnown);
  const folderPathUp = path.dirname(folderPath);
  const configsUp = folderPath !== folderPathUp ? await getEditorConfigsUp(folderPathUp, filesNames, ignoreKnown) : [];
  const configs = config ? [...configsUp, config] : configsUp;
  const lastRootIndex = findLastIndex(configs, (config) => config.root);
  return lastRootIndex > 0 ? configs.slice(lastRootIndex) : configs;
});

const getEditorConfigResolved = async (filePath: string, filesNames: string[], ignoreKnown?: boolean): Promise<Config> => {
  const folderPath = path.dirname(filePath);
  const configs = await getEditorConfigsUp(folderPath, filesNames, ignoreKnown);
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
