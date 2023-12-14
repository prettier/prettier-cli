import fs from "node:fs";
import path from "node:path";
import { fastRelativePath, getCachePath, isArray, isBoolean, isObject, isString, isUndefined, sha1hex, sha1base64 } from "./utils.js";
import type Logger from "./logger.js";
import type { Options, PromiseMaybe } from "./types.js";

type Store = Partial<{
  [version: string]: StoreVersion;
}>;

type StoreVersion = Partial<{
  modified: number;
  files: Partial<Record<string, StoreFile | false>>;
}>;

type StoreFile = [hash: string, formatted: boolean];

type FileData = {
  content?: Buffer | string;
  formatted?: boolean;
  save: (formatted: boolean, fileContentExpected: string) => void;
};

//TODO: Maybe remember thrown errors also, if they are under a certain size

class Cache {
  private version: string;
  private rootPath: string;
  private storePath: string;
  private store: Store;
  private logger: Logger;
  private dirty: boolean;

  constructor(version: string, rootPath: string, options: Options, logger: Logger) {
    this.version = sha1hex(version);
    this.logger = logger;
    this.rootPath = rootPath;
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
    const fileRelativePath = fastRelativePath(this.rootPath, filePath);
    const fileHashPath = sha1base64(fileRelativePath);
    const save = this.set.bind(this, filePath, fileHashPath);
    try {
      const file = this.store[this.version]?.files?.[fileHashPath];
      if (!file || !isArray(file) || file.length !== 2) return { save };
      const [hash, formatted] = file;
      if (!isString(hash) || !isBoolean(formatted)) return { save };
      const content = fs.readFileSync(filePath);
      const fileHash = sha1base64(content);
      if (hash !== fileHash) return { content, save };
      return { formatted, content, save };
    } catch (error: unknown) {
      this.logger.prefixed.debug(String(error));
      return { save };
    }
  }

  set(filePath: string, fileHashPath: string, fileFormatted: boolean, fileContentExpected: string): void {
    try {
      const version = (this.store[this.version] ||= {});
      const files = (version.files ||= {});
      //TODO: Skip the following hash if the expected content we got is the same one that we had
      const hash = sha1base64(fileContentExpected);
      version.modified = Date.now();
      files[fileHashPath] = [hash, fileFormatted];
      this.dirty = true;
    } catch (error: unknown) {
      this.logger.prefixed.debug(String(error));
    }
  }

  async has(filePath: string, isIgnored: () => PromiseMaybe<boolean>): Promise<boolean> {
    const fileRelativePath = fastRelativePath(this.rootPath, filePath);
    const fileHashPath = sha1base64(fileRelativePath);
    const file = this.store[this.version]?.files?.[fileHashPath];
    if (isUndefined(file)) {
      const ignored = await isIgnored();
      if (ignored) {
        const version = (this.store[this.version] ||= {});
        const files = (version.files ||= {});
        files[fileHashPath] = false;
        this.dirty = true;
        return false;
      } else {
        return true;
      }
    } else {
      return !!file;
    }
  }
}

export default Cache;
