import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  ...nextVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    ignores: ["out/**", ".next/**", "public/maps/**"],
  },
];

export default eslintConfig;
