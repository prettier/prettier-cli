import ignore from "ignore";
import fs from "node:fs/promises";
import path from "node:path";
import Known from "./known.js";
import { fastJoinedPath, fastRelativeChildPath, memoize, someOf, zipObject } from "./utils.js";
import type { Ignore } from "./types.js";

const getIgnoreContentBy = async (folderPath: string, fileName: string): Promise<string | undefined> => {
  const filePath = fastJoinedPath(folderPath, fileName);
  if (!Known.hasFile(filePath)) return;
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return;
  }
};

const getIgnoresContent = memoize(async (folderPath: string): Promise<[string?, string?] | undefined> => {
  const git = await getIgnoreContentBy(folderPath, ".gitignore");
  const prettier = await getIgnoreContentBy(folderPath, ".prettierignore");
  const contents = git ? (prettier ? [git, prettier] : [git]) : prettier ? [prettier] : [];
  if (!contents.length) return;
  return [git, prettier];
});

const getIgnoresContentMap = async (foldersPaths: string[]): Promise<Partial<Record<string, [string?, string?]>>> => {
  const ignoresContent = await Promise.all(foldersPaths.map(getIgnoresContent));
  const map = zipObject(foldersPaths, ignoresContent);
  return map;
};

const getIgnoreBy = (folderPath: string, fileContent: string): Ignore => {
  const instance = ignore().add(fileContent);
  const ignores = instance.ignores.bind(instance);
  return (filePath: string): boolean => {
    const fileRelativePath = fastRelativeChildPath(folderPath, filePath);
    return !!fileRelativePath && ignores(fileRelativePath);
  };
};

const getIgnores = memoize(async (folderPath: string): Promise<Ignore | undefined> => {
  const contents = await getIgnoresContent(folderPath);
  if (!contents) return;
  const [gitContent, prettierContent] = contents;
  const git = gitContent ? getIgnoreBy(folderPath, gitContent) : undefined;
  const prettier = prettierContent ? getIgnoreBy(folderPath, prettierContent) : undefined;
  const ignores = git ? (prettier ? [git, prettier] : [git]) : prettier ? [prettier] : [];
  if (!ignores.length) return;
  const ignore = someOf(ignores);
  return ignore;
});

const getIgnoresUp = memoize(async (folderPath: string): Promise<Ignore | undefined> => {
  const ignore = await getIgnores(folderPath);
  const folderPathUp = path.dirname(folderPath);
  const ignoreUp = folderPath !== folderPathUp ? await getIgnoresUp(folderPathUp) : undefined;
  const ignores = ignore ? (ignoreUp ? [ignore, ignoreUp] : [ignore]) : ignoreUp ? [ignoreUp] : [];
  if (!ignores.length) return;
  const ignoreAll = someOf(ignores);
  return ignoreAll;
});

const getIgnoreResolved = async (filePath: string): Promise<boolean> => {
  const folderPath = path.dirname(filePath);
  const ignore = await getIgnoresUp(folderPath);
  return !!ignore?.(filePath);
};

export { getIgnoreBy, getIgnores, getIgnoresContent, getIgnoresContentMap, getIgnoresUp, getIgnoreResolved };
