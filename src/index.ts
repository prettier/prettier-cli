import fs from "node:fs/promises";
import isBinaryPath from "is-binary-path";
import stringify from "json-sorted-stringify";
import path from "node:path";
import process from "node:process";
import Cache from "./cache.js";
import { getEditorConfigsMap, getEditorConfigResolved, getEditorConfigFormatOptions } from "./config_editorconfig.js";
import { getIgnoresContentMap, getIgnoreBys, getIgnoreResolved } from "./config_ignore.js";
import { Loaders, File2Loader, getPrettierConfigsMap, getPrettierConfigBys, getPrettierConfigResolved } from "./config_prettier.js";
import { PRETTIER_VERSION, CLI_VERSION } from "./constants.js";
import Known from "./known.js";
import Logger from "./logger.js";
import { makePrettier } from "./prettier.js";
import { castArray, getExpandedFoldersPaths, getFoldersChildrenPaths, getPluginsVersions, getProjectPath, getStdin, getTargetsPaths } from "./utils.js";
import {
  fastRelativePath,
  isNull,
  isString,
  isUndefined,
  negate,
  normalizePathSeparatorsToPosix,
  pluralize,
  trimFinalNewline,
  uniq,
  without,
} from "./utils.js";
import type { FormatOptions, Options, PluginsOptions } from "./types.js";

async function run(options: Options, pluginsDefaultOptions: PluginsOptions, pluginsCustomOptions: PluginsOptions): Promise<void> {
  if (options.globs.length || !isString(await getStdin())) {
    return runGlobs(options, pluginsDefaultOptions, pluginsCustomOptions);
  } else {
    return runStdin(options, pluginsDefaultOptions, pluginsCustomOptions);
  }
}

async function runStdin(options: Options, pluginsDefaultOptions: PluginsOptions, pluginsCustomOptions: PluginsOptions): Promise<void> {
  const stderr = new Logger(options.logLevel, "stderr");
  const stdout = new Logger(options.logLevel, "stdout");
  const prettier = await import("./prettier_serial.js");

  const fileName = options.stdinFilepath || "stdin";
  const fileContent = (await getStdin()) || "";

  try {
    const formatted = await prettier.format(fileName, fileContent, options.formatOptions, options.contextOptions, pluginsDefaultOptions, pluginsCustomOptions);
    if (options.check || options.list) {
      if (formatted !== fileContent) {
        stdout.warn("(stdin)");
      }
    } else {
      stdout.always(trimFinalNewline(formatted));
    }
    process.exitCode = (options.check || options.list) && formatted !== fileContent ? 1 : 0;
  } catch (error) {
    stderr.prefixed.error(String(error));
    process.exitCode = 1;
  }
}

async function runGlobs(options: Options, pluginsDefaultOptions: PluginsOptions, pluginsCustomOptions: PluginsOptions): Promise<void> {
  const stderr = new Logger(options.logLevel, "stderr");
  const stdout = new Logger(options.logLevel, "stdout");
  const spinner = options.check ? stdout.spinner.log() : undefined;

  spinner?.start("Checking formatting...");

  const rootPath = process.cwd();
  const projectPath = getProjectPath(rootPath);
  const [filesPaths, filesNames, filesNamesToPaths, filesExplicitPaths, filesFoundPaths, foldersFoundPaths] = await getTargetsPaths(rootPath, options.globs, options.withNodeModules); // prettier-ignore
  const filesExplicitPathsSet = new Set(filesExplicitPaths);
  const filesPathsTargets = filesPaths.filter(negate(isBinaryPath)).sort();
  const [foldersPathsTargets, foldersExtraPaths] = getExpandedFoldersPaths(foldersFoundPaths, projectPath);
  const filesExtraPaths = await getFoldersChildrenPaths([rootPath, ...foldersExtraPaths]);
  const filesExtraNames = filesExtraPaths.map((filePath) => path.basename(filePath));

  Known.addFilesPaths(filesFoundPaths);
  Known.addFilesPaths(filesExtraPaths);

  Known.addFilesNames(filesNames);
  Known.addFilesNames(filesExtraNames);

  const prettierVersion = PRETTIER_VERSION;
  const cliVersion = CLI_VERSION;
  const pluginsNames = options.formatOptions.plugins || [];
  const pluginsVersions = getPluginsVersions(pluginsNames);
  const pluginsVersionsMissing = pluginsVersions.filter(isNull);

  const editorConfigNames = options.editorConfig ? [".editorconfig"].filter(Known.hasFileName) : [];
  const ignoreNames = options.ignore ? [".gitignore", ".prettierignore"].filter(Known.hasFileName) : [];
  const prettierConfigNames = options.config ? without(Object.keys(File2Loader), ["default"]).filter(Known.hasFileName) : [];

  const fileNames2parentPaths = (names: string[]) => names.flatMap((name) => filesNamesToPaths[name]?.map(path.dirname) || []);
  const editorConfigPaths = uniq([...fileNames2parentPaths(editorConfigNames), rootPath, ...foldersExtraPaths]);
  const ignorePaths = uniq([...fileNames2parentPaths(ignoreNames), rootPath, ...foldersExtraPaths]);
  const prettierConfigPaths = uniq([...fileNames2parentPaths(prettierConfigNames), rootPath, ...foldersExtraPaths]);

  const editorConfigs = options.editorConfig ? await getEditorConfigsMap(editorConfigPaths, editorConfigNames) : {};
  const ignoreContents = options.ignore ? await getIgnoresContentMap(ignorePaths, ignoreNames) : {};
  const prettierConfigs = options.config ? await getPrettierConfigsMap(prettierConfigPaths, prettierConfigNames) : {};

  const ignoreManualFilesNames = options.ignore ? options.ignorePath || [] : [];
  const ignoreManualFilesPaths = ignoreManualFilesNames.map((fileName) => path.resolve(fileName));
  const ignoreManualFilesContents = await Promise.all(ignoreManualFilesPaths.map((filePath) => fs.readFile(filePath, "utf8").catch(() => "")));
  const ignoreManualFoldersPaths = ignoreManualFilesPaths.map(path.dirname);
  const ignoreManual = getIgnoreBys(ignoreManualFoldersPaths, ignoreManualFilesContents.map(castArray));

  const prettierManualFilesNames = options.configPath || [];
  const prettierManualFilesPaths = prettierManualFilesNames.map((fileName) => path.resolve(fileName));
  const prettierManualFilesContents = await Promise.all(prettierManualFilesPaths.map((filePath) => fs.readFile(filePath, "utf8")));
  const prettierManualConfigs = await Promise.all(prettierManualFilesPaths.map(Loaders.auto));
  const prettierManualFoldersPaths = prettierManualFilesPaths.map(path.dirname);
  const prettierManualConfig = getPrettierConfigBys(prettierManualFoldersPaths, prettierManualConfigs);

  const cliContextConfig = options.contextOptions;
  const cliFormatConfig = options.formatOptions;
  const cacheVersion = stringify({ prettierVersion, cliVersion, pluginsNames, pluginsVersions, editorConfigs, ignoreContents, prettierConfigs, ignoreManualFilesPaths, ignoreManualFilesContents, prettierManualFilesPaths, prettierManualFilesContents, cliContextConfig, cliFormatConfig, pluginsDefaultOptions, pluginsCustomOptions }); // prettier-ignore

  const shouldCache = options.cache && !options.dump && !pluginsVersionsMissing.length && isUndefined(cliContextConfig.cursorOffset);
  const cache = shouldCache ? new Cache(cacheVersion, projectPath, options, stdout) : undefined;
  const prettier = await makePrettier(options, cache);

  //TODO: Maybe do work in chunks here, as keeping too many formatted files in memory can be a problem
  const filesResults = await Promise.allSettled(
    filesPathsTargets.map(async (filePath) => {
      const isIgnored = () => (ignoreManual ? ignoreManual(filePath) : getIgnoreResolved(filePath, ignoreNames));
      const isCacheable = () => cache?.has(filePath, isIgnored);
      const isExplicitlyIncluded = () => filesExplicitPathsSet.has(filePath);
      const isForceIncluded = options.dump && isExplicitlyIncluded();
      const isExcluded = cache ? !(await isCacheable()) : await isIgnored();
      if (!isForceIncluded && isExcluded) return;
      const getFormatOptions = async (): Promise<FormatOptions> => {
        const editorConfig = options.editorConfig ? getEditorConfigFormatOptions(await getEditorConfigResolved(filePath, editorConfigNames)) : {};
        const prettierConfig = prettierManualConfig
          ? prettierManualConfig(filePath)
          : options.config
            ? await getPrettierConfigResolved(filePath, prettierConfigNames)
            : {};
        const formatOptions = { ...editorConfig, ...prettierConfig, ...options.formatOptions };
        return formatOptions;
      };
      try {
        if (options.check || options.list) {
          return await prettier.checkWithPath(filePath, getFormatOptions, cliContextConfig, pluginsDefaultOptions, pluginsCustomOptions);
        } else if (options.write) {
          return await prettier.writeWithPath(filePath, getFormatOptions, cliContextConfig, pluginsDefaultOptions, pluginsCustomOptions);
        } else {
          return await prettier.formatWithPath(filePath, getFormatOptions, cliContextConfig, pluginsDefaultOptions, pluginsCustomOptions);
        }
      } finally {
        spinner?.update(fastRelativePath(rootPath, filePath));
      }
    }),
  );

  spinner?.stop("Checking formatting...");

  let totalMatched = filesResults.length;
  let totalIgnored = 0;
  let totalFormatted = 0;
  let totalUnformatted = 0;
  let totalUnknown = 0;
  let pathsUnknown: string[] = [];
  let totalErrored = 0;
  let pathsErrored: string[] = [];

  for (let i = 0, l = filesResults.length; i < l; i++) {
    const fileResult = filesResults[i];
    if (fileResult.status === "fulfilled") {
      if (isUndefined(fileResult.value)) {
        totalMatched -= 1;
        totalIgnored += 1;
      } else if (isString(fileResult.value)) {
        stdout.always(trimFinalNewline(fileResult.value));
      } else {
        if (fileResult.value) {
          totalFormatted += 1;
        } else {
          totalUnformatted += 1;
          const filePath = filesPathsTargets[i];
          const fileNameToDisplay = normalizePathSeparatorsToPosix(fastRelativePath(rootPath, filePath));
          if (options.check) {
            stderr.prefixed.warn(fileNameToDisplay);
          } else if (options.list || options.write) {
            stdout.warn(fileNameToDisplay);
          }
        }
      }
    } else {
      const error = fileResult.reason;
      if (error.name === "UndefinedParserError") {
        totalUnknown += 1;
        pathsUnknown.push(filesPathsTargets[i]);
      }
      if (error.name !== "UndefinedParserError" || !options.ignoreUnknown) {
        totalErrored += 1;
        pathsErrored.push(filesPathsTargets[i]);
        const filePath = filesPathsTargets[i];
        const fileNameToDisplay = normalizePathSeparatorsToPosix(fastRelativePath(rootPath, filePath));
        //TODO: Make sure the error is syntax-highlighted when possible
        if (options.check || options.write || options.dump) {
          stderr.prefixed.error(`${fileNameToDisplay}: ${error}`);
        } else if (options.list) {
          stderr.error(fileNameToDisplay);
        }
      }
    }
  }

  stdout.prefixed.debug(`Files found: ${totalMatched + totalIgnored}`);
  stdout.prefixed.debug(`Files matched: ${totalMatched}`);
  stdout.prefixed.debug(`Files ignored: ${totalIgnored}`);
  stdout.prefixed.debug(`Files formatted: ${totalFormatted}`);
  stdout.prefixed.debug(`Files unformatted: ${totalUnformatted}`);
  stdout.prefixed.debug(`Files unknown: ${totalUnknown}`);
  stdout.prefixed.debug(() => pathsUnknown.map((filePath) => normalizePathSeparatorsToPosix(fastRelativePath(rootPath, filePath))).join("\n"));
  stdout.prefixed.debug(`Files errored: ${totalErrored}`);
  stdout.prefixed.debug(() => pathsErrored.map((filePath) => normalizePathSeparatorsToPosix(fastRelativePath(rootPath, filePath))).join("\n"));

  if (!totalMatched && !totalIgnored) {
    if (options.errorOnUnmatchedPattern) {
      stderr.prefixed.error(`No files matching the given patterns were found.`);
    }
  }

  if (totalUnformatted) {
    if (options.check) {
      stderr.prefixed.warn(`Code style issues found in ${totalUnformatted} ${pluralize("file", totalUnformatted)}. Run Prettier with --write to fix.`);
    }
  }

  // if (totalErrored) {
  //   if (options.check) {
  //     logger.prefixed.error(`Parsing issues found in ${totalErrored} ${pluralize("file", totalErrored)}. Check files to fix.`);
  //   }
  // }

  if (!totalUnformatted && !totalErrored) {
    if (options.check) {
      stdout.log("All matched files use Prettier code style!");
    }
  }

  cache?.write();

  process.exitCode = (!totalMatched && !totalIgnored && options.errorOnUnmatchedPattern) || totalErrored || (totalUnformatted && !options.write) ? 1 : 0;
}

export { run, runStdin, runGlobs };
