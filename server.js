import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {dirname, extname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createOperationalApi} from './server/operational-api.js';

const publicRoot = dirname(fileURLToPath(import.meta.url));
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// Publish only the existing web application, never repository or server files.
function publicFile(requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(requestUrl.split('?')[0]); }
  catch { return null; }
  if (!pathname.startsWith('/') || /[\\\0]/.test(pathname)) return null;
  if (pathname.split('/').some(part => part.startsWith('.'))) return null;
  if (pathname === '/') return 'index.html';
  if (pathname === '/central.html' || pathname === '/index.html' || pathname === '/sw.js' || pathname === '/manifest.webmanifest') return pathname.slice(1);
  if (pathname.startsWith('/src/') || pathname.startsWith('/assets/')) return pathname.slice(1);
  return null;
}

export function createAppServer() {
  const operationalApi=createOperationalApi();
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Cache-Control', 'no-cache');

    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, {'Content-Type': type, 'Content-Length': Buffer.byteLength(body)});
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (request.url?.startsWith('/api/')) {await operationalApi(request,response);return;}
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      send(405, 'Método não permitido.');
      return;
    }
    if (request.url.split('?')[0] === '/health') {
      send(200, JSON.stringify({status: 'ok', app: 'Ronda Pro'}), 'application/json; charset=utf-8');
      return;
    }
    const relativeFile = publicFile(request.url);
    const type = relativeFile && contentTypes[extname(relativeFile).toLowerCase()];
    if (!type) { send(404, 'Página não encontrada.'); return; }
    try {
      const absoluteFile = resolve(publicRoot, relativeFile);
      const info = await stat(absoluteFile);
      if (!info.isFile()) { send(404, 'Página não encontrada.'); return; }
      if (request.method === 'HEAD') {
        response.writeHead(200, {'Content-Type': type, 'Content-Length': info.size});
        response.end();
        return;
      }
      send(200, await readFile(absoluteFile), type);
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') send(404, 'Página não encontrada.');
      else { console.error('Falha ao servir arquivo público:', error.code); send(500, 'Não foi possível abrir esta página.'); }
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida.');
  const server = createAppServer();
  server.listen(port, '0.0.0.0', () => console.log(`Ronda Pro disponível na porta ${port}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
