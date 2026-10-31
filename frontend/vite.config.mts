import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";

// The manual semantic version is the package.json version.
const readSharedVersion = () => {
  try {
    return JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version as string;
  } catch {
    return "unknown";
  }
};

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(readSharedVersion())
  },
  server: {
    port: 5173,
    // print time utilities are shared with the backend (backend/src/printTime.ts)
    fs: { allow: [".."] },
    proxy: {
      "/api": "http://localhost:4000",
      "/uploads": "http://localhost:4000"
    }
  }
});
