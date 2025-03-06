export default {
  overrides: [
    {
      // TODO (43081j): this was originally `*.foo` in prettier. Our globs
      // behave differently. `*.foo` was matching `src/*.foo`
      files: ["**/*.foo"],
      options: {
        plugins: ["../plugin-extensions/plugin.cjs"]
      }
    },
    {
      files: ["**/*.bar"],
      options: {
        plugins: ["../plugin-extensions2/plugin.cjs"]
      }
    }
  ]
};
