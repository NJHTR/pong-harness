import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

if (process.env.VITE_HOST_PROXY === "1" && !process.env.PONG_HOST_TOKEN) {
  throw new Error("PONG_HOST_TOKEN is required for the development Host proxy");
}

export default defineConfig({
  plugins: [react()],
  server: {
    cors: false,
    strictPort: true,
    proxy: process.env.PONG_HOST_TOKEN ? {
      "/api": {
        target: "http://127.0.0.1:4317",
        changeOrigin: true,
        configure(proxy) {
          proxy.on("proxyReq", (request) => {
            request.setHeader("Authorization", `Bearer ${process.env.PONG_HOST_TOKEN}`);
          });
        },
      },
    } : undefined,
  },
});
