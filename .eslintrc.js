module.exports = {
  extends: ["@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: "./tsconfig.json",
    ecmaVersion: 2020,
    sourceType: "module"
  },
  plugins: ["@typescript-eslint"],
  rules: {
    "import/no-extraneous-dependencies": "off",
    "no-console": "off",
    "no-continue": "off",
    "no-restricted-syntax": "off",
    "no-await-in-loop": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "warn"
  }
};
