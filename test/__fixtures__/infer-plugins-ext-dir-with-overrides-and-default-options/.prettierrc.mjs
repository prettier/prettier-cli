export default {
  overrides: [
    {
      // TODO (43081j): in prettier, this was `*.foo` and would successfully
      // match `src/*.foo`. In prettier CLI, this is not the case
      files: ["**/*.foo"],
      options: {
        plugins: ["../plugin-default-options/plugin.cjs"]
      }
    }
  ]
};
