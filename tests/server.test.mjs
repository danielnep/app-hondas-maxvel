import test from 'node:test';
import assert from 'node:assert/strict';
import {request} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createAppServer} from '../server.js';

test('servidor de implantação entrega o app e impede acesso ao repositório', async t => {
  const server = createAppServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const port = server.address().port;
  const get = (path, method = 'GET') => new Promise((resolve, reject) => {
    const req = request({hostname: '127.0.0.1', port, path, method}, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks)}));
    });
    req.on('error', reject);
    req.end();
  });

  await t.test('entrada e arquivos públicos mantêm conteúdo e tipo corretos', async () => {
    for (const [path, file, mime] of [
      ['/', 'index.html', 'text/html'],
      ['/src/app.js?v=27', 'src/app.js', 'text/javascript'],
      ['/assets/ronda-pro.css?v=49', 'assets/ronda-pro.css', 'text/css'],
      ['/assets/horizon-logo-transparente.webp', 'assets/horizon-logo-transparente.webp', 'image/webp']
    ]) {
      const res = await get(path);
      assert.equal(res.status, 200, path);
      assert.ok(res.headers['content-type'].startsWith(mime), path);
      assert.deepEqual(res.body, await readFile(new URL('../' + file, import.meta.url)), path);
    }
  });
  await t.test('HEAD e saúde respondem sem depender de serviços externos', async () => {
    const head = await get('/src/app.js', 'HEAD');
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.ok(Number(head.headers['content-length']) > 0);
    const health = await get('/health');
    assert.equal(health.status, 200);
    assert.deepEqual(JSON.parse(health.body), {status: 'ok', app: 'Rondas Pro'});
  });
  await t.test('arquivos internos, travessia e caminhos inválidos ficam inacessíveis', async () => {
    for (const path of ['/.git/config', '/.env', '/package.json', '/server.js', '/docs/R6-BACKEND-CONTRATOS-E-DEPENDENCIAS.md', '/android/app/build.gradle', '/src/../server.js', '/src/%2e%2e/server.js', '/src/%2eenv', '/src/%2e%2e%5cserver.js', '/src/%00', '/src/%ZZ', '/src/missing.js', '/assets/']) {
      assert.equal((await get(path)).status, 404, path);
    }
  });
  await t.test('métodos de escrita são recusados', async () => {
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const res = await get('/', method);
      assert.equal(res.status, 405);
      assert.equal(res.headers.allow, 'GET, HEAD');
    }
  });
});
