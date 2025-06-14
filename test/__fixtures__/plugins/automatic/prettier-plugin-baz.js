export default {
  languages: [
    {
      name: "baz",
      parsers: ["baz"],
      extensions: [`.${"baz"}`],
    },
  ],
  parsers: {
    baz: {
      parse: (text) => ({ value: text }),
      astFormat: "baz",
    },
  },
  printers: {
    baz: {
      print(path, options) {
        return (
          `content from \`prettier-plugin-baz.js\` file + ${path.getValue().value}`
        );
      },
    },
  },
};
