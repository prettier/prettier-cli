import Pioppo from "pioppo";
import { color } from "specialist";
import Spinner from "tiny-spinner";
import { transportToStderr, transportToStdout } from "./logger_transports.js";
import { resolve } from "./utils.js";
import type { FunctionMaybe, LogLevel } from "./types.js";

class Logger {
  private level: LogLevel;
  private levels: LogLevel[] = ["debug", "log", "warn", "error", "silent"];
  private pioppo: Pioppo;
  private strength: number;

  constructor(level: LogLevel, stream: "stderr" | "stdout") {
    const transports = stream === "stderr" ? [transportToStderr] : [transportToStdout];

    this.level = level;
    this.pioppo = new Pioppo({ transports });
    this.strength = this.levels.indexOf(level);
  }

  absract = (message: FunctionMaybe<string>, strength: number): void => {
    if (strength < this.strength) return;
    message = resolve(message);
    if (!message) return;
    this.pioppo.info(message);
  };

  debug = (message: FunctionMaybe<string>): void => {
    this.absract(message, 0);
  };

  log = (message: FunctionMaybe<string>): void => {
    this.absract(message, 1);
  };

  warn = (message: FunctionMaybe<string>): void => {
    this.absract(message, 2);
  };

  error = (message: FunctionMaybe<string>): void => {
    this.absract(message, 3);
  };

  silent = (message: FunctionMaybe<string>): void => {
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

    debug: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.magenta("debug")}]`;
      this.prefixed.abstract(prefix, message, 0);
    },

    log: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.cyan("log")}]`;
      this.prefixed.abstract(prefix, message, 1);
    },

    warn: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.yellow("warn")}]`;
      this.prefixed.abstract(prefix, message, 2);
    },

    error: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.red("error")}]`;
      this.prefixed.abstract(prefix, message, 3);
    },

    silent: (message: FunctionMaybe<string>): void => {
      const prefix = `[${color.dim("silent")}]`;
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

    debug: (): Spinner | undefined => {
      return this.spinner.abstract(0);
    },

    log: (): Spinner | undefined => {
      return this.spinner.abstract(1);
    },

    warn: (): Spinner | undefined => {
      return this.spinner.abstract(2);
    },

    error: (): Spinner | undefined => {
      return this.spinner.abstract(3);
    },

    silent: (): Spinner | undefined => {
      return this.spinner.abstract(4);
    },

    always: (): Spinner | undefined => {
      return this.spinner.abstract(Infinity);
    },
  };
}

export default Logger;
