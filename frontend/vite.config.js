import { defineConfig } from "vite";

export default defineConfig({
  server: {
    open: true,
  },
  optimizeDeps: {
    exclude: ["web-ifc"],
  },
  assetsInclude: ["**/*.wasm"],
});

