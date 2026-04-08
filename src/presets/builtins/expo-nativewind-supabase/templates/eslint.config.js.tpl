const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([
  ...expoConfig,
  {
    files: ["babel.config.js", "metro.config.js", "tailwind.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
      },
    },
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
]);
