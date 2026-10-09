import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      react: fileURLToPath(new URL("./node_modules/react", import.meta.url)),
      "react-dom": fileURLToPath(new URL("./node_modules/react-dom", import.meta.url)),
      "@testing-library/react": fileURLToPath(new URL("./node_modules/@testing-library/react", import.meta.url)),
      vitest: fileURLToPath(new URL("./node_modules/vitest", import.meta.url)),
    },
  },
  server: { fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] } },
  test: {
    environment: "jsdom",
    include: ["../src/screens/Missed.test.tsx"],
    setupFiles: ["./setup.ts"],
  },
});
