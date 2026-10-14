import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const app=read('../src/app.js');
const css=read('../assets/ronda-pro.css');
const paginate=read('../src/dialog-pagination.js');
const motion=read('../src/ui-motion.js');

test('guia mobile do vigia mantém cinco etapas, conteúdos e navegação guiada',()=>{
 const guide=app.slice(app.indexOf('function showGuide('),app.indexOf('function showDialog(',app.indexOf('function showGuide(')));
 assert.match(guide,/lessonNames\.map/);
 assert.match(guide,/ops\.guideSection\(\)/);
 assert.match(guide,/lesson\(guideStage\)/);
 assert.match(guide,/guide-shell/);
 assert.match(guide,/guide-header/);
 assert.match(guide,/guide-scroll/);
 assert.match(guide,/guide-footer/);
 assert.match(guide,/guide-step-picker/);
 assert.match(guide,/guide-forward/);
 assert.match(guide,/guide-back/);
 assert.match(guide,/modal\.classList\.add\('guide-dialog'\)/);
 assert.match(guide,/focus\(\{preventScroll:true\}\)/);
 assert.match(app,/function lesson\(i\)/);
 assert.match(app,/data-action="guide"/);
});
test('somente o corpo do guia rola e abas não exigem deslizar lateralmente no celular',()=>{
 const rules=css.slice(css.lastIndexOf('MAXVEL 14 · Guia de ronda mobile'));
 assert.match(rules,/dialog\.guide-dialog\[open\]/);
 assert.match(rules,/height:calc\(100dvh - 12px\)!important/);
 assert.match(rules,/overflow-y:auto!important;overflow-x:hidden!important/);
 assert.match(rules,/touch-action:pan-y!important/);
 assert.match(rules,/\.guide-tabs\{grid-template-columns:1fr!important/);
 assert.match(rules,/\.guide-footer/);
 assert.match(rules,/min-height:44px!important/);
 assert.match(rules,/prefers-reduced-motion:reduce/);
});
test('paginação e gesto de dispensar janela não roubam rolagem do guia',()=>{
 assert.match(paginate,/dialog\.classList\.contains\('guide-dialog'\)/);
 assert.match(motion,/modal\.classList\.contains\('guide-dialog'\)/);
});
