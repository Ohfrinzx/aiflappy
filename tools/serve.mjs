// Zero-dependency static file server used by `npm run dev` (tools/dev.mjs) and
// the smoke test.
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

// cacheControl: 'no-store' for development (edits show on refresh).
export function createStaticServer({ root = ROOT, cacheControl = 'no-store' } = {}) {
  return http.createServer((req, res) => {
    let rel;
    try {
      rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    let file = path.resolve(root, `.${rel}`);
    if (file !== root && !file.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
      'Cache-Control': cacheControl,
    });
    fs.createReadStream(file).pipe(res);
  });
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

function listen(server, port, tries = 20) {
  return new Promise((resolve, reject) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && tries > 0) resolve(listen(server, port + 1, tries - 1));
      else reject(err);
    });
    server.listen(port, '0.0.0.0', () => resolve(port));
  });
}

// Starts the dev server and prints the URLs. Returns the port used.
export async function startDevServer(wantedPort = 8080) {
  const port = await listen(createStaticServer(), wantedPort);
  console.log('\n  aiflappy dev server running\n');
  console.log(`  Local:   http://localhost:${port}/`);
  for (const ip of lanAddresses()) console.log(`  Network: http://${ip}:${port}/   (open on your phone, same Wi-Fi)`);
  console.log('\n  Testing shortcuts: ?start=95 (boss soon)  ?god  ?play');
  console.log('  Press Ctrl+C to stop.\n');
  return port;
}
