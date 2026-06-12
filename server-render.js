import { serve } from "bun";
import { existsSync } from "fs";
import path from "path";

const clientDir = "./dist/client";

serve({
  port: process.env.PORT || 10000,
  async fetch(req) {
    const url = new URL(req.url);
    const filePath = path.join(clientDir, url.pathname);
    
    if (existsSync(filePath)) {
      return new Response(Bun.file(filePath));
    }
    
    // fallback al server SSR
    const { default: server } = await import("./dist/server/server.js");
    return server.fetch(req, {}, {});
  }
});
