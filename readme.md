# prettier-cli

A faster CLI for Prettier.

The goal is to make this close to ~100% backwards compatible, and then just ship it in a future stable release of the `prettier` package, replacing the current CLI.

If you find any bugs, missing features, or unexpected slowness, please open an issue.

## Installation

```sh
npm install prettier@next
```

It should be largely backwards compatible:

```sh
prettier . --check # Like before, but faster
```

You can also try it via `npx`, though `npx` itself is pretty slow:

```sh
npx prettier@next . --check
```
