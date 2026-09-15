import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: true,
    proxy: {
      "/live-stream": {
        target: "http://182.140.125.47:808",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/live-stream/, ""),
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            proxyRes.headers["access-control-allow-origin"] = "*";
            proxyRes.headers["access-control-allow-headers"] = "*";
            proxyRes.headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
          });
        },
      },
    },
  },
});
