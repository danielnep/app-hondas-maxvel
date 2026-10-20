import {readStyles} from './helpers/styles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const app=read('src/app.js');
const curtain=read('src/checkpoint-curtain.js');
const capture=read('src/media-capture.js');
const css=readStyles('mobile-critical-20261016');
const index=read('index.html');
const sw=read('sw.js');

test('campo começa pela lista de conversas e notificações permitem leitura',()=>{
 assert.match(app,/let demoChatScreen='list'/);
 assert.match(app,/field-chat-contact-row[^\n]+data-action="demo-chat-open"/);
 assert.match(app,/field-chat-thread/);
 assert.match(app,/field-chat-compose/);
 assert.match(app,/data-action="demo-chat-list"/);
 assert.match(app,/Voltar/);
 assert.match(app,/if\(act==='demo-chat-open'\)/);
 assert.match(app,/if\(act==='demo-chat-list'\)/);
 assert.match(app,/if\(nav==='chat-interno'&&view!==nav\)demoChatScreen=/);
 assert.match(app,/if\(act==='notification-detail'\)\{notificationDialog/);
 assert.match(app,/sessionStorage\.getItem\('rondaspro_api_token'\)/);
});
test('cronômetro não duplica unidade nem mostra formulário cedo',()=>{
 assert.doesNotMatch(curtain,/min:seg/);
 assert.match(curtain,/data-dwell-seconds>00:30/);
 assert.match(curtain,/\.checkpoint-after-timer,\.checkpoint-condition,\.checkpoint-submit/);
 assert.match(css,/\.checkpoint-condition\[hidden\][^}]*\{display:none!important\}/);
 assert.match(css,/data-rp2-phase="counting"/);
 assert.match(css,/height:max-content!important/);
});
test('capturas principais não são duplicadas em extras',()=>{
 assert.match(curtain,/data-evidence-kind="point-photo"/);
 assert.match(curtain,/data-evidence-view="selfie"/);
 assert.match(curtain,/evidenceButtons\(\{kinds:\['video','audio'\],includeList:false\}\)/);
 assert.match(curtain,/list\.hidden=!evidenceFiles\.length/);
 assert.match(capture,/export const evidenceButtons=\(\{kinds=/);
 assert.match(curtain,/api\.torch\?\.toggle/);
});
test('janelas do vigia usam altura por conteúdo e retorno único',()=>{
 assert.match(app,/modal\.classList\.add\('ux06-compact'\)/);
 assert.match(app,/modal\.querySelector\('\.dialog-close'\)\?\.remove\(\)/);
 assert.doesNotMatch(app.slice(app.indexOf('function openUX06Overlay'),app.indexOf('function installUX06')),/modal\.classList\.add\('ux06-fullscreen'\)/);
 assert.match(css,/#dialog\.ux06-compact\[open\]/);
 assert.match(css,/#dialog\[open\]:has\(\.field-composer\)/);
 assert.match(css,/\.checkpoint-curtain\s*\.checkpoint-curtain-panel/);
});
test('estilos críticos carregam por último e entram no PWA',()=>{
 assert.ok(index.includes('mobile-critical.css?v=50'));
 assert.match(index,/rondas-pro-updated-v50/);
 assert.match(sw,/rondas-pro-interface-v50/);
 assert.ok(sw.includes('./assets/mobile-critical.css'));
 const before=index.indexOf('operational.css');
 const after=index.indexOf('mobile-critical.css');
 assert.ok(before>=0&&after>before,'CSS novo deve sobrescrever o estilo legado');
});

test('marca Grupo Maxvel permanece visível no cabeçalho mobile',()=>{
 const style=readStyles('maxvel-atelier-20261016');
 assert.match(style,/\.dashboard \.app-header \.brand \.brand-partner\{[^}]*display:flex!important/);
 assert.match(style,/\.dashboard \.app-header \.brand \.maxvel-real-logo\{[^}]*display:block!important/);
 assert.doesNotMatch(style,/\.dashboard \.app-header \.brand \.brand-partner\{display:none!important/);
 assert.ok(index.includes('field.css?v=50'));
});

test('vistorias têm mapa independente, fotos múltiplas e termos profissionais',()=>{
 const central=read('src/central.js'),inspector=read('src/inspection-route-map.js'),server=read('server/ops-center.js');
 assert.match(app,/mapId:'demo-inspection-map'/);
 assert.match(app,/inspectionCockpit/);
 assert.match(central,/inspectionCockpit/);
 assert.doesNotMatch(app,/Tudo OK/);
 assert.match(read('src/field-inspection-wizard.js'),/name="localPhoto" accept="image\/\*" multiple/);
 assert.match(central,/data-inspection-photo-upload/);
 assert.match(read('src/field-inspection-wizard.js'),/Identifiquei uma anormalidade/);
 assert.match(inspector,/watchPosition/);
 assert.match(inspector,/route_points/);
 assert.match(server,/route_points/);
 assert.match(index,/field\.css/);
});
