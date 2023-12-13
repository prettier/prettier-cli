import { readFile, writeFile } from "atomically";
import { isBoolean } from "./utils.js";
import type Cache from "./cache.js";
import type { Options, Prettier } from "./types.js";

function makeCached(options: Options, cache: Cache, prettier: Prettier): Prettier {
  return {
    check: prettier.check,
    format: prettier.format,
    write: prettier.write,

    async checkWithPath(filePath, formatOptions, contextOptions, pluginsOptions) {
      const data = await cache.get(filePath);
      if (isBoolean(data?.formatted)) return data.formatted;
      const fileContent = data?.content?.toString() ?? (await readFile(filePath, "utf8"));
      const formatted = await prettier.check(filePath, fileContent, formatOptions, contextOptions, pluginsOptions);
      await data?.save(formatted, fileContent);
      return formatted;
    },

    async formatWithPath(filePath, formatOptions, contextOptions, pluginsOptions) {
      const data = await cache.get(filePath);
      const fileContent = data?.content?.toString() ?? (await readFile(filePath, "utf8"));
      if (data?.formatted) return fileContent;
      const fileContentFormatted = await prettier.format(filePath, fileContent, formatOptions, contextOptions, pluginsOptions);
      if (fileContent === fileContentFormatted) {
        await data?.save(true, fileContent);
        return fileContent;
      } else {
        await data?.save(false, fileContent);
        return fileContentFormatted;
      }
    },

    async writeWithPath(filePath, formatOptions, contextOptions, pluginsOptions) {
      const data = await cache.get(filePath);
      if (data?.formatted) return true;
      const fileContent = data?.content?.toString() ?? (await readFile(filePath, "utf8"));
      const fileContentFormatted = await prettier.format(filePath, fileContent, formatOptions, contextOptions, pluginsOptions);
      if (fileContent === fileContentFormatted) {
        await data?.save(true, fileContent);
        return true;
      } else {
        await writeFile(filePath, fileContentFormatted);
        await data?.save(true, fileContentFormatted);
        return false;
      }
    },
  };
}

export { makeCached };
