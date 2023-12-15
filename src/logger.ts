import Pioppo from "pioppo";
import { color } from "specialist";
import Spinner from "tiny-spinner";
import { resolve } from "./utils.js";
import type { FunctionMaybe, LogLevel } from "./types.js";

class Logger {
  private pioppo = new Pioppo();
  private levels: LogLevel[] = ["silent", "debug", "log", "warn", "error"];
  private level: LogLevel;
  private strength: number;

  constructor(level: LogLevel) {
    this.level = level;
    this.strength = this.levels.indexOf(level);
  }

  absract = (message: FunctionMaybe<string>, strength: number): void => {
    if (strength < this.strength) return;
    message = resolve(message);
    if (!message) return;
    this.pioppo.info(message);
  };

  silent = (message: FunctionMaybe<string>): void => {
    this.absract(message, 0);
  };

  debug = (message: FunctionMaybe<string>): void => {
    this.absract(message, 1);
  };

  log = (message: FunctionMaybe<string>): void => {
    this.absract(message, 2);
  };

  warn = (message: FunctionMaybe<string>): void => {
    this.absract(message, 3);
  };

  error = (message: FunctionMaybe<string>): void => {
    this.absract(message, 4);
  };

  always = (message: FunctionMaybe<string>): void => {
    this.absract(message, Infinity);
  };

  prefixed = {
    abstract: (prefix: string, message: FunctionMaybe<string>, strength: number): void => {
      if (strength < this.strength) return;
      message = resolve(message);
      if (!message) return;
      const lines = message.split(/\r?\n|\r/g);
      const linesPrefixed = lines.map((line) => `${prefix} ${line}`);
      this.pioppo.info(linesPrefixed.join("\n"));
    },

    silent: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.dim("silent")}]`;
      this.prefixed.abstract(prefix, message, 0);
    },

    debug: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.magenta("debug")}]`;
      this.prefixed.abstract(prefix, message, 1);
    },

    log: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.cyan("log")}]`;
      this.prefixed.abstract(prefix, message, 2);
    },

    warn: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.yellow("warn")}]`;
      this.prefixed.abstract(prefix, message, 3);
    },

    error: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.red("error")}]`;
      this.prefixed.abstract(prefix, message, 4);
    },

    always: (message: FunctionMaybe<string>): void => {
      this.absract(message, Infinity);
    },
  };

  spinner = {
    abstract: (strength: number): Spinner | undefined => {
      if (strength < this.strength) return;
      return new Spinner();
    },

    silent: (): Spinner | undefined => {
      return this.spinner.abstract(0);
    },

    debug: (): Spinner | undefined => {
      return this.spinner.abstract(1);
    },

    log: (): Spinner | undefined => {
      return this.spinner.abstract(2);
    },

    warn: (): Spinner | undefined => {
      return this.spinner.abstract(3);
    },

    error: (): Spinner | undefined => {
      return this.spinner.abstract(4);
    },

    always: (): Spinner | undefined => {
      return this.spinner.abstract(Infinity);
    },
  };
}

export default Logger;
