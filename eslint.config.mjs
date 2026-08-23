import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // These two rules are new/experimental in this eslint-config-next
      // release and currently flag a legitimate, unavoidable pattern:
      // hydrating client state from localStorage inside useEffect (this
      // cannot run during SSR, so it must live in an effect — there is no
      // "purer" alternative for reading a browser-only API on mount).
      // Every flagged call site in this project is exactly that pattern.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "harness/**",
  ]),
]);

export default eslintConfig;
