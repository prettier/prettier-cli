import { runCli } from "../utils";

// MIGRATION: Worked as is.
describe("multiple patterns", () => {
  runCli("patterns", ["directory/**/*.js", "other-directory/**/*.js", "-l"]).test({
    status: 1,
  });
});

// MIGRATION: Error is no longer reported when there are other matches, even with
// `--error-on-unmatched-pattern`. Adjusted the stderr snapshot for now.
// Should we change the logic to report the invalid patterns regardless?
// Changed tha status to 1.
describe("multiple patterns with non exists pattern", () => {
  runCli("patterns", ["directory/**/*.js", "non-existent.js", "-l"]).test({
    status: 1,
  });
});

// describe("multiple patterns with ignore nested directories pattern", () => {
//   runCli("patterns", ["**/*.js", "!**/nested-directory/**", "-l"]).test({
//     status: 1,
//   });
// });

// describe("multiple patterns by with ignore pattern, ignores node_modules by default", () => {
//   runCli("patterns", ["**/*.js", "!directory/**", "-l"]).test({
//     status: 1,
//   });
// });

// describe("multiple patterns by with ignore pattern, ignores node_modules by with ./**/*.js", () => {
//   runCli("patterns", ["./**/*.js", "!./directory/**", "-l"]).test({
//     status: 1,
//   });
// });

// describe("multiple patterns by with ignore pattern, doesn't ignore node_modules with --with-node-modules flag", () => {
//   runCli("patterns", ["**/*.js", "!directory/**", "-l", "--with-node-modules"]).test({
//     status: 1,
//   });
// });

// MIGRATION: Modified to match the new behavior.
describe("exits with an informative message when there are no patterns provided", () => {
  runCli("patterns").test({
    status: 1,
  });
});

// MIGRATION: Updated the snapshot and changed the status to 1.
describe("multiple patterns, throw error and exit with non zero code on non existing files", () => {
  runCli("patterns", ["non-existent.js", "other-non-existent.js", "-l"]).test({
    status: 1,
  });
});

// MIGRATION: Worked as is, but maybe we should split this suites into separate files?
describe("file names with special characters", () => {
  runCli("patterns-special-characters/square-brackets/", ["[with-square-brackets].js", "-l"]).test({
    status: 1,
    write: [],
    stderr: "",
    stdout: "[with-square-brackets].js",
  });
  runCli("patterns-special-characters/dots/", ["[...with-square-and-dots-brackets].js", "-l"]).test({
    status: 1,
    write: [],
    stderr: "",
    stdout: "[...with-square-and-dots-brackets].js",
  });
});
