import { runCli } from "../utils";
import { color } from "specialist";
import path from 'node:path';

const FIXTURES_PATH = path.join(process.cwd(), "test", "__fixtures__");

describe("Line breaking after filepath with errors", () => {
  // TODO (43081j): this test doesn't log an error, but does in prettier.
  // we should decide if the behaviour should match
  runCli("syntax-errors", ["./*.{js,unknown}"]).test({
    status: 1,
    stderr: "",
  });
  // TODO (43081j): this test throws errors in prettier. here it doesn't, and
  // lists each invalid file path in the output (stderr). we should decide
  // if to align with prettier
  runCli("syntax-errors", ["--list-different", "./*.{js,unknown}"]).test({
    status: 1,
  });
  runCli("syntax-errors", ["--check", "./*.{js,unknown}"]).test({
    status: 1,
    stderr: `[${color.red('error')}] invalid-1.js: SyntaxError: Unexpected token (1:8)
[${color.red('error')}] > 1 | foo (+-) bar
[${color.red('error')}]     |        ^
[${color.red('error')}]   2 |
[${color.red('error')}] invalid-2.js: SyntaxError: Unexpected token (1:8)
[${color.red('error')}] > 1 | foo (+-) bar
[${color.red('error')}]     |        ^
[${color.red('error')}]   2 |
[${color.red('error')}] invalid-2.unknown: UndefinedParserError: No parser could be inferred for file "${FIXTURES_PATH}/syntax-errors/invalid-2.unknown".`
  });
  runCli("syntax-errors", ["--write", "./*.{js,unknown}"]).test({
    status: 1,
    stderr: `[${color.red('error')}] invalid-1.js: SyntaxError: Unexpected token (1:8)
[${color.red('error')}] > 1 | foo (+-) bar
[${color.red('error')}]     |        ^
[${color.red('error')}]   2 |
[${color.red('error')}] invalid-2.js: SyntaxError: Unexpected token (1:8)
[${color.red('error')}] > 1 | foo (+-) bar
[${color.red('error')}]     |        ^
[${color.red('error')}]   2 |
[${color.red('error')}] invalid-2.unknown: UndefinedParserError: No parser could be inferred for file "${FIXTURES_PATH}/syntax-errors/invalid-2.unknown".`
  });
});
