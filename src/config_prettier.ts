import yaml from "js-yaml";
import fs from "node:fs/promises";
import sfs from "node:fs";
import path from "node:path";
import JSONC from "tiny-jsonc";
import zeptomatch from "zeptomatch";
import Known from "./known.js";
import { fastJoinedPath, fastRelativeChildPath } from "./utils.js";
import { isObject, memoize, normalizePrettierOptions, omit, zipObject } from "./utils.js";
import type { PrettierConfig, PrettierConfigWithOverrides } from "./types.js";

//TODO: Maybe completely drop support for JSON5, or implement it properly
//TODO: Maybe add support for TOML
//TODO: Check which of these file names have been found in the repo just once

const loaders = [
  {
    files: ["package.json"],
    loader: async (filePath: string): Promise<unknown> => {
      const fileContent = await fs.readFile(filePath, "utf8");
      const pkg = JSON.parse(fileContent);
      const config = isObject(pkg) && "prettier" in pkg ? pkg.prettier : undefined;
      return config;
    },
  },
  {
    files: [".prettierrc", ".prettierrc.yml", ".prettierrc.yaml"],
    loader: async (filePath: string): Promise<unknown> => {
      const fileContent = await fs.readFile(filePath, "utf8");
      return yaml.load(fileContent, {
        schema: yaml.JSON_SCHEMA,
      });
    },
  },
  {
    files: [".prettierrc.json", ".prettierrc.jsonc", ".prettierrc.json5"],
    loader: async (filePath: string): Promise<unknown> => {
      const fileContent = await fs.readFile(filePath, "utf8");
      const config = JSONC.parse(fileContent);
      return config;
    },
  },
  {
    files: [".prettierrc.js", "prettier.config.js", ".prettierrc.cjs", "prettier.config.cjs", ".prettierrc.mjs", "prettier.config.mjs"], // prettier-ignore
    loader: async (filePath: string): Promise<unknown> => {
      const exists = sfs.existsSync(filePath);
      if (!exists) return;
      const module = await import(filePath);
      return module.default || module.exports || module.config || module.prettier; //TODO: Streamline this
    },
  },
];

const getPrettierConfig = memoize(async (folderPath: string): Promise<PrettierConfigWithOverrides | undefined> => {
  for (let li = 0, ll = loaders.length; li < ll; li++) {
    const { files, loader } = loaders[li];
    for (let fi = 0, fl = files.length; fi < fl; fi++) {
      const filePath = fastJoinedPath(folderPath, files[fi]);
      if (!Known.hasFile(filePath)) continue;
      try {
        const config = await loader(filePath);
        if (!config) continue;
        return normalizePrettierOptions(config, folderPath);
      } catch {
        continue;
      }
    }
  }
});

const getPrettierConfigsMap = async (foldersPaths: string[]): Promise<Partial<Record<string, PrettierConfig>>> => {
  const configs = await Promise.all(foldersPaths.map(getPrettierConfig));
  const map = zipObject(foldersPaths, configs);
  return map;
};

const getPrettierConfigsUp = memoize(async (folderPath: string): Promise<PrettierConfigWithOverrides[]> => {
  const config = await getPrettierConfig(folderPath);
  const folderPathUp = path.dirname(folderPath);
  const configsUp = folderPath !== folderPathUp ? await getPrettierConfigsUp(folderPathUp) : [];
  const configs = config ? [...configsUp, config] : configsUp;
  return configs;
});

const getPrettierConfigResolved = async (filePath: string): Promise<PrettierConfig> => {
  const folderPath = path.dirname(filePath);
  const configs = await getPrettierConfigsUp(folderPath);
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
