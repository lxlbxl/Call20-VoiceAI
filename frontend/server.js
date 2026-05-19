import http from 'http';
import { createReadStream, existsSync } from 'fs';
import { join, extname, resolve } from 'path';
import { parse } from 'url';

const PORT = process.env.PORT || 3000;
const BASE_DIR = process.env.STATIC_DIR || '/app/.next/server';

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  const parsedUrl = parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Serve static files from .next/static
  if (pathname.startsWith('/_next/static/')) {
    const filePath = join(BASE_DIR, pathname);
    serveFile(filePath, res);
    return;
  }

  // Try to find the static HTML file
  let filePath = join(BASE_DIR, 'app', pathname);

  // If it's a directory, look for index.html
  if (existsSync(filePath) && !extname(filePath)) {
    const indexPath = join(filePath, 'index.html');
    if (existsSync(indexPath)) {
      serveFile(indexPath, res);
      return;
    }
  }

  // Check for .html extension
  if (!extname(filePath)) {
    const htmlPath = filePath + '.html';
    if (existsSync(htmlPath)) {
      serveFile(htmlPath, res);
      return;
    }
  }

  // If file doesn't exist, serve index.html (SPA fallback)
  const indexPath = join(BASE_DIR, 'app', 'index.html');
  if (existsSync(indexPath)) {
    serveFile(indexPath, res);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

function serveFile(filePath, res) {
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, { 'Content-Type': contentType });
  createReadStream(filePath).pipe(res);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});