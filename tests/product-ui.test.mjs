import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
const map=readFileSync(new URL('../src/map.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('aplicativo usa identidade Maxvel própria nos acessos web e Android',()=>{
 assert.ok(existsSync(new URL('../assets/maxvel-icon.svg',import.meta.url)));
 assert.match(html,/rel="icon"[^>]+maxvel-icon\.svg/);
 assert.match(app,/brand-icon/);
 const gradle=readFileSync(new URL('../android\/app\/build.gradle',import.meta.url),'utf8');
 assert.match(gradle,/assets\/\*\*/);
});

test('entrada mostra plataforma com acesso à operação e mapa cartográfico',()=>{
 assert.match(app,/product-hero/);
 assert.match(app,/Conhecer a operação/);
 assert.match(app,/Acessar minha área/);
 assert.match(app,/id="hero-map"/);
 assert.match(app,/Pontos e trajeto de demonstração|cenário operacional|cenário operacional fictício/);
 assert.match(css,/product-showcase/);
});

test('central operacional oferece mapa, progresso, alertas e histórico local',()=>{
 for(const key of ['ops-workspace','ops-map','ops-activity','ops-alert-list','ops-timeline','tablePatrols'])assert.ok(app.includes(key),key);
 assert.match(app,/indicadores|Rondas registradas/);
 assert.match(app,/dados locais|registros são locais|dados deste ambiente/i);
});

test('tela móvel orienta trabalho sem gamificação',()=>{
 for(const key of ['mobile-operational-strip','mobile-map-stage','mobile-progress-chip','guide-inline','complete-point'])assert.ok(app.includes(key),key);
 assert.match(app,/30 s contínuos/);
 assert.match(app,/Dentro do raio/);
 assert.doesNotMatch(app,/ranking de vigilantes|pontos de experiência|leaderboard/i);
});

test('mapa exibe base real, alternativa e localização visual distinguível',()=>{
 assert.match(map,/tile\.openstreetmap\.org/);
 assert.match(map,/basemaps\.cartocdn\.com/);
 assert.match(map,/OpenStreetMap contributors/);
 assert.match(map,/map-person-ring/);
 assert.match(map,/tracePositions/);
 assert.match(map,/Desvio registrado/);
 assert.match(map,/mapa esquemático/);
});

test('transparência: aviso e opção de dispensar GPS, sem alegar rastreamento web fechado',()=>{
 assert.match(app,/Li e aceito · Continuar/);
 assert.match(app,/não concede permissão ao GPS/);
 assert.match(app,/Explorar sem localização GPS|demonstração sem GPS/);
 assert.match(app,/No navegador, o GPS para ao fechar a página/);
});
