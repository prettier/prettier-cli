import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { exit } from "specialist";
import readdir from "tiny-readdir-glob";
import zeptomatch from "zeptomatch";
import type { ContextOptions, FormatOptions, FunctionMaybe, Key, LogLevel, Options, PrettierConfigWithOverrides, PromiseMaybe } from "./types.js";

function castArray<T>(value: T | T[]): T[] {
  return isArray(value) ? value : [value];
}

function everyOf<T>(fns: ((arg: T) => unknown)[]): (arg: T) => boolean {
  return (arg: T): boolean => {
    return fns.every((fn) => fn(arg));
  };
}

function fastJoinedPath(folderPath: string, fileName: string): string {
  return `${folderPath}${path.sep}${fileName}`;
}

function fastRelativePath(fromPath: string, toPath: string): string {
  if (toPath.startsWith(fromPath)) {
    if (toPath[fromPath.length] === path.sep) {
      return toPath.slice(fromPath.length + 1);
    }
  }
  return path.relative(fromPath, toPath);
}

function fastRelativeChildPath(fromPath: string, toPath: string): string | undefined {
  if (toPath.startsWith(fromPath)) {
    if (toPath[fromPath.length] === path.sep) {
      return toPath.slice(fromPath.length + 1);
    }
  }
}

function findLastIndex<T>(array: T[], predicate: (value: T, index: number, array: T[]) => unknown): number {
  for (let i = array.length - 1; i >= 0; i--) {
    if (predicate(array[i], i, array)) return i;
  }
  return -1;
}

function getCachePath(rootPath: string): string {
  const nodeModulesPaths = path.join(rootPath, "node_modules");
  const cachePath = path.join(nodeModulesPaths, ".cache", "prettier", ".prettier-caches");
  return cachePath;
}

function getExpandedFoldersPaths(foldersPaths: string[], untilPath: string = "/"): [string[], string[]] {
  const knownPaths = new Set(foldersPaths);
  const expandedPaths = new Set<string>();
  const extraPaths = new Set<string>();

  for (let i = 0, l = foldersPaths.length; i < l; i++) {
    let folderPath = foldersPaths[i];
    while (true) {
      if (expandedPaths.has(folderPath)) break;
      if (folderPath === untilPath) break;
      expandedPaths.add(folderPath);
      folderPath = path.dirname(folderPath);
      if (!knownPaths.has(folderPath)) {
        extraPaths.add(folderPath);
      }
    }
  }

  return [[...expandedPaths], [...extraPaths]];
}

async function getFolderChildrenPaths(folderPath: string): Promise<string[]> {
  const dirents = await fs.promises.readdir(folderPath, { withFileTypes: true });
  const childrenPaths = dirents.map((dirent) => fastJoinedPath(folderPath, dirent.name));
  return childrenPaths;
}

async function getFoldersChildrenPaths(foldersPaths: string[]): Promise<string[]> {
  const childrensPaths = await Promise.all(foldersPaths.map(getFolderChildrenPaths));
  const childrenPaths = childrensPaths.flat();
  return childrenPaths;
}

function getGlobPaths(rootPath: string, globs: string[]) {
  return readdir(globs, {
    cwd: rootPath,
    followSymlinks: false,
    ignore: "**/{.git,.sl,.svn,.hg,node_modules}",
  });
}

function getProjectPath(rootPath: string): string {
  function isProjectPath(folderPath: string): boolean {
    const gitPath = path.join(folderPath, ".git");
    if (fs.existsSync(gitPath)) return true;
    const hgPath = path.join(folderPath, ".hg");
    if (fs.existsSync(hgPath)) return true;
    return false;
  }

  let currentPath = rootPath;

  while (true) {
    if (isProjectPath(currentPath)) {
      return currentPath;
    } else {
      const currentPathNext = path.dirname(currentPath);
      if (currentPath === currentPathNext) {
        return rootPath;
      } else {
        currentPath = currentPathNext;
      }
    }
  }
}

async function getTargetsPaths(rootPath: string, globs: string[]) {
  const targetFiles: string[] = [];
  const targetFilesNames: string[] = [];
  const targetGlobs: string[] = [];

  for (const glob of globs) {
    const filePath = path.resolve(rootPath, glob);
    if (isFile(filePath)) {
      targetFiles.push(filePath);
      targetFilesNames.push(path.basename(filePath));
    } else {
      targetGlobs.push(glob);
    }
  }

  const result = await getGlobPaths(rootPath, targetGlobs);
  const filesPaths = [...targetFiles, ...result.files];
  const filesNames = [...targetFilesNames, ...result.filesFoundNames];
  const filesFoundPaths = result.filesFound;
  const foldersFoundPaths = [rootPath, ...result.directoriesFound];
  return [filesPaths, filesNames, filesFoundPaths, foldersFoundPaths];
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isFalsy<T>(value: T): value is Extract<T, 0 | -0 | 0n | -0n | "" | false | null | undefined | void> {
  return !value;
}

function isFile(targetPath: string): boolean {
  try {
    const stats = fs.statSync(targetPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

function isFunction(value: unknown): value is Function {
  return typeof value === "function";
}

function isGlobStatic(glob: string): boolean {
  //TODO: Make this perfect, grammar-based, rather than letting some glob-looking paths slip through
  return /^(?:\\.|[ a-zA-Z0-9/._-])*$/.test(glob);
}

function isInteger(value: unknown): value is number {
  return Number.isInteger(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === "number";
}

function isObject(value: unknown): value is object {
  if (value === null) return false;
  const type = typeof value;
  return type === "object" || type === "function";
}

function isPromise(value: unknown): value is Promise<unknown> {
  return value instanceof Promise;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isTruthy<T>(value: T): value is Exclude<T, 0 | -0 | 0n | -0n | "" | false | null | undefined | void> {
  return !!value;
}

function isUndefined(value: unknown): value is undefined {
  return typeof value === "undefined";
}

//FIXME: Ensure all arguments are actually taken into account
function memoize<Args extends unknown[], Return>(fn: (...args: Args) => Return): ((...args: Args) => Return) & { cache: Map<Args[0], Return> } {
  const memoized = (...args: Args): Return => {
    const { cache } = memoized;
    const id = args[0];
    const cached = cache.get(id);
    if (!isUndefined(cached) || cache.has(id)) return cached;
    const result = fn(...args);
    cache.set(id, result);
    return result;
  };
  memoized.cache = new Map();
  return memoized;
}

function negate<T extends unknown[]>(fn: (...args: T) => boolean) {
  return (...args: T): boolean => {
    return !fn(...args);
  };
}

function noop(): undefined {
  return;
}

function normalizeOptions(options: unknown, targets: unknown[]): Options {
  if (!isObject(options)) exit("Invalid options object");

  const targetsGlobs = targets.filter(isString);
  const targetsStatic = "--" in options && Array.isArray(options["--"]) ? options["--"].filter(isString).map(zeptomatch.escape) : [];
  const globs = [...targetsGlobs, ...targetsStatic];

  if (!globs.length) exit("Expected at least one target file/dir/glob");

  const check = "check" in options && !!options.check;
  const list = "listDifferent" in options && !!options.listDifferent;
  const write = "write" in options && !!options.write;

  if (check && list) exit('The "--check" and "--list-different" flags cannot be used together');

  if (check && write) exit('The "--check" and "--write" flags cannot be used together');

  if (list && write) exit('The "--list-different" and "--write" flags cannot be used together');

  const config = "config" in options ? !!options.config : true;
  const editorConfig = "editorconfig" in options ? !!options.editorconfig : true;

  const cache = "cache" in options ? !!options.cache : true;
  const cacheLocation = "cacheLocation" in options && isString(options.cacheLocation) ? options.cacheLocation : undefined;
  const errorOnUnmatchedPattern = "errorOnUnmatchedPattern" in options ? !!options.errorOnUnmatchedPattern : true;
  const ignoreUnknown = "ignoreUnknown" in options && isBoolean(options.ignoreUnknown) ? !!options.ignoreUnknown : globs.some(isGlobStatic);

  const logLevel = "logLevel" in options ? ((options.logLevel || "log") as LogLevel) : "log";
  const parallel = "parallel" in options && !!options.parallel;
  const parallelWorkers = ("parallelWorkers" in options && Math.round(Number(options.parallelWorkers))) || 0;

  const contextOptions = normalizeContextOptions(options);
  const formatOptions = normalizeFormatOptions(options);

  return {
    globs,
    check,
    list,
    write,
    config,
    editorConfig,
    cache,
    cacheLocation,
    errorOnUnmatchedPattern,
    ignoreUnknown,
    logLevel,
    parallel,
    parallelWorkers,
    contextOptions,
    formatOptions,
  };
}

function normalizeContextOptions(options: unknown): ContextOptions {
  if (!isObject(options)) exit("Invalid options object");

  const contextOptions: ContextOptions = {};

  if ("cursorOffset" in options) {
    const value = Number(options.cursorOffset);
    if (isInteger(value) && value >= 0) {
      contextOptions.cursorOffset = value;
    }
  }

  if ("rangeEnd" in options) {
    const value = Number(options.rangeEnd);
    if (isInteger(value) && value >= 0) {
      contextOptions.rangeEnd = value;
    }
  }

  if ("rangeStart" in options) {
    const value = Number(options.rangeStart);
    if (isInteger(value) && value >= 0) {
      contextOptions.rangeStart = value;
    }
  }

  return contextOptions;
}

function normalizeFormatOptions(options: unknown): FormatOptions {
  if (!isObject(options)) exit("Invalid options object");

  const formatOptions: FormatOptions = {};

  if ("experimentalTernaries" in options) {
    const value = options.experimentalTernaries;
    if (isBoolean(value)) {
      formatOptions.experimentalTernaries = value;
    }
  }

  if ("arrowParens" in options) {
    const value = options.arrowParens;
    if (value === "avoid" || value === "always") {
      formatOptions.arrowParens = value;
    }
  }

  if ("bracketSameLine" in options) {
    const value = options.bracketSameLine;
    if (isBoolean(value)) {
      formatOptions.bracketSameLine = value;
    }
  }

  if ("bracketSpacing" in options) {
    const value = options.bracketSpacing;
    if (isBoolean(value)) {
      formatOptions.bracketSpacing = value;
    }
  }

  if ("embeddedLanguageFormatting" in options) {
    const value = options.embeddedLanguageFormatting;
    if (value === "auto" || value === "off") {
      formatOptions.embeddedLanguageFormatting = value;
    }
  }

  if ("endOfLine" in options) {
    const value = options.endOfLine;
    if (value === "lf" || value === "crlf" || value === "cr" || value === "auto") {
      formatOptions.endOfLine = value;
    }
  }

  if ("htmlWhitespaceSensitivity" in options) {
    const value = options.htmlWhitespaceSensitivity;
    if (value === "css" || value === "strict" || value === "ignore") {
      formatOptions.htmlWhitespaceSensitivity = value;
    }
  }

  if ("insertPragma" in options) {
    const value = options.insertPragma;
    if (isBoolean(value)) {
      formatOptions.insertPragma = value;
    }
  }

  if ("jsxSingleQuote" in options) {
    const value = options.jsxSingleQuote;
    if (isBoolean(value)) {
      formatOptions.jsxSingleQuote = value;
    }
  }

  if ("parser" in options) {
    const value = options.parser;
    // prettier-ignore
    if (value === "flow" || value === "babel" || value === "babel-flow" || value === "babel-ts" || value === "typescript" || value === "acorn" || value === "espree" || value === "meriyah" || value === "css" || value === "less" || value === "scss" || value === "json" || value === "json5" || value === "json-stringify" || value === "graphql" || value === "markdown" || value === "mdx" || value === "vue" || value === "yaml" || value === "glimmer" || value === "html" || value === "angular" || value === "lwc") {
      formatOptions.parser = value;
    }
  }

  if ("printWidth" in options) {
    const value = Number(options.printWidth);
    if (isInteger(value) && value >= 0) {
      formatOptions.printWidth = value;
    }
  }

  if ("proseWrap" in options) {
    const value = options.proseWrap;
    if (value === "always" || value === "never" || value === "preserve") {
      formatOptions.proseWrap = value;
    }
  }

  if ("quoteProps" in options) {
    const value = options.quoteProps;
    if (value === "as-needed" || value === "consistent" || value === "preserve") {
      formatOptions.quoteProps = value;
    }
  }

  if ("requirePragma" in options) {
    const value = options.requirePragma;
    if (isBoolean(value)) {
      formatOptions.requirePragma = value;
    }
  }

  if ("semi" in options) {
    const value = options.semi;
    if (isBoolean(value)) {
      formatOptions.semi = value;
    }
  }

  if ("singleAttributePerLine" in options) {
    const value = options.singleAttributePerLine;
    if (isBoolean(value)) {
      formatOptions.singleAttributePerLine = value;
    }
  }

  if ("singleQuote" in options) {
    const value = options.singleQuote;
    if (isBoolean(value)) {
      formatOptions.singleQuote = value;
    }
  }

  if ("tabWidth" in options) {
    const value = Number(options.tabWidth);
    if (isInteger(value) && value >= 0) {
      formatOptions.tabWidth = value;
    }
  }

  if ("trailingComma" in options) {
    const value = options.trailingComma;
    if (value === "all" || value === "es5" || value === "none") {
      formatOptions.trailingComma = value;
    }
  }

  if ("useTabs" in options) {
    const value = options.useTabs;
    if (isBoolean(value)) {
      formatOptions.useTabs = value;
    }
  }

  if ("vueIndentScriptAndStyle" in options) {
    const value = options.vueIndentScriptAndStyle;
    if (isBoolean(value)) {
      formatOptions.vueIndentScriptAndStyle = value;
    }
  }

  return formatOptions;
}

function normalizePrettierOptions(options: unknown, folderPath: string): PrettierConfigWithOverrides {
  if (!isObject(options)) exit("Invalid options object");

  const config: PrettierConfigWithOverrides = normalizeFormatOptions(options);

  if ("overrides" in options && isArray(options.overrides)) {
    const overridesRaw = options.overrides;
    for (let i = 0, l = overridesRaw.length; i < l; i++) {
      const overrideRaw = overridesRaw[i];
      if (!isObject(overrideRaw)) continue;
      if (!("files" in overrideRaw)) continue;
      if (!isString(overrideRaw.files) && (!isArray(overrideRaw.files) || !overrideRaw.files.every(isString))) continue;
      if (isArray(overrideRaw.files) && !overrideRaw.files.length) continue;
      if (!("options" in overrideRaw)) continue;
      if (!isObject(overrideRaw.options)) continue;
      const overrides = (config.overrides ||= []);
      const filesPositive = castArray(overrideRaw.files);
      const filesNegative = "filesNegative" in overrideRaw && (isString(overrideRaw.filesNegative) || (isArray(overrideRaw.filesNegative) && overrideRaw.filesNegative.every(isString))) ? castArray(overrideRaw.filesNegative) : []; // prettier-ignore
      const folder = folderPath;
      const options = normalizeFormatOptions(overrideRaw.options);
      overrides.push({ filesPositive, filesNegative, folder, options });
    }
  }

  return config;
}

function omit<T extends object, K extends keyof T>(object: T, keys: K[]): Omit<T, K> {
  const clone = { ...object };

  for (let i = 0, l = keys.length; i < l; i++) {
    delete clone[keys[i]];
  }

  return clone;
}

function once<T>(fn: () => T): () => T {
  let inited = false;
  let result: T;

  return (): T => {
    if (!inited) {
      inited = true;
      result = fn();
    }
    return result;
  };
}

function pluralize(value: string, length: number): string {
  return `${value}${length === 1 ? "" : "s"}`;
}

function resolve<T>(value: FunctionMaybe<T>): T {
  return isFunction(value) ? value() : value;
}

function sha1hex(value: Uint8Array | string): string {
  return crypto.createHash("sha1").update(value).digest("hex");
}

function sha1base64(value: Uint8Array | string): string {
  return crypto.createHash("sha1").update(value).digest("base64");
}

function someOf<T>(fns: ((arg: T) => unknown)[]): (arg: T) => boolean {
  return (arg: T): boolean => {
    return fns.some((fn) => fn(arg));
  };
}

function zipObject<T extends Key, U>(keys: T[], values: U[]): Partial<Record<T, U>> {
  const map: Partial<Record<T, U>> = {};

  for (let i = 0, l = keys.length; i < l; i++) {
    map[keys[i]] = values[i];
  }

  return map;
}

function zipObjectUnless<T extends Key, U>(keys: T[], values: U[], unless: (value: U) => boolean): Partial<Record<T, U>> {
  const map: Partial<Record<T, U>> = {};

  for (let i = 0, l = keys.length; i < l; i++) {
    const value = values[i];
    if (!unless(value)) {
      map[keys[i]] = value;
    }
  }

  return map;
}

export {
  castArray,
  everyOf,
  fastJoinedPath,
  fastRelativePath,
  fastRelativeChildPath,
  findLastIndex,
  getCachePath,
  getFolderChildrenPaths,
  getFoldersChildrenPaths,
  getExpandedFoldersPaths,
  getGlobPaths,
  getProjectPath,
  getTargetsPaths,
  isArray,
  isBoolean,
  isFalsy,
  isFunction,
  isInteger,
  isNumber,
  isObject,
  isPromise,
  isString,
  isTruthy,
  isUndefined,
  memoize,
  negate,
  noop,
  normalizeOptions,
  normalizeFormatOptions,
  normalizePrettierOptions,
  omit,
  once,
  pluralize,
  resolve,
  sha1hex,
  sha1base64,
  someOf,
  zipObject,
  zipObjectUnless,
};
