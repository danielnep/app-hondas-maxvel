import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const theme=readFileSync(new URL('../assets/horizon-operacional.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const gradle=readFileSync(new URL('../android/app/build.gradle',import.meta.url),'utf8');

test('tema operacional é carregado na web e empacotado no Android',()=>{
 assert.ok(existsSync(new URL('../assets/horizon-operacional.css',import.meta.url)));
 assert.match(html,/assets\/horizon-operacional\.css/);
 assert.match(gradle,/assets\/\*\*/);
});

test('a navegação mobile é definida por papel, com perfil acessível',()=>{
 assert.match(app,/mobileNavFor=role/);
 assert.match(app,/\['minha-ronda','Minha ronda','compass'\]/);
 assert.match(app,/\['notificacoes','Alertas','bell'\]/);
 assert.match(app,/data-action="profile-menu"/);
 assert.match(app,/Sair deste perfil/);
 assert.match(app,/mobileEntries\.map/);
});

test('a navegação compacta não pode ser substituída por display block',()=>{
 assert.match(theme,/\.mobile-nav\.mobile-only\s*\{/);
 assert.match(theme,/display:grid!important/);
 assert.match(theme,/grid-template-columns:repeat\(var\(--nav-items,3\)/);
 assert.match(theme,/safe-area-inset-bottom/);
});

test('ação da ronda, mapa e progresso são o próprio aplicativo e não mockup',()=>{
 const action=app.slice(app.indexOf('function patrolActionContent()'),app.indexOf('function patrolScenarioControls()'));
 const fn=app.indexOf('function phoneContent()');
 const end=app.indexOf('const lessonNames=',fn);
 const workspace=app.slice(fn,end);
 assert.match(action,/readyStartPanel\(\)/);
 assert.match(action,/Iniciar ronda|Concluir ponto e seguir/);
 assert.ok(workspace.includes('patrolActionContent()'));
 assert.ok(workspace.includes('id="mobile-map"'));
 assert.ok(workspace.includes('patrol-workspace'));
 assert.match(app,/simulation-rolebar/);
 assert.match(app,/beginSimulation\(/);
 assert.match(app,/screen='dashboard'/);
 assert.match(app,/Experimente o aplicativo real/);
});

test('aviso compacto preserva a ciência, a escolha sem GPS e os limites nativos',()=>{
 assert.match(app,/consent-compact/);
 assert.match(app,/consent-details/);
 assert.match(app,/Li e aceito · Continuar/);
 assert.match(app,/Explorar sem localização GPS/);
 assert.match(app,/não concede permissão ao GPS/);
 assert.match(app,/parada forçada/);
 assert.match(theme,/\.consent-actions\s*\{position:sticky/);
});
