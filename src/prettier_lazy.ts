import { once } from "./utils.js";
import type { Options, Prettier } from "./types.js";

function makeLazy(options: Options): Prettier {
  const prettier = once(() => {
    return import("./prettier_serial.js");
  });

  return {
    async check(...args) {
      return (await prettier()).check(...args);
    },
    async checkWithPath(...args) {
      return (await prettier()).checkWithPath(...args);
    },
    async format(...args) {
      return (await prettier()).format(...args);
    },
    async formatWithPath(...args) {
      return (await prettier()).formatWithPath(...args);
    },
    async write(...args) {
      return (await prettier()).write(...args);
    },
    async writeWithPath(...args) {
      return (await prettier()).writeWithPath(...args);
    },
  };
}

export { makeLazy };
