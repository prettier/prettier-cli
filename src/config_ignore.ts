import ignore from "ignore";
import fs from "node:fs/promises";
import path from "node:path";
import Known from "./known.js";
import { fastJoinedPath, fastRelativeChildPath, isString, memoize, someOf, zipObject } from "./utils.js";
import type { Ignore } from "./types.js";

const getIgnoreContentBy = async (folderPath: string, fileName: string): Promise<string | undefined> => {
  if (!Known.hasFileName(fileName)) return;
  const filePath = fastJoinedPath(folderPath, fileName);
  if (!Known.hasFilePath(filePath)) return;
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {}
};

const getIgnoresContent = memoize(async (folderPath: string, filesNames: string[]): Promise<string[]> => {
  const contentsRaw = await Promise.all(filesNames.map((fileName) => getIgnoreContentBy(folderPath, fileName)));
  const contents = contentsRaw.filter(isString);
  return contents;
});

const getIgnoresContentMap = async (foldersPaths: string[], filesNames: string[]): Promise<Partial<Record<string, string[]>>> => {
  const contents = await Promise.all(foldersPaths.map((folderPath) => getIgnoresContent(folderPath, filesNames)));
  const map = zipObject(foldersPaths, contents);
  return map;
};

const getIgnoreBy = (folderPath: string, fileContent: string): Ignore => {
  //TODO: Optimize this massively, as it pops up while profiling a lot
  const instance = ignore().add(fileContent);
  const ignores = instance.ignores.bind(instance);
  return (filePath: string): boolean => {
    const fileRelativePath = fastRelativeChildPath(folderPath, filePath);
    return !!fileRelativePath && ignores(fileRelativePath);
  };
};

const getIgnores = memoize(async (folderPath: string, filesNames: string[]): Promise<Ignore | undefined> => {
  const contents = await getIgnoresContent(folderPath, filesNames);
  if (!contents.length) return;
  const ignores = contents.map((content) => getIgnoreBy(folderPath, content));
  const ignore = someOf(ignores);
  return ignore;
});

const getIgnoresUp = memoize(async (folderPath: string, filesNames: string[]): Promise<Ignore | undefined> => {
  const ignore = await getIgnores(folderPath, filesNames);
  const folderPathUp = path.dirname(folderPath);
  const ignoreUp = folderPath !== folderPathUp ? await getIgnoresUp(folderPathUp, filesNames) : undefined;
  const ignores = ignore ? (ignoreUp ? [ignore, ignoreUp] : [ignore]) : ignoreUp ? [ignoreUp] : [];
  if (!ignores.length) return;
  const ignoreAll = someOf(ignores);
  return ignoreAll;
});

const getIgnoreResolved = async (filePath: string, filesNames: string[]): Promise<boolean> => {
  const folderPath = path.dirname(filePath);
  const ignore = await getIgnoresUp(folderPath, filesNames);
  const ignored = !!ignore?.(filePath);
  return ignored;
};

export { getIgnoreBy, getIgnores, getIgnoresContent, getIgnoresContentMap, getIgnoresUp, getIgnoreResolved };
