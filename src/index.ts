import fs from "node:fs/promises";
import isBinaryPath from "is-binary-path";
import stringify from "json-sorted-stringify";
import path from "node:path";
import process from "node:process";
import Cache from "./cache.js";
import { getEditorConfigsMap, getEditorConfigResolved, getEditorConfigFormatOptions } from "./config_editorconfig.js";
import { getIgnoresContentMap, getIgnoreBys, getIgnoreResolved } from "./config_ignore.js";
import { Loaders, getPrettierConfigsMap, getPrettierConfigResolved } from "./config_prettier.js";
import { PRETTIER_VERSION, CLI_VERSION } from "./constants.js";
import Known from "./known.js";
import Logger from "./logger.js";
import { makePrettier } from "./prettier.js";
import { castArray, getExpandedFoldersPaths, getFoldersChildrenPaths, getPluginsVersions, getProjectPath, getStdin, getTargetsPaths } from "./utils.js";
import { fastRelativePath, isString, isUndefined, negate, pluralize, trimFinalNewline, uniq } from "./utils.js";
import type { FormatOptions, Options, PluginsOptions, Ignore, LazyFormatOptions } from "./types.js";

async function addKnownFiles(rootPath: string, targetsPaths: [string[], string[], Record<string, string[]>, string[], string[]]): Promise<void> {
  const projectPath = getProjectPath(rootPath);
  const [_filesPaths, filesNames, _filesNamesToPaths, filesFoundPaths, foldersFoundPaths] = targetsPaths;
  // TODO (43081j): this currently runs twice, once here and once in `runGlobs`.
  // we should probably somehow rework this code so we only compute it once
  const [_foldersPathsTargets, foldersExtraPaths] = getExpandedFoldersPaths(foldersFoundPaths, projectPath);
  const filesExtraPaths = await getFoldersChildrenPaths([rootPath, ...foldersExtraPaths]);
  const filesExtraNames = filesExtraPaths.map((filePath) => path.basename(filePath));

  Known.addFilesPaths(filesFoundPaths);
  Known.addFilesPaths(filesExtraPaths);

  Known.addFilesNames(filesNames);
  Known.addFilesNames(filesExtraNames);
}

const DEFAULT_EDITOR_CONFIG_NAMES = [".editorconfig"];
const DEFAULT_IGNORE_NAMES = [".gitignore", ".prettierignore"];
const DEFAULT_CONFIG_NAMES = [
  "package.json",
  ".prettierrc",
  ".prettierrc.yml",
  ".prettierrc.yaml",
  ".prettierrc.json",
  ".prettierrc.jsonc",
  ".prettierrc.json5",
  ".prettierrc.js",
  "prettier.config.js",
  ".prettierrc.cjs",
  "prettier.config.cjs",
  ".prettierrc.mjs",
  "prettier.config.mjs",
];

interface PrettierManualConfigs {
  filePaths: string[];
  config: unknown;
}

async function getPrettierManualConfigs(options: Options): Promise<PrettierManualConfigs> {
  const fileNames = options.configPath || [];
  const filePaths = fileNames.map((fileName) => path.resolve(fileName));
  const configs = await Promise.all(filePaths.map(Loaders.auto));
  const config = configs.length ? Object.assign({}, ...configs) : undefined;

  return {
    filePaths,
    config,
  };
}

interface IgnoreManualConfigs {
  isIgnored: Ignore | undefined;
  filePaths: string[];
  fileContents: string[];
}

async function getIgnoreManualConfigs(options: Options): Promise<IgnoreManualConfigs> {
  const fileNames = options.ignore ? options.ignorePath || [] : [];
  const filePaths = fileNames.map((fileName) => path.resolve(fileName));
  const fileContents = await Promise.all(filePaths.map((filePath) => fs.readFile(filePath, "utf8").catch(() => "")));
  const folderPaths = filePaths.map(path.dirname);
  const isIgnored = getIgnoreBys(folderPaths, fileContents.map(castArray));
  return {
    isIgnored,
    filePaths,
    fileContents,
  };
}

function getFormatOptionsFactory(filePath: string, options: Options, prettierConfigs: PrettierManualConfigs): () => Promise<FormatOptions> {
  // TODO (43081j): somehow avoid repeating this logic, as we also run it in
  // the function which calls this one
  const editorConfigNames = options.editorConfig ? DEFAULT_EDITOR_CONFIG_NAMES.filter(Known.hasFileName) : [];
  const prettierConfigNames = options.config ? DEFAULT_CONFIG_NAMES.filter(Known.hasFileName) : []; // prettier-ignore

  return async (): Promise<FormatOptions> => {
    const editorConfig = options.editorConfig ? getEditorConfigFormatOptions(await getEditorConfigResolved(filePath, editorConfigNames)) : {};
    const prettierConfig = prettierConfigs.config || (options.config ? await getPrettierConfigResolved(filePath, prettierConfigNames) : {});
    const formatOptions = { ...editorConfig, ...prettierConfig, ...options.formatOptions };
    return formatOptions;
  };
}

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

  let getFormatOptions: LazyFormatOptions;

  if (options.stdinFilepath) {
    const filePath = path.resolve(fileName);
    const rootPath = process.cwd();
    const targetsPaths = await getTargetsPaths(rootPath, options.globs, options.withNodeModules);

    await addKnownFiles(rootPath, targetsPaths);

    const prettierManualConfigs = await getPrettierManualConfigs(options);
    getFormatOptions = getFormatOptionsFactory(filePath, options, prettierManualConfigs);
  } else {
    getFormatOptions = options.formatOptions;
  }

  try {
    const formatted = await prettier.format(fileName, fileContent, getFormatOptions, options.contextOptions, pluginsDefaultOptions, pluginsCustomOptions);
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
  const targetsPaths = await getTargetsPaths(rootPath, options.globs, options.withNodeModules);
  const [filesPaths, _filesNames, filesNamesToPaths, _filesFoundPaths, foldersFoundPaths] = targetsPaths;
  const filesPathsTargets = filesPaths.filter(negate(isBinaryPath)).sort();
  const [_foldersPathsTargets, foldersExtraPaths] = getExpandedFoldersPaths(foldersFoundPaths, projectPath);

  await addKnownFiles(rootPath, targetsPaths);

  const prettierVersion = PRETTIER_VERSION;
  const cliVersion = CLI_VERSION;
  const pluginsNames = options.formatOptions.plugins || [];
  const pluginsVersions = getPluginsVersions(pluginsNames);

  const editorConfigNames = options.editorConfig ? DEFAULT_EDITOR_CONFIG_NAMES.filter(Known.hasFileName) : [];
  const ignoreNames = options.ignore ? DEFAULT_IGNORE_NAMES.filter(Known.hasFileName) : [];
  const prettierConfigNames = options.config ? DEFAULT_CONFIG_NAMES.filter(Known.hasFileName) : []; // prettier-ignore

  const fileNames2parentPaths = (names: string[]) => names.flatMap((name) => filesNamesToPaths[name]?.map(path.dirname) || []);
  const editorConfigPaths = uniq([...fileNames2parentPaths(editorConfigNames), rootPath, ...foldersExtraPaths]);
  const ignorePaths = uniq([...fileNames2parentPaths(ignoreNames), rootPath, ...foldersExtraPaths]);
  const prettierConfigPaths = uniq([...fileNames2parentPaths(prettierConfigNames), rootPath, ...foldersExtraPaths]);

  const editorConfigs = options.editorConfig ? await getEditorConfigsMap(editorConfigPaths, editorConfigNames) : {};
  const ignoreContents = options.ignore ? await getIgnoresContentMap(ignorePaths, ignoreNames) : {};
  const prettierConfigs = options.config ? await getPrettierConfigsMap(prettierConfigPaths, prettierConfigNames) : {};

  const ignoreManualConfigs = await getIgnoreManualConfigs(options);
  const ignoreManualFilesPaths = ignoreManualConfigs.filePaths;
  const ignoreManualFilesContents = ignoreManualConfigs.fileContents;
  const ignoreManual = ignoreManualConfigs.isIgnored;

  const prettierManualConfigs = await getPrettierManualConfigs(options);
  const prettierManualFilesPaths = prettierManualConfigs.filePaths;
  const prettierManualFilesContents = await Promise.all(prettierManualFilesPaths.map((filePath) => fs.readFile(filePath, "utf8")));

  const cliContextConfig = options.contextOptions;
  const cliFormatConfig = options.formatOptions;
  const cacheVersion = stringify({ prettierVersion, cliVersion, pluginsNames, pluginsVersions, editorConfigs, ignoreContents, prettierConfigs, ignoreManualFilesPaths, ignoreManualFilesContents, prettierManualFilesPaths, prettierManualFilesContents, cliContextConfig, cliFormatConfig, pluginsDefaultOptions, pluginsCustomOptions }); // prettier-ignore

  const shouldCache = options.cache && isUndefined(cliContextConfig.cursorOffset);
  const cache = shouldCache ? new Cache(cacheVersion, projectPath, options, stdout) : undefined;
  const prettier = await makePrettier(options, cache);

  //TODO: Maybe do work in chunks here, as keeping too many formatted files in memory can be a problem
  const filesResults = await Promise.allSettled(
    filesPathsTargets.map(async (filePath) => {
      const isIgnored = () => (ignoreManual ? ignoreManual(filePath) : getIgnoreResolved(filePath, ignoreNames));
      const isCacheable = () => cache?.has(filePath, isIgnored);
      const ignored = cache ? !(await isCacheable()) : await isIgnored();
      if (ignored) return;
      const getFormatOptions = getFormatOptionsFactory(filePath, options, prettierManualConfigs);
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
          const fileRelativePath = fastRelativePath(rootPath, filePath);
          if (options.check) {
            stderr.prefixed.warn(fileRelativePath);
          } else if (options.list || options.write) {
            stdout.warn(fileRelativePath);
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
        const fileRelativePath = fastRelativePath(rootPath, filePath);
        //TODO: Make sure the error is syntax-highlighted when possible
        if (options.check || options.write) {
          stderr.prefixed.error(`${fileRelativePath}: ${error}`);
        } else if (options.list) {
          stderr.error(fileRelativePath);
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
  stdout.prefixed.debug(() => pathsUnknown.map((filePath) => fastRelativePath(rootPath, filePath)).join("\n"));
  stdout.prefixed.debug(`Files errored: ${totalErrored}`);
  stdout.prefixed.debug(() => pathsErrored.map((filePath) => fastRelativePath(rootPath, filePath)).join("\n"));

  if (!totalMatched && !totalIgnored) {
    if (options.errorOnUnmatchedPattern) {
      stderr.prefixed.error(`No files matching the given patterns were found`);
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
