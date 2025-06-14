export default {
  overrides: [
    {
      files: ["dir/*.foo"],
      options: {
        plugins: ["../plugin-extensions/plugin.cjs"]
      }
    },
  ]
};
