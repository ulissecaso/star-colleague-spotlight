import { serve } from "bun";
import { existsSync, statSync } from "fs";
import path from "path";

const clientDir = "./dist/client";

const mimeTypes = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

serve({
  port: process.env.PORT || 10000,
  async fetch(req) {
    const url = new URL(req.url);
    const filePath = path.join(clientDir, url.pathname);
    
    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const ext = path.extname(filePath);
      const contentType = mimeTypes[ext] || "application/octet-stream";
      return new Response(Bun.file(filePath), {
        headers: { "Content-Type": contentType }
      });
    }
    
    const { default: server } = await import("./dist/server/server.js");
    return server.fetch(req, {}, {});
  }
});
