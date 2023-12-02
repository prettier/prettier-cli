import yaml from "js-yaml";
import fs from "node:fs/promises";
import sfs from "node:fs";
import path from "node:path";
import JSONC from "tiny-jsonc";
import zeptomatch from "zeptomatch";
import Known from "./known.js";
import { fastJoinedPath, fastRelativeChildPath } from "./utils.js";
import { isObject, isUndefined, memoize, normalizePrettierOptions, omit, zipObjectUnless } from "./utils.js";
import type { PrettierConfig, PrettierConfigWithOverrides } from "./types.js";

//TODO: Maybe completely drop support for JSON5, or implement it properly
//TODO: Maybe add support for TOML

const Loaders = {
  js: async (filePath: string): Promise<unknown> => {
    const exists = sfs.existsSync(filePath);
    if (!exists) return;
    const module = await import(filePath);
    return module.default || module.exports || module.config || module.prettier; //TODO: Streamline this
  },
  json: async (filePath: string): Promise<unknown> => {
    const fileContent = await fs.readFile(filePath, "utf8");
    const config = JSON.parse(fileContent);
    return config;
  },
  jsonc: async (filePath: string): Promise<unknown> => {
    const fileContent = await fs.readFile(filePath, "utf8");
    const config = JSONC.parse(fileContent);
    return config;
  },
  package: async (filePath: string): Promise<unknown> => {
    const fileContent = await fs.readFile(filePath, "utf8");
    const pkg = JSON.parse(fileContent);
    const config = isObject(pkg) && "prettier" in pkg ? pkg.prettier : undefined;
    return config;
  },
  yaml: async (filePath: string): Promise<unknown> => {
    const fileContent = await fs.readFile(filePath, "utf8");
    return yaml.load(fileContent, {
      schema: yaml.JSON_SCHEMA,
    });
  },
};

const File2Loader: Record<string, (filePath: string) => Promise<unknown>> = {
  "package.json": Loaders.package,
  ".prettierrc": Loaders.yaml,
  ".prettierrc.yml": Loaders.yaml,
  ".prettierrc.yaml": Loaders.yaml,
  ".prettierrc.json": Loaders.json,
  ".prettierrc.jsonc": Loaders.jsonc,
  ".prettierrc.json5": Loaders.jsonc,
  ".prettierrc.js": Loaders.js,
  ".prettierrc.cjs": Loaders.js,
  ".prettierrc.mjs": Loaders.js,
  "prettier.config.js": Loaders.js,
  "prettier.config.cjs": Loaders.js,
  "prettier.config.mjs": Loaders.js,
};

const getPrettierConfig = memoize(async (folderPath: string, filesNames: string[]): Promise<PrettierConfigWithOverrides | undefined> => {
  for (let i = 0, l = filesNames.length; i < l; i++) {
    const fileName = filesNames[i];
    const filePath = fastJoinedPath(folderPath, fileName);
    if (!Known.hasFilePath(filePath)) continue;
    const loader = File2Loader[fileName];
    if (!loader) continue;
    try {
      const config = await loader(filePath);
      if (!config) continue;
      if (!isObject(config)) continue;
      return normalizePrettierOptions(config, folderPath);
    } catch {}
  }
});

const getPrettierConfigsMap = async (foldersPaths: string[], filesNames: string[]): Promise<Partial<Record<string, PrettierConfig>>> => {
  const configs = await Promise.all(foldersPaths.map((folderPath) => getPrettierConfig(folderPath, filesNames)));
  const map = zipObjectUnless(foldersPaths, configs, isUndefined);
  return map;
};

const getPrettierConfigsUp = memoize(async (folderPath: string, filesNames: string[]): Promise<PrettierConfigWithOverrides[]> => {
  const config = await getPrettierConfig(folderPath, filesNames);
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
