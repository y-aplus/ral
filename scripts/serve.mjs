import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import process from "node:process";

const root = join(process.cwd(), "site");
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const server = createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  const requested = pathname === "/" ? "/index.html" : pathname;
  const file = normalize(join(root, requested));

  if (!file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "content-type": mime[extname(file)] || "application/octet-stream",
    "cache-control": "no-store"
  });
  createReadStream(file).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Reinvention Avoidance Layer site: http://127.0.0.1:${port}`);
});
