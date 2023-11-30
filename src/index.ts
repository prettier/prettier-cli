import stringify from "json-sorted-stringify";
import process from "node:process";
import Cache from "./cache.js";
import { getEditorConfigsMap, getEditorConfigResolved, getEditorConfigFormatOptions } from "./config_editorconfig.js";
import { getIgnoresContentMap, getIgnoreResolved } from "./config_ignore.js";
import { getPrettierConfigsMap, getPrettierConfigResolved } from "./config_prettier.js";
import Known from "./known.js";
import Logger from "./logger.js";
import { makePrettier } from "./prettier.js";
import { getExpandedFoldersPaths, getFoldersChildrenPaths, getProjectPath, getTargetsPaths } from "./utils.js";
import { fastRelativePath, isString, isUndefined, pluralize } from "./utils.js";
import type { FormatOptions, Options } from "./types.js";

async function run(options: Options): Promise<void> {
  const logger = new Logger(options.logLevel);

  if (options.check) {
    logger.log("Checking formatting...");
  }

  const rootPath = process.cwd();
  const projectPath = getProjectPath(rootPath);
  const [filesPaths, filesFoundPaths, foldersFoundPaths] = await getTargetsPaths(projectPath, options.globs);
  const filesPathsTargets = filesPaths.sort();
  const [foldersPathsTargetsUnsorted, foldersExtraPaths] = getExpandedFoldersPaths(foldersFoundPaths, projectPath);
  const foldersPathsTargets = [...foldersPathsTargetsUnsorted, rootPath, ...foldersExtraPaths];
  const filesExtraPaths = await getFoldersChildrenPaths([rootPath, ...foldersExtraPaths]);

  Known.addFiles(filesFoundPaths);
  Known.addFiles(filesExtraPaths);

  Known.addFolders(foldersFoundPaths);
  Known.addFolders(foldersExtraPaths);

  const prettierVersion = "3.1.0"; //TODO: Hard-coding this is error-prone
  const cliVersion = "0.1.0"; //TODO: Hard-coding this is error-prone
  const pluginsVersions = ""; //TODO
  const editorConfigs = options.editorConfig ? await getEditorConfigsMap(foldersPathsTargets) : {};
  const ignoreContents = await getIgnoresContentMap(foldersPathsTargets);
  const prettierConfigs = options.config ? await getPrettierConfigsMap(foldersPathsTargets) : {};
  const cliConfig = options.formatOptions;
  const cacheVersion = stringify({ prettierVersion, cliVersion, pluginsVersions, editorConfigs, ignoreContents, prettierConfigs, cliConfig }); // prettier-ignore

  Known.reset();

  const cache = new Cache(cacheVersion, projectPath, options, logger);
  const prettier = await makePrettier(options, cache);

  //TODO: Maybe do work in chunks here, as keeping too many formatted files in memory can be a problem
  const filesResults = await Promise.allSettled(
    filesPathsTargets.map(async (filePath) => {
      const ignored = await getIgnoreResolved(filePath);
      if (ignored) return;
      const getFormatOptions = async (): Promise<FormatOptions> => {
        const editorConfig = options.editorConfig ? getEditorConfigFormatOptions(await getEditorConfigResolved(filePath)) : {}; // prettier-ignore
        const prettierConfig = options.config ? await getPrettierConfigResolved(filePath) : {};
        const formatOptions = { ...editorConfig, ...prettierConfig, ...options.formatOptions };
        return formatOptions;
      };
      if (options.check || options.list) {
        return prettier.checkWithPath(filePath, getFormatOptions);
      } else if (options.write) {
        return prettier.writeWithPath(filePath, getFormatOptions);
      } else {
        return prettier.formatWithPath(filePath, getFormatOptions);
      }
    }),
  );

  let totalFound = filesResults.length;
  let totalFormatted = 0;
  let totalUnformatted = 0;
  let totalErrored = 0;

  for (let i = 0, l = filesResults.length; i < l; i++) {
    const fileResult = filesResults[i];
    if (fileResult.status === "fulfilled") {
      if (isUndefined(fileResult.value)) {
        totalFound -= 1;
        continue;
      } else if (isString(fileResult.value)) {
        logger.always(fileResult.value);
      } else {
        if (fileResult.value) {
          totalFormatted += 1;
        } else {
          totalUnformatted += 1;
          const filePath = filesPathsTargets[i];
          const fileRelativePath = fastRelativePath(rootPath, filePath);
          if (options.check) {
            logger.prefixed.warn(fileRelativePath);
          } else if (options.list || options.write) {
            logger.warn(fileRelativePath);
          }
        }
      }
    } else {
      const error = fileResult.reason;
      if (error.name !== "UndefinedParserError" || !options.ignoreUnknown) {
        totalErrored += 1;
        const filePath = filesPathsTargets[i];
        const fileRelativePath = fastRelativePath(rootPath, filePath);
        //TODO: Make sure the error is syntax-highlighted when possible
        if (options.check || options.write) {
          logger.prefixed.error(`${fileRelativePath}: ${error}`);
        } else if (options.list) {
          logger.error(fileRelativePath);
        }
      }
    }
  }

  if (!totalFound) {
    if (options.errorOnUnmatchedPattern) {
      logger.prefixed.error(`No files matching the given patterns were found`);
    }
  }

  if (totalUnformatted) {
    if (options.check) {
      logger.prefixed.warn(
        `Code style issues found in ${totalUnformatted} ${pluralize("file", totalUnformatted)}. Run Prettier to fix.`,
      );
    }
  }

  // if (totalErrored) {
  //   if (options.check) {
  //     logger.prefixed.error(
  //       `Parsing issues found in ${totalErrored} ${pluralize("file", totalErrored)}. Check files to fix.`,
  //     );
  //   }
  // }

  if (!totalUnformatted && !totalErrored) {
    if (options.check) {
      logger.log("All matched files use Prettier code style!");
    }
  }

  cache.write();

  process.exitCode = (!totalFound && options.errorOnUnmatchedPattern) || totalErrored || (totalUnformatted && !options.write) ? 1 : 0; // prettier-ignore
}

export { run };
