import { version as PRETTIER_VERSION } from "prettier";
import { runCli } from "../utils";

describe("show version with --version", () => {
  runCli("with-shebang", [
    "--version",
  ]).test({
    stdout: PRETTIER_VERSION,
    status: 0,
  });
});

describe("show usage with --help", () => {
  runCli("", [
    "--help",
  ]).test({
    status: 0,
  });
});

describe("throw error with --check + --list-different", () => {
  runCli("", [
    "--check",
    "--list-different",
  ]).test({
    status: 1,
  });
});

describe("throw error with --check + --write", () => {
  runCli("", [
    "--check",
    "--write",
  ]).test({
    status: 1,
  });
});

describe("throw error with --list-different + --write", () => {
  runCli("", [
    "--list-different",
    "--write",
  ]).test({
    status: 1,
  });
});

describe("throw unsupported error with --file-info", () => {
  runCli("", [
    "--file-info",
    "abc.js",
    "def.js",
  ]).test({
    status: 1,
  });
});

describe("throw unsupported error with --find-config-path", () => {
  runCli("", [
    "--find-config-path",
    "abc.js",
    "def.js",
  ]).test({
    status: 1,
  });
});

describe("throw unsupported error with --support-info", () => {
  runCli("", [
    "--support-info",
    "abc.js",
    "def.js",
  ]).test({
    status: 1,
  });
});

describe("throw error with something unexpected", () => {
  runCli("", [], {
    isTTY: true,
  }).test({
    status: "non-zero",
  });
});
