import fs from "node:fs";
import path from "node:path";
import { getCachePath, isObject, sha1hex, sha1base64 } from "./utils.js";
import type Logger from "./logger.js";
import type { Options } from "./types.js";

type Store = Partial<{
  [version: string]: StoreVersion;
}>;

type StoreVersion = Partial<{
  modified: number;
  files: Partial<Record<string, StoreFile>>;
}>;

type StoreFile = [hash: string, formatted: boolean];

type FileData = {
  content?: Buffer | string;
  formatted?: boolean;
  save: (formatted: boolean, fileContentExpected: string) => void;
};

//TODO: Maybe remember thrown errors also, if they are under a certain size
//TODO: Use some kind of relative path as the file key, if in CI enviornments parts of the path can be kinda random, or if the cache file is committed
//TODO: Validate cached values as they are being read, for better safety

class Cache {
  private version: string;
  private storePath: string;
  private store: Store;
  private logger: Logger;
  private dirty: boolean;

  constructor(version: string, rootPath: string, options: Options, logger: Logger) {
    this.version = sha1hex(version);
    this.logger = logger;
    this.storePath = options.cacheLocation || path.join(getCachePath(rootPath), `${sha1hex(rootPath)}.json`);
    this.store = this.read();
    this.dirty = false;
  }

  cleanup(store: Store): Store {
    //TODO: Use a more sophisticated cleanup logic
    for (const version in store) {
      if (version === this.version) continue;
      delete store[version];
      this.dirty = true;
    }
    return store;
  }

  read(): Store {
    try {
      const store = JSON.parse(fs.readFileSync(this.storePath, "utf8"));
      if (!isObject(store)) return {};
      return this.cleanup(store);
    } catch (error: unknown) {
      this.logger.prefixed.debug(String(error));
      return {};
    }
  }

  write(): void {
    if (!this.dirty) return;
    try {
      const store = JSON.stringify(this.store);
      fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
      fs.writeFileSync(this.storePath, store);
    } catch (error: unknown) {
      this.logger.prefixed.debug(String(error));
    }
  }

  get(filePath: string): FileData {
    const filePathHash = sha1base64(filePath);
    const save = this.set.bind(this, filePath, filePathHash);
    try {
      const file = this.store[this.version]?.files?.[filePathHash];
      if (!file) return { save };
      const [hash, formatted] = file;
      const content = fs.readFileSync(filePath);
      const fileHash = sha1base64(content);
      if (hash !== fileHash) return { content, save };
      return { formatted, content, save };
    } catch (error: unknown) {
      this.logger.prefixed.debug(String(error));
      return { save };
    }
  }

  set(filePath: string, filePathHash: string, fileFormatted: boolean, fileContentExpected?: string): void {
    try {
      const fileContent = fileContentExpected ?? fs.readFileSync(filePath);
      const version = (this.store[this.version] ||= {});
      const files = (version.files ||= {});
      //TODO: Skip the following hash if the expected content we got is the same one that we had
      const hash = sha1base64(fileContent);
      version.modified = Date.now();
      files[filePathHash] = [hash, fileFormatted];
      this.dirty = true;
    } catch (error: unknown) {
      this.logger.prefixed.debug(String(error));
    }
  }
}

export default Cache;
