import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  // artifacts/ paket çıktısıdır (.gitignore'da) ve derlenmiş JS içerir.
  { ignores: [".next/**", "node_modules/**", "out/**", "artifacts/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
];

export default config;
