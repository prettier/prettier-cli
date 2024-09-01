#!/usr/bin/env node

import { toKebabCase } from "kasi";
import { bin, color, exit, parseArgv } from "specialist";
import { PRETTIER_VERSION } from "./constants.js";
import { getPlugin, isBoolean, isNumber, isIntegerInRange, isString } from "./utils.js";
import { normalizeOptions, normalizeFormatOptions, normalizePluginOptions } from "./utils.js";
import type { Bin, PluginsOptions } from "./types.js";

const makeBin = (): Bin => {
  return (
    bin("prettier", "An opinionated code formatter")
      /* OPTIONS */
      .autoExit(true)
      .autoUpdateNotifier(false)
      .colors(true)
      .package("prettier", PRETTIER_VERSION)
      /* USAGES */
      .usage(`${color.cyan("prettier")} ${color.yellow("[file/dir/glob...]")} ${color.green("[options]")}`)
      .usage(`${color.cyan("prettier")} ${color.yellow('"src/**/*.js"')} ${color.green("--check")}`)
      .usage(`${color.cyan("prettier")} ${color.yellow('"src/**/*.js"')} ${color.green("-l")} ${color.green("--no-cache")}`)
      .usage(`${color.cyan("prettier")} ${color.yellow('"src/**/*.js"')} ${color.green("--write")} ${color.green("--no-parallel")}`)
      .usage(`${color.cyan("prettier")} ${color.yellow("./path/to/target/file.js")} ${color.green("--cache-location")} ${color.blue("./path/to/cache/file.json")}`)
      /* OUTPUT OPTIONS */
      .option("--check, -c", "Check if the given files are formatted, print a human-friendly summary (see also --list-different)", {
        section: "Output",
        incompatible: ["l", 'w'],
      })
      .option("--list-different, -l", "Print the names of files that are different from Prettier's formatting (see also --check)", {
        section: "Output",
        incompatible: ["c", 'w'],
      })
      .option("--write, -w", "Edit files in-place (Beware!)", {
        section: "Output",
        incompatible: ["c", "l"],
      })
      /* FORMAT OPTIONS */
      .option("--arrow-parens <always|avoid>", 'Include parentheses around a sole arrow function parameter\nDefaults to "always"', {
        section: "Format",
        enum: ["always", "avoid"],
      })
      .option("--bracket-same-line", 'Put ">" of opening tags on the last line instead of on a new line\nDefaults to "false"', {
        section: "Format",
      })
      .option("--no-bracket-spacing", 'Do not print spaces between brackets\nDefaults to "true"', {
        section: "Format",
      })
      .option("--embedded-language-formatting <auto|off>", 'Control how Prettier formats quoted code embedded in the file\nDefaults to "auto"', {
        section: "Format",
        enum: ["auto", "off"],
      })
      .option("--end-of-line <lf|crlf|cr|auto>", 'Which end of line characters to apply\nDefaults to "lf"', {
        section: "Format",
        enum: ["lf", "crlf", "cr", "auto"],
      })
      .option("--experimental-ternaries", 'Use curious ternaries, with the question mark after the condition\nDefaults to "false"', {
        section: "Format",
      })
      .option("--html-whitespace-sensitivity <css|strict|ignore>", 'How to handle whitespaces in HTML\nDefaults to "css"', {
        section: "Format",
        enum: ["css", "strict", "ignore"],
      })
      .option("--jsx-single-quote", 'Use single quotes in JSX\nDefaults to "false"', {
        section: "Format",
      })
      .option("--parser <flow|babel|babel-flow|babel-ts|typescript|acorn|espree|meriyah|css|less|scss|json|json5|json-stringify|graphql|markdown|mdx|vue|yaml|glimmer|html|angular|lwc>", "Which parser to use", {
        section: "Format",
        enum: ["flow", "babel", "babel-flow", "babel-ts", "typescript", "acorn", "espree", "meriyah", "css", "less", "scss", "json", "json5", "json-stringify", "graphql", "markdown", "mdx", "vue", "yaml", "glimmer", "html", "angular", "lwc"],
      })
      .option("--print-width <int>", 'The line length where Prettier will try wrap\nDefaults to "80"', {
        section: "Format",
        type: "integer",
      })
      .option("--prose-wrap <always|never|preserve>", 'How to wrap prose\nDefaults to "preserve"', {
        section: "Format",
        enum: ["always", "never", "preserve"],
      })
      .option("--quote-props <as-needed|consistent|preserve>", 'Change when properties in objects are quoted\nDefaults to "as-needed"', {
        section: "Format",
        enum: ["as-needed", "consistent", "preserve"],
      })
      .option("--no-semi", 'Do not print semicolons, except at the beginning of lines which may need them\nDefaults to "true"', {
        section: "Format",
      })
      .option("--single-attribute-per-line", 'Enforce single attribute per line in HTML, Vue and JSX\nDefaults to "false"', {
        section: "Format",
      })
      .option("--single-quote", 'Use single quotes instead of double quotes\nDefaults to "false"', {
        section: "Format",
      })
      .option("--tab-width <int>", 'Number of spaces per indentation level\nDefaults to "2"', {
        section: "Format",
        type: "integer",
      })
      .option("--trailing-comma <all|es5|none>", 'Print trailing commas wherever possible when multi-line\nDefaults to "all"', {
        section: "Format",
        enum: ["all", "es5", "none"],
      })
      .option("--use-tabs", 'Indent with tabs instead of spaces\nDefaults to "false"', {
        section: "Format",
      })
      .option("--vue-indent-script-and-style", 'Indent script and style tags in Vue files\nDefaults to "false"', {
        section: "Format",
      })
      /* CONFIG OPTIONS */
      .option("--no-config", "Do not look for a configuration file", {
        section: "Config",
        default: true,
      })
      .option("--config-path <path>", "Path to a Prettier configuration file (.prettierrc, package.json, prettier.config.js)", {
        section: "Config",
      })
      .option("--config-precedence <cli-override|file-override>", 'Define in which order config files and CLI options should be evaluated.\nDefaults to "cli-override"', {
        section: "Config",
        enum: ["cli-override", "file-override"],
      })
      .option("--no-editorconfig", "Don't take .editorconfig into account when parsing configuration", {
        section: "Config",
        default: true,
      })
      .option("--no-ignore", "Do not look for an ignore file", {
        section: "Config",
        default: true,
      })
      .option("--ignore-path <path...>", "Path to a file with patterns describing files to ignore\nMultiple values are accepted\nDefaults to [.gitignore, .prettierignore]", {
        section: "Config",
      })
      .option("--plugin <package...>", "Add a plugin\nMultiple plugins are accepted\nDefaults to []", {
        section: "Config",
      })
      .option("--with-node-modules", 'Process files inside the "node_modules" directory', {
        section: "Config",
      })
      /* EDITOR OPTIONS */
      .option("--cursor-offset <int>", 'Print (to stderr) where a cursor at the given position would move to after formatting\nDefaults to "-1"', {
        section: "Editor",
        type: "integer",
      })
      .option("--range-end <int>", 'Format code ending at a given character offset (exclusive)\nThe range will extend forwards to the end of the selected statement\nDefaults to "Infinity"', {
        section: "Editor",
        type: "integer",
      })
      .option("--range-start <int>", 'Format code starting at a given character offset\nThe range will extend backwards to the start of the first line containing the selected statement\nDefaults to "0"', {
        section: "Editor",
        type: "integer",
      })
      /* OTHER OPTIONS */
      .option("--no-cache", "Do not use the built-in caching mechanism", {
        section: "Other",
        default: true,
      })
      .option("--cache-location <path>", "Path to the cache file", {
        section: "Other",
      })
      .option("--no-color", "Do not colorize output messages", {
        section: "Other",
      })
      .option("--no-error-on-unmatched-pattern", "Prevent errors when pattern is unmatched", {
        section: "Other",
        default: true
      })
      .option("--ignore-unknown, -u", "Ignore unknown files", {
        section: "Other",
      })
      .option("--insert-pragma", 'Insert @format pragma into file\'s first docblock comment\nDefaults to "false"', {
        section: "Other",
      })
      .option("--log-level <silent|error|warn|log|debug>", 'What level of logs to report\nDefaults to "log"', {
        section: "Other",
        enum: ["silent", "error", "warn", "log", "debug"],
      })
      .option("--no-parallel", 'Process files in parallel\nDefaults to "true"', {
        section: "Other",
        default: true,
      })
      .option("--parallel-workers <int>", 'Number of parallel workers to use\nDefaults to "0"', {
        section: "Other",
        type: "integer",
      })
      .option("--require-pragma", 'Require either "@prettier" or "@format" to be present in the file\'s first docblock comment in order for it to be formatted\nDefaults to "false"', {
        section: "Other",
      })
      .option("--stdin-filepath <path>", "Path to the file to pretend that stdin comes from", {
        section: "Other",
      })
      /* DEFAULT COMMAND */
      .argument("[file/dir/glob...]", "Files, directories or globs to format")
      .action(async (options, files) => {
        const { run } = await import("./index.js");
        const baseOptions = await normalizeOptions(options, files);
        const pluginsDefaultOptions = {};
        const pluginsCustomOptions = {};
        return run(baseOptions, pluginsDefaultOptions, pluginsCustomOptions);
      })
  );
};

const makePluggableBin = async (): Promise<Bin> => {
  let bin = makeBin();

  const argv = process.argv.slice(2);
  const args = parseArgv(argv);
  const formatOptions = normalizeFormatOptions(args);
  const pluginsDefaultOptions: PluginsOptions = {};
  const pluginsNames = formatOptions.plugins || [];
  const optionsNames: string[] = [];

  for (let i = 0, l = pluginsNames.length; i < l; i++) {
    const pluginName = pluginsNames[i];
    const plugin = await getPlugin(pluginName);

    for (const option in plugin.options) {
      optionsNames.push(option);
      Object.assign(pluginsDefaultOptions, plugin.defaultOptions);

      const schema = plugin.options[option];
      const type = schema.type;
      const section = schema.category;
      const deprecated = !!schema.deprecated;
      const descriptionInfo = schema.description || "";
      const initial = schema.default;

      if (type === "int") {
        const descriptionDefault = isNumber(initial) ? `Defaults to "${initial}"` : "";
        const description = `${descriptionInfo}\n${descriptionDefault}`.trim();
        const range = !schema.array ? schema.range : undefined;
        const validate = ( value: string ) => isIntegerInRange(Number(value), range?.start, range?.end, range?.step);
        const variadic = !!schema.array;
        const type = 'integer';
        const args = variadic ? "<int...>" : "<int>";
        pluginsDefaultOptions[option] = initial;
        bin = bin.option(`--${toKebabCase(option)} ${args}`, description, { deprecated, section, type, validate });
      } else if (type === "boolean") {
        //TODO: Support schema.array
        const descriptionDefault = initial ? 'Defaults to "true"' : 'Defaults to "false"';
        const description = `${descriptionInfo}\n${descriptionDefault}`.trim();
        pluginsDefaultOptions[option] = initial;
        bin = bin.option(`--${toKebabCase(option)}`, description, { deprecated, section });
      } else if (type === "string" || type === "path") {
        const descriptionDefault = initial ? `Defaults to "${initial}"` : "";
        const description = `${descriptionInfo}\n${descriptionDefault}`.trim();
        const variadic = !!schema.array;
        const args = variadic ? "<value...>" : "<value>";
        pluginsDefaultOptions[option] = initial;
        bin = bin.option(`--${toKebabCase(option)} ${args}`, description, { deprecated, section });
      } else if (type === "choice") {
        const descriptionDefault = initial ? `Defaults to "${initial}"` : "";
        const description = `${descriptionInfo}\n${descriptionDefault}`.trim();
        const values = schema.choices.map((choice) => choice.value);
        const args = values.length ? `<${values.join("|")}>` : "<value>";
        pluginsDefaultOptions[option] = initial;
        bin = bin.option(`--${toKebabCase(option)} ${args}`, description, { deprecated, section, enum: values });
      }
    }
  }

  bin = bin.action(async (options, files) => {
    const { run } = await import("./index.js");
    const baseOptions = await normalizeOptions(options, files);
    const pluginsCustomOptions = normalizePluginOptions(options, optionsNames);
    return run(baseOptions, pluginsDefaultOptions, pluginsCustomOptions);
  });

  return bin;
};

const makeWarnedPluggableBin = async (): Promise<Bin> => {
  const argv = process.argv.slice(2);
  const args = parseArgv(argv);

  if (isString(args["config"]) || args["config"] === true) {
    exit('The "--config" option has been renamed to "--config-path" instead');
  }

  if (isString(args["cache-strategy"])) {
    exit('The "--cache-strategy" option has been deleted, since the "metadata" strategy is no longer supported');
  }

  if (isBoolean(args["find-config-path"])) {
    exit('The "--find-config-path" is not currently supported, please open an issue on GitHub if you need it');
  }

  if (args["config-precedence"] === "prefer-file") {
    exit('The "prefer-file" value for "--config-precedence" is not currently supported, please open an issue on GitHub if you need it');
  }

  if (args["file-info"]) {
    exit('The "--file-info" option is not currently supported, please open an issue on GitHub if you need it');
  }

  if (args["support-info"]) {
    exit('The "--support-info" option is not currently supported, please open an issue on GitHub if you need it');
  }

  const bin = await makePluggableBin();
  return bin;
};

const runBin = async (): Promise<void> => {
  const bin = await makeWarnedPluggableBin();
  bin.run();
};

runBin();
