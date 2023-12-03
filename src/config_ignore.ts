import ignore from "ignore";
import fs from "node:fs/promises";
import path from "node:path";
import Known from "./known.js";
import { fastJoinedPath, fastRelativeChildPath, isString, isUndefined, memoize, noop, someOf, zipObjectUnless } from "./utils.js";
import type { Ignore, PromiseMaybe } from "./types.js";

const getIgnoreContent = (folderPath: string, fileName: string): PromiseMaybe<string | undefined> => {
  const filePath = fastJoinedPath(folderPath, fileName);
  if (!Known.hasFilePath(filePath)) return;
  return fs.readFile(filePath, "utf8").catch(noop);
};

const getIgnoresContent = memoize(async (folderPath: string, filesNames: string[]): Promise<string[] | undefined> => {
  const contentsRaw = await Promise.all(filesNames.map((fileName) => getIgnoreContent(folderPath, fileName)));
  const contents = contentsRaw.filter(isString);
  if (!contents.length) return;
  return contents;
});

const getIgnoresContentMap = async (foldersPaths: string[], filesNames: string[]): Promise<Partial<Record<string, string[]>>> => {
  const contents = await Promise.all(foldersPaths.map((folderPath) => getIgnoresContent(folderPath, filesNames)));
  const map = zipObjectUnless(foldersPaths, contents, isUndefined);
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
  if (!contents?.length) return;
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
