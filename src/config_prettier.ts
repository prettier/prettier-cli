import yaml from "js-yaml";
import JSON5 from "json5";
import fs from "node:fs";
import path from "node:path";
import JSONC from "tiny-jsonc";
import zeptomatch from "zeptomatch";
import Known from "./known.js";
import { fastJoinedPath, fastRelativeChildPath, getModule, getModulePath } from "./utils.js";
import { isObject, isString, isTruthy, isUndefined, memoize, noop, normalizePrettierOptions, omit, zipObjectUnless } from "./utils.js";
import type { PrettierConfig, PrettierConfigWithOverrides, PromiseMaybe } from "./types.js";

//TODO: Maybe add support for TOML

const Loaders = {
  js: async (filePath: string): Promise<unknown> => {
    const module = await import(filePath);
    return module.default || module.exports || module.prettier || module;
  },
  json: async (filePath: string): Promise<unknown> => {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const config = JSON.parse(fileContent);
    return config;
  },
  jsonc: async (filePath: string): Promise<unknown> => {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const config = JSONC.parse(fileContent);
    return config;
  },
  json5: async (filePath: string): Promise<unknown> => {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const config = JSON5.parse(fileContent);
    return config;
  },
  package: async (filePath: string): Promise<unknown> => {
    const fileContent = fs.readFileSync(filePath, "utf8");
    const pkg = JSON.parse(fileContent);
    if (isObject(pkg) && "prettier" in pkg) {
      const config = pkg.prettier;
      if (isObject(config)) {
        return config;
      } else if (isString(config)) {
        const modulePath = getModulePath(config, filePath);
        return Loaders.js(modulePath);
      }
    }
  },
  yaml: async (filePath: string): Promise<unknown> => {
    const fileContent = fs.readFileSync(filePath, "utf8");
    return yaml.load(fileContent, {
      schema: yaml.JSON_SCHEMA,
    });
  },
};

const File2Loader: Record<string, (filePath: string) => Promise<unknown>> = {
  default: Loaders.yaml,
  "package.json": Loaders.package,
  ".prettierrc": Loaders.yaml,
  ".prettierrc.yml": Loaders.yaml,
  ".prettierrc.yaml": Loaders.yaml,
  ".prettierrc.json": Loaders.json,
  ".prettierrc.jsonc": Loaders.jsonc,
  ".prettierrc.json5": Loaders.json5,
  ".prettierrc.js": Loaders.js,
  ".prettierrc.cjs": Loaders.js,
  ".prettierrc.mjs": Loaders.js,
  "prettier.config.js": Loaders.js,
  "prettier.config.cjs": Loaders.js,
  "prettier.config.mjs": Loaders.js,
};

const getPrettierConfig = (folderPath: string, fileName: string): PromiseMaybe<PrettierConfigWithOverrides | undefined> => {
  const filePath = fastJoinedPath(folderPath, fileName);
  if (!Known.hasFilePath(filePath)) return;
  const loader = File2Loader[fileName] || File2Loader["default"];
  const normalize = (config: unknown) => (isObject(config) ? { ...config, ...normalizePrettierOptions(config, folderPath) } : undefined);
  return loader(filePath).then(normalize).catch(noop);
};

const getPrettierConfigs = memoize(async (folderPath: string, filesNames: string[]): Promise<PrettierConfigWithOverrides[] | undefined> => {
  const configsRaw = await Promise.all(filesNames.map((fileName) => getPrettierConfig(folderPath, fileName)));
  const configs = configsRaw.filter(isTruthy);
  if (!configs.length) return;
  return configs;
});

const getPrettierConfigsMap = async (foldersPaths: string[], filesNames: string[]): Promise<Partial<Record<string, PrettierConfig[]>>> => {
  const configs = await Promise.all(foldersPaths.map((folderPath) => getPrettierConfigs(folderPath, filesNames)));
  const map = zipObjectUnless(foldersPaths, configs, isUndefined);
  return map;
};

const getPrettierConfigsUp = memoize(async (folderPath: string, filesNames: string[]): Promise<PrettierConfigWithOverrides[]> => {
  const config = (await getPrettierConfigs(folderPath, filesNames))?.[0];
  const folderPathUp = path.dirname(folderPath);
  const configsUp = folderPath !== folderPathUp ? await getPrettierConfigsUp(folderPathUp, filesNames) : [];
  const configs = config ? [...configsUp, config] : configsUp;
  return configs;
});

const getPrettierConfigResolved = async (filePath: string, filesNames: string[]): Promise<PrettierConfig> => {
  const folderPath = path.dirname(filePath);
  const configs = await getPrettierConfigsUp(folderPath, filesNames);
  let resolved: PrettierConfig = {};

  for (let ci = 0, cl = configs.length; ci < cl; ci++) {
    const config = configs[ci];
    const formatOptions = omit(config, ["overrides"]);
    resolved = ci ? { ...resolved, ...formatOptions } : formatOptions;

    const overrides = config.overrides;
    if (overrides) {
      for (let oi = 0, ol = overrides.length; oi < ol; oi++) {
        const override = overrides[oi];
        const filePathRelative = fastRelativeChildPath(override.folder, filePath);
        if (!filePathRelative) continue;
        if (!zeptomatch(override.filesPositive, filePathRelative)) continue;
        if (zeptomatch(override.filesNegative, filePathRelative)) continue;
        resolved = { ...resolved, ...override.options };
      }
    }
  }

  return resolved;
};

export { getPrettierConfig, getPrettierConfigsMap, getPrettierConfigsUp, getPrettierConfigResolved };
