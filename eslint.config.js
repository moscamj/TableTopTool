import globals from "globals";
import js from "@eslint/js";

export default [
        {
                ignores: ["src/dist/**"]
        },
        js.configs.recommended,
        {
                languageOptions: {
                        globals: {
                                ...globals.browser,
                                ...globals.node,
                        },
                        ecmaVersion: "latest",
                        sourceType: "module",
                },
                rules: {
                        indent: ["error", 8],
                        "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
                        "no-prototype-builtins": "warn",
                },
        }
];