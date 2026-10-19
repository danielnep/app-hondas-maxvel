import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import postcss from 'postcss';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const files=['central.css','field.css','mobile-critical.css','operational.css','ronda-pro.css','theme.css'];
test('fontes canônicas CSS válidas, sem módulos órfãos ou imports locais ocultos',()=>{
 assert.deepEqual(readdirSync(new URL('../assets',import.meta.url)).filter(x=>x.endsWith('.css')).sort(),files);
 for(const file of files){
  const tree=postcss.parse(read('assets/'+file));
  tree.walkAtRules('import',rule=>assert.match(rule.params,/https:\/\/fonts\.googleapis\.com\//));
  tree.walkRules(rule=>assert.notEqual(rule.parent.type,'rule','Regra absorvida por chave não fechada: '+rule.selector));
 }
});
test('botão enviar do chat termina antes do hover e dos demais componentes',()=>{
 const tree=postcss.parse(read('assets/field.css'));
 for(const selector of ['.dashboard .field-chat-compose .button.primary','.dashboard .field-chat-compose .button.primary:hover','.dashboard .rp-direct-chat']){
  const rules=[];tree.walkRules(selector,r=>rules.push(r));
  assert.ok(rules.length,selector);assert.ok(rules.some(r=>r.parent.type==='root'||r.parent.name==='layer'),selector+' precisa existir fora de media queries');assert.ok(rules.every(r=>r.parent.type!=='rule'),selector+' precisa ser independente');
 }
});
test('web demo e central compartilham camadas na mesma ordem, cache só inclui CSS existente',()=>{
 const expected={index:['ronda-pro','operational','mobile-critical','field','theme']};
 for(const [page,order] of Object.entries(expected)){
  const links=[...read(page+'.html').matchAll(/href="\.\/assets\/([^"?]+)\.css\?v=(\d+)"/g)];
  assert.deepEqual(links.map(m=>m[1]),order);assert.ok(links.every(m=>m[2]==='50'));
 }
 const cached=[...read('sw.js').matchAll(/'\.\/assets\/([^']+\.css)'/g)].map(m=>m[1]).sort();
 assert.deepEqual(cached,files);
});
