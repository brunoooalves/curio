import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["lib/**/*.{test,spec}.{ts,tsx}", "test/**/*.{test,spec}.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.{ts,tsx}"],
      exclude: ["lib/**/*.{test,spec}.{ts,tsx}"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@/lib": path.resolve(__dirname, "./lib"),
      "@/components": path.resolve(__dirname, "./components"),
      "@/test": path.resolve(__dirname, "./test"),
      "@/app": path.resolve(__dirname, "./app"),
    },
  },
});
