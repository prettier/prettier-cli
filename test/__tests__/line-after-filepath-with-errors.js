import { runCli } from "../utils";

describe("Line breaking after filepath with errors", () => {
  runCli("syntax-errors", ["./*.{js,unknown}"]).test({
    status: 1,
  });
  // TODO (43081j): this test throws errors in prettier. here it doesn't, and
  // lists each invalid file path in the output (stderr). we should decide
  // if to align with prettier
  runCli("syntax-errors", ["--list-different", "./*.{js,unknown}"]).test({
    status: 1,
  });
  runCli("syntax-errors", ["--check", "./*.{js,unknown}"]).test({
    status: 1,
  });
  runCli("syntax-errors", ["--write", "./*.{js,unknown}"]).test({
    status: 1,
  });
});
