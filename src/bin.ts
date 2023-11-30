#!/usr/bin/env node

import { bin, color } from "specialist";
import { PRETTIER_VERSION } from "./constants.js";
import { normalizeOptions } from "./utils.js";
import { run } from "./index.js";

//TODO: --find-cache

bin("prettier", "Prettier is an opinionated code formatter")
  /* OPTIONS */
  .autoExit(true)
  .autoUpdateNotifier(false)
  .colors(true)
  .package("prettier", PRETTIER_VERSION)
  /* USAGES */
  .usage(`${color.cyan("prettier")} ${color.yellow("[file/dir/glob...]")} ${color.green("[options]")}`)
  .usage(
    `${color.cyan("prettier")} ${color.yellow('"src/**/*.js"')} ${color.green("--check")} ${color.green("--parallel")}`,
  )
  .usage(`${color.cyan("prettier")} ${color.yellow('"src/**/*.js"')} ${color.green("-l")} ${color.green("--no-cache")}`)
  .usage(
    `${color.cyan("prettier")} ${color.yellow('"src/**/*.js"')} ${color.green("--write")} ${color.green("--parallel")}`,
  )
  .usage(
    `${color.cyan("prettier")} ${color.yellow("./path/to/target/file.js")} ${color.green(
      "--cache-location",
    )} ${color.blue("./path/to/cache/file.json")}`,
  )
  /* OUTPUT OPTIONS */
  .option(
    "--check, -c",
    "Check if the given files are formatted, print a human-friendly summary (see also --list-different)",
    { section: "Output" },
  )
  .option(
    "--list-different, -l",
    "Print the names of files that are different from Prettier's formatting (see also --check)",
    { section: "Output" },
  )
  .option("--write, -w", "Edit files in-place (Beware!)", { section: "Output" })
  /* FORMAT OPTIONS */
  .option(
    "--arrow-parens <always|avoid>",
    'Include parentheses around a sole arrow function parameter\nDefaults to "always"',
    { section: "Format", enum: ["always", "avoid"] },
  )
  .option(
    "--bracket-same-line",
    'Put ">" of opening tags on the last line instead of on a new line\nDefaults to "false"',
    { section: "Format" },
  )
  .option("--no-bracket-spacing", 'Do not print spaces between brackets\nDefaults to "true"', { section: "Format" })
  .option(
    "--embedded-language-formatting <auto|off>",
    'Control how Prettier formats quoted code embedded in the file\nDefaults to "auto"',
    { section: "Format", enum: ["auto", "off"] },
  )
  .option("--end-of-line <lf|crlf|cr|auto>", 'Which end of line characters to apply\nDefaults to "lf"', {
    section: "Format",
    enum: ["lf", "crlf", "cr", "auto"],
  })
  .option("--html-whitespace-sensitivity <css|strict|ignore>", 'How to handle whitespaces in HTML\nDefaults to "css"', {
    section: "Format",
    enum: ["css", "strict", "ignore"],
  })
  .option("--jsx-single-quote", 'Use single quotes in JSX\nDefaults to "false"', { section: "Format" })
  .option(
    "--parser <flow|babel|babel-flow|babel-ts|typescript|acorn|espree|meriyah|css|less|scss|json|json5|json-stringify|graphql|markdown|mdx|vue|yaml|glimmer|html|angular|lwc>",
    "Which parser to use",
    { section: "Format", enum: ["flow", "babel", "babel-flow", "babel-ts", "typescript", "acorn", "espree", "meriyah", "css", "less", "scss", "json", "json5", "json-stringify", "graphql", "markdown", "mdx", "vue", "yaml", "glimmer", "html", "angular", "lwc"] }, // prettier-ignore
  )
  .option("--print-width <int>", 'The line length where Prettier will try wrap\nDefaults to "80"', {
    section: "Format",
  })
  .option("--prose-wrap <always|never|preserve>", 'How to wrap prose\nDefaults to "preserve"', {
    section: "Format",
    enum: ["always", "never", "preserve"],
  })
  .option(
    "--quote-props <as-needed|consistent|preserve>",
    'Change when properties in objects are quoted\nDefaults to "as-needed"',
    { section: "Format", enum: ["as-needed", "consistent", "preserve"] },
  )
  .option(
    "--no-semi",
    'Do not print semicolons, except at the beginning of lines which may need them\nDefaults to "true"',
    { section: "Format" },
  )
  .option(
    "--single-attribute-per-line",
    'Enforce single attribute per line in HTML, Vue and JSX\nDefaults to "false"',
    { section: "Format" },
  )
  .option("--single-quote", 'Use single quotes instead of double quotes\nDefaults to "false"', { section: "Format" })
  .option("--tab-width <int>", 'Number of spaces per indentation level\nDefaults to "2"', { section: "Format" })
  .option(
    "--trailing-comma <all|es5|none>",
    'Print trailing commas wherever possible when multi-line\nDefaults to "all"',
    { section: "Format", enum: ["all", "es5", "none"] },
  )
  .option("--use-tabs", 'Indent with tabs instead of spaces\nDefaults to "false"', { section: "Format" })
  .option("--vue-indent-script-and-style", 'Indent script and style tags in Vue files\nDefaults to "false"', {
    section: "Format",
  })
  /* CONFIG OPTIONS */
  // .option(
  //   "--config <path>",
  //   "Path to a Prettier configuration file (.prettierrc, package.json, prettier.config.js)",
  //   { section: "Config" },
  // )
  .option("--no-config", "Do not look for a configuration file", {
    section: "Config",
    default: true,
  })
  // .option(
  //   "--config-precedence <cli-override|file-override|prefer-file>",
  //   'Define in which order config files and CLI options should be evaluated.\nDefaults to "cli-override"',
  //   { section: "Config" },
  // )
  .option("--no-editorconfig", "Don't take .editorconfig into account when parsing configuration", {
    section: "Config",
    default: true,
  })
  // .option(
  //   "--find-config-path <path>",
  //   "Find and print the path to a configuration file for the given input file",
  //   { section: "Config" },
  // )
  // .option(
  //   "--ignore-path <path...>",
  //   "Path to a file with patterns describing files to ignore\nMultiple values are accepted\nDefaults to [.gitignore, .prettierignore]",
  //   { section: "Config", eager: true },
  // )
  // .option(
  //   "--plugin <path...>",
  //   "Add a plugin\nMultiple plugins are accepted\nDefaults to []",
  //   { section: "Config", eager: true },
  // )
  // .option(
  //   "--with-node-modules",
  //   'Process files inside the "node_modules" directory',
  //   { section: "Config" },
  // )
  /* EDITOR OPTIONS */
  // .option(
  //   "--cursor-offset <int>",
  //   'Print (to stderr) where a cursor at the given position would move to after formatting\nThis option cannot be used with --range-start and --range-end\nDefaults to "-1"',
  //   { section: "Editor" },
  // )
  // .option(
  //   "--range-end <int>",
  //   'Format code ending at a given character offset (exclusive)\nThe range will extend forwards to the end of the selected statement\nThis option cannot be used with --cursor-offset\nDefaults to "Infinity"',
  //   { section: "Editor" },
  // )
  // .option(
  //   "--range-start <int>",
  //   'Format code starting at a given character offset\nThe range will extend backwards to the start of the first line containing the selected statement\nThis option cannot be used with --cursor-offset\nDefaults to "0"',
  //   { section: "Editor" },
  // )
  /* OTHER OPTIONS */
  .option("--no-cache", "Do not use the built-in caching mechanism", {
    default: true,
  })
  .option("--cache-location <path>", "Path to the cache file")
  .option("--no-color", "Do not colorize output messages")
  .option("--no-error-on-unmatched-pattern", "Prevent errors when pattern is unmatched", { default: true })
  // .option(
  //   "--file-info <path>",
  //   "Extract the following info (as JSON) for a given file path. Reported fields:\n* ignored (boolean) - true if file path is filtered by --ignore-path\n* inferredParser (string | null) - name of parser inferred from file path",
  // )
  .option("--ignore-unknown, -u", "Ignore unknown files")
  .option("--insert-pragma", 'Insert @format pragma into file\'s first docblock comment\nDefaults to "false"')
  .option("--log-level <silent|error|warn|log|debug>", 'What level of logs to report\nDefaults to "log"', {
    enum: ["silent", "error", "warn", "log", "debug"],
  })
  .option("--no-parallel", 'Process files in parallel\nDefaults to "true"', {
    default: true,
  })
  .option("--parallel-workers <int>", 'Number of parallel workers to use\nDefaults to "0"')
  .option(
    "--require-pragma",
    'Require either "@prettier" or "@format" to be present in the file\'s first docblock comment in order for it to be formatted\nDefaults to "false"',
  )
  // .option(
  //   "--stdin-filepath <path>",
  //   "Path to the file to pretend that stdin comes from",
  // )
  // .option("--support-info", "Print support information as JSON")
  /* DEFAULT COMMAND */
  .argument("[file/dir/glob...]", "Files, directories or globs to format")
  .action((options, files) => {
    return run(normalizeOptions(options, files));
  })
  /* RUN */
  .run();
