import {createServer} from 'node:http';
import {createReadStream} from 'node:fs';
import {readFile, stat} from 'node:fs/promises';
import {dirname, extname, resolve, basename} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createPrivacyHandler} from './server/privacy.js';
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
  '.woff2': 'font/woff2',
  '.aab': 'application/octet-stream',
  '.apk': 'application/vnd.android.package-archive',
  '.zip': 'application/zip',
  '.txt': 'text/plain; charset=utf-8'
};

// Publish only the existing web application, never repository or server files.
function publicFile(requestUrl) {
  let pathname;
  try { pathname = decodeURIComponent(requestUrl.split('?')[0]); }
  catch { return null; }
  if (!pathname.startsWith('/') || /[\\\0]/.test(pathname)) return null;
  if (pathname.split('/').some(part => part.startsWith('.'))) return null;
  if (pathname.startsWith('/app/')) pathname = pathname.slice(4);
  if (pathname === '/' || pathname === '/app') return 'central.html';
  if (pathname === '/src/pages-test-api.js') return 'src/production-api-mode.js';
  if (['/central.html','/index.html','/sw.js','/manifest.webmanifest'].includes(pathname)) return pathname.slice(1);
  if (pathname.startsWith('/src/') || pathname.startsWith('/assets/')) return pathname.slice(1);
  if (pathname.startsWith('/artifacts/releases/') && (pathname.endsWith('.apk') || pathname.endsWith('.aab') || pathname.endsWith('.zip'))) return pathname.slice(1);
  return null;
}

export function createAppServer() {
  const operationalApi=createOperationalApi();
  const privacy=createPrivacyHandler();
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, POST, PUT, DELETE, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Ronda-Event-Id, X-Ronda-Media-Id, X-Captured-At, X-Media-View, X-Treatment-Session');
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }

    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      response.writeHead(status, {'Content-Type': type, 'Content-Length': Buffer.byteLength(body)});
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if(await privacy(request,response))return;
    if (request.url?.startsWith('/api/')) {await operationalApi(request,response);return;}
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      send(405, 'Método não permitido.');
      return;
    }
    if (request.url.split('?')[0] === '/health') {
      send(200, JSON.stringify({status: 'ok', app: 'Ronda Pro', mode: 'production', version: '2.3.0-production', authentication: 'vps'}), 'application/json; charset=utf-8');
      return;
    }
    const cleanUrl = request.url.split('?')[0];

    // Página dedicada de downloads
    if (['/downloads', '/download', '/baixar', '/downloads.html'].includes(cleanUrl)) {
      const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#09090b">
  <title>Download Ronda Pro 2.4.3 | Grupo Maxvel</title>
  <link rel="icon" href="/assets/maxvel-icon.svg" type="image/svg+xml">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px;
    }
    .card {
      background: rgba(25, 25, 25, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      max-width: 480px;
      width: 100%;
      padding: 32px 24px;
      text-align: center;
      box-shadow: 0 16px 48px rgba(0,0,0,0.7);
    }
    .logo { width: 56px; height: 56px; margin: 0 auto 16px; }
    h1 { font-size: 22px; font-weight: 800; margin-bottom: 6px; letter-spacing: -0.02em; }
    .badge {
      display: inline-block;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    p.desc { font-size: 14px; color: #a1a1aa; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      padding: 16px 20px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      margin-bottom: 12px;
      transition: transform 0.1s ease, filter 0.2s ease;
    }
    .btn:active { transform: scale(0.98); }
    .btn-primary {
      background: #e5232a;
      color: #ffffff;
      box-shadow: 0 4px 20px rgba(229, 35, 42, 0.4);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: #f4f4f5;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .meta-box {
      background: rgba(0, 0, 0, 0.35);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 10px;
      padding: 14px;
      margin-top: 20px;
      text-align: left;
      font-size: 12px;
      color: #71717a;
      line-height: 1.6;
    }
    .meta-box strong { color: #d4d4d8; }
    .back { margin-top: 20px; font-size: 13px; color: #71717a; text-decoration: none; display: inline-block; }
    .back:hover { color: #f4f4f5; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/assets/maxvel-icon.svg" class="logo" alt="Maxvel">
    <h1>Ronda Pro Operacional</h1>
    <span class="badge">Versão 2.5.0 (Build 26)</span>
    <p class="desc">Aplicativo Android oficial integrado ao COI com telemetria contínua por deslocamento e 535 mapas offline.</p>
    
    <a href="/download-apk" class="btn btn-primary" download="Ronda-Pro-2.5.0-Operacional.apk">
      📲 Baixar APK Android (47.5 MB)
    </a>
    <a href="/download-aab" class="btn btn-secondary" download="Ronda-Pro-2.5.0-Operacional.aab">
      📦 Baixar Pacote Play Store AAB (24.87 MB)
    </a>

    <div class="meta-box">
      <div><strong>Arquivo APK:</strong> Ronda-Pro-2.5.0-Operacional.apk (Build 26)</div>
      <div><strong>Arquivo Play Store:</strong> Ronda-Pro-2.5.0-Operacional.aab (Build 26)</div>
      <div><strong>Assinatura:</strong> RSA 3072 / APK Signature Scheme v2 e v3</div>
      <div><strong>Instalação Android:</strong> Abra o arquivo APK baixado no celular. Caso solicitado pelo sistema, selecione "Permitir desta fonte" para concluir a instalação.</div>
    </div>

    <a href="/central.html" class="back">← Voltar para Central Operacional</a>
  </div>
</body>
</html>`;
      send(200, html, 'text/html; charset=utf-8');
      return;
    }

    // Rota direta de download do APK Android com Content-Disposition garantido
    if (['/download-apk', '/download/apk', '/app.apk', '/ronda-pro.apk', '/assets/downloads/ronda-pro.apk', '/assets/downloads/Ronda-Pro-2.5.0-Operacional.apk', '/assets/downloads/Ronda-Pro-2.4.3-Operacional.apk'].includes(cleanUrl)) {
      const candidates = [
        resolve(publicRoot, 'artifacts/releases/Ronda-Pro-2.5.0-Operacional.apk'),
        resolve(publicRoot, 'assets/downloads/Ronda-Pro-2.5.0-Operacional.apk'),
        resolve(publicRoot, 'artifacts/releases/Ronda-Pro-2.4.3-Operacional.apk'),
        resolve(publicRoot, 'assets/downloads/Ronda-Pro-2.4.3-Operacional.apk'),
        resolve(publicRoot, 'assets/downloads/ronda-pro.apk'),
        resolve(publicRoot, 'assets/ronda-pro.apk')
      ];
      let apkPath = null, apkStat = null;
      for (const c of candidates) {
        try {
          const s = await stat(c);
          if (s.isFile()) { apkPath = c; apkStat = s; break; }
        } catch {}
      }
      if (!apkPath) {
        send(404, 'APK ainda não gerado neste ambiente.');
        return;
      }
      const fname = basename(apkPath);
      response.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': apkStat.size,
        'Content-Disposition': 'attachment; filename="' + fname + '"',
        'Cache-Control': 'public, max-age=300'
      });
      if (request.method === 'HEAD') { response.end(); return; }
      createReadStream(apkPath).pipe(response);
      return;
    }

    // Rota direta de download do AAB Google Play com Content-Disposition garantido
    if (['/download-aab', '/download/aab', '/app.aab', '/ronda-pro.aab', '/assets/downloads/ronda-pro.aab', '/assets/downloads/Ronda-Pro-2.5.0-Operacional.aab', '/assets/downloads/Ronda-Pro-2.4.3-Operacional.aab'].includes(cleanUrl)) {
      const candidates = [
        resolve(publicRoot, 'artifacts/releases/Ronda-Pro-2.5.0-Operacional.aab'),
        resolve(publicRoot, 'assets/downloads/Ronda-Pro-2.5.0-Operacional.aab'),
        resolve(publicRoot, 'artifacts/releases/Ronda-Pro-2.4.3-Operacional.aab'),
        resolve(publicRoot, 'assets/downloads/Ronda-Pro-2.4.3-Operacional.aab'),
        resolve(publicRoot, 'assets/downloads/ronda-pro.aab'),
        resolve(publicRoot, 'assets/ronda-pro.aab')
      ];
      let aabPath = null, aabStat = null;
      for (const c of candidates) {
        try {
          const s = await stat(c);
          if (s.isFile()) { aabPath = c; aabStat = s; break; }
        } catch {}
      }
      if (!aabPath) {
        send(404, 'Pacote AAB ainda não gerado neste ambiente.');
        return;
      }
      const fname = basename(aabPath);
      response.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': aabStat.size,
        'Content-Disposition': 'attachment; filename="' + fname + '"',
        'Cache-Control': 'public, max-age=300'
      });
      if (request.method === 'HEAD') { response.end(); return; }
      createReadStream(aabPath).pipe(response);
      return;
    }

    const relativeFile = publicFile(request.url);
    const type = relativeFile && contentTypes[extname(relativeFile).toLowerCase()];
    if (!type) { send(404, 'Página não encontrada.'); return; }
    try {
      const absoluteFile = resolve(publicRoot, relativeFile);
      const info = await stat(absoluteFile);
      if (!info.isFile()) { send(404, 'Página não encontrada.'); return; }
      const headers = {'Content-Type': type, 'Content-Length': info.size};
      if (['.apk', '.aab', '.zip'].includes(extname(relativeFile).toLowerCase())) {
        headers['Content-Disposition'] = 'attachment; filename="' + basename(absoluteFile) + '"';
      }
      response.writeHead(200, headers);
      if (request.method === 'HEAD') {
        response.end();
        return;
      }
      createReadStream(absoluteFile).pipe(response);
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
  server.listen(port, '0.0.0.0', () => console.log(`Rondas Pro disponível na porta ${port}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 8000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
