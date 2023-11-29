import { makeCached } from "./prettier_cached.js";
import type Cache from "./cache.js";
import type { Options, Prettier } from "./types.js";

async function makePrettier(options: Options, cache: Cache): Promise<Prettier> {
  if (options.parallel) {
    const { makeParallel } = await import("./prettier_parallel.js");
    if (options.cache) {
      return makeCached(options, cache, makeParallel(options));
    } else {
      return makeParallel(options);
    }
  } else {
    const { makeLazy } = await import("./prettier_lazy.js");
    if (options.cache) {
      return makeCached(options, cache, makeLazy(options));
    } else {
      return makeLazy(options);
    }
  }
}

export { makePrettier };
