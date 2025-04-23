import fastIgnore from "fast-ignore";
import fs from "node:fs/promises";
import path from "node:path";
import Known from "./known.js";
import { fastJoinedPath, fastRelativeChildPath, isString, isUndefined, memoize, noop, someOf, zipObjectUnless } from "./utils.js";
import type { Ignore, PromiseMaybe } from "./types.js";

const getIgnoreContent = (folderPath: string, fileName: string, ignoreKnown?: boolean): PromiseMaybe<string | undefined> => {
  const filePath = fastJoinedPath(folderPath, fileName);
  if (!ignoreKnown && !Known.hasFilePath(filePath)) return;
  return fs.readFile(filePath, "utf8").catch(noop);
};

const getIgnoresContent = memoize(async (folderPath: string, filesNames: string[], ignoreKnown?: boolean): Promise<string[] | undefined> => {
  const contentsRaw = await Promise.all(filesNames.map((fileName) => getIgnoreContent(folderPath, fileName, ignoreKnown)));
  const contents = contentsRaw.filter(isString);
  if (!contents.length) return;
  return contents;
});

const getIgnoresContentMap = async (foldersPaths: string[], filesNames: string[]): Promise<Partial<Record<string, string[]>>> => {
  const contents = await Promise.all(foldersPaths.map((folderPath) => getIgnoresContent(folderPath, filesNames)));
  const map = zipObjectUnless(foldersPaths, contents, isUndefined);
  return map;
};

const getIgnoreBy = (folderPath: string, filesContents: string[]): Ignore => {
  const ignore = fastIgnore(filesContents);
  return (filePath: string): boolean => {
    const fileRelativePath = fastRelativeChildPath(folderPath, filePath);
    return !!fileRelativePath && ignore(fileRelativePath);
  };
};

const getIgnoreBys = (foldersPaths: string[], filesContents: string[][]): Ignore | undefined => {
  if (!foldersPaths.length) return;
  const ignores = foldersPaths.map((folderPath, index) => getIgnoreBy(folderPath, filesContents[index]));
  const ignore = someOf(ignores);
  return ignore;
};

const getIgnores = memoize(async (folderPath: string, filesNames: string[], ignoreKnown?: boolean): Promise<Ignore | undefined> => {
  const contents = await getIgnoresContent(folderPath, filesNames, ignoreKnown);
  if (!contents?.length) return;
  const ignore = getIgnoreBy(folderPath, contents);
  return ignore;
});

const getIgnoresUp = memoize(async (folderPath: string, filesNames: string[], ignoreKnown?: boolean): Promise<Ignore | undefined> => {
  const ignore = await getIgnores(folderPath, filesNames, ignoreKnown);
  const folderPathUp = path.dirname(folderPath);
  const ignoreUp = folderPath !== folderPathUp ? await getIgnoresUp(folderPathUp, filesNames, ignoreKnown) : undefined;
  const ignores = ignore ? (ignoreUp ? [ignore, ignoreUp] : [ignore]) : ignoreUp ? [ignoreUp] : [];
  if (!ignores.length) return;
  const ignoreAll = someOf(ignores);
  return ignoreAll;
});

const getIgnoreResolved = async (filePath: string, filesNames: string[], ignoreKnown?: boolean): Promise<boolean> => {
  const folderPath = path.dirname(filePath);
  const ignore = await getIgnoresUp(folderPath, filesNames, ignoreKnown);
  const ignored = !!ignore?.(filePath);
  return ignored;
};

export { getIgnoresContent, getIgnoresContentMap, getIgnoreBy, getIgnoreBys, getIgnores, getIgnoresUp, getIgnoreResolved };
