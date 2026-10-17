/** Canonical CSS validation. --clean removes only cascade-proven redundancy. */
import postcss from 'postcss';
import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const files=['ronda-pro.css','central.css','operational.css','mobile-critical.css','field.css'];
const clean=process.argv.includes('--clean'),report=[];
// Later identical values are safe even where a browser needs a fallback.
// Different values are pruned only for longhands with baseline literal syntax.
const literalProps=new Set(['width','height','min-width','min-height','max-width','max-height','top','right','bottom','left','z-index','opacity','color','background-color','font-size','font-weight','line-height','letter-spacing','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-color','border-right-color','border-bottom-color','border-left-color']);
const literal=v=>/^(?:0|auto|none|normal|inherit|initial|unset|#[\da-f]{3,8}|-?(?:\d*\.)?\d+(?:px|em|rem|%|vh|vw)?)$/i.test(v);
// Parse every source before allowing a cleanup to mutate any file.
const sheets=files.map(file=>{const source=readFileSync(path.join(root,'assets',file),'utf8');return {file,source,ast:postcss.parse(source,{from:file})};});
for(const {file,source,ast} of sheets){
 let removed=0,empty=0;
 function scope(parent){
  const seen=new Map();
  for(const node of [...(parent.nodes||[])].reverse()){
   if(node.type==='atrule'){
    // Distinct media/supports blocks are never merged, even if text matches.
    if(node.nodes&&!/keyframes$/i.test(node.name))scope(node);
    continue;
   }
   if(node.type!=='rule')continue;
   const selector=node.selector.trim();
   let props=seen.get(selector);if(!props)seen.set(selector,props=new Map());
   for(const decl of [...(node.nodes||[])].reverse()){
    if(decl.type!=='decl')continue;
    const key=decl.prop.startsWith('--')?decl.prop:decl.prop.toLowerCase();
    const later=props.get(key);
    const same=later&&decl.value===later.value;
    const supported=later&&literalProps.has(key)&&literal(later.value);
    if(later&&(!decl.important||later.important)&&(same||supported)){
     removed++;if(clean)decl.remove();
    }else if(!later||decl.important&&!later.important)props.set(key,decl);
   }
   if(clean&&!node.nodes.some(n=>n.type!=='comment')){node.remove();empty++;}
  }
 }
 scope(ast);
 const properties=new Map(),conflicts=[];
 ast.walkRules(rule=>{
  const chain=[];for(let p=rule.parent;p&&p.type!=='root';p=p.parent)if(p.type==='atrule')chain.unshift('@'+p.name+' '+p.params);
  for(const d of rule.nodes||[]){if(d.type!=='decl')continue;
   const key=chain.join('/')+'|'+rule.selector+'|'+d.prop+'|'+!!d.important;
   const previous=properties.get(key);if(previous&&previous.value!==d.value)conflicts.push({selector:rule.selector,property:d.prop,earlier:previous.value,later:d.value,context:chain});
   properties.set(key,d);
  }
 });
 if(clean){
  // Keep component comments for maintainers; removals target declarations only.
  writeFileSync(path.join(root,'assets',file),ast.toString().replace(/\n[ \t]*\n(?:[ \t]*\n)+/g,'\n\n').trim()+'\n');
 }
 report.push({file,bytesBefore:Buffer.byteLength(source),bytesAfter:Buffer.byteLength(readFileSync(path.join(root,'assets',file),'utf8')),redundantDeclarations:removed,emptyRules:empty,remainingDifferentValues:conflicts.length,examples:conflicts.slice(-8)});
}
for(const file of readdirSync(path.join(root,'assets')).filter(x=>x.endsWith('.css')))if(!files.includes(file))throw Error('Untracked CSS layer: '+file);
const expected={index:['ronda-pro','operational','mobile-critical','field'],central:['central','operational','field']};
for(const [page,names] of Object.entries(expected)){
 const html=readFileSync(path.join(root,page+'.html'),'utf8');
 const links=[...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^\"]+)"[^>]*>/g)].map(m=>m[1]).filter(x=>!x.startsWith('https://'));
 if(JSON.stringify(links.map(x=>path.basename(x).split('?')[0]))!==JSON.stringify(names.map(x=>x+'.css')))throw Error('CSS order mismatch in '+page);
}
const sw=readFileSync(path.join(root,'sw.js'),'utf8');
for(const file of files)if(!sw.includes('./assets/'+file))throw Error('CSS absent from offline cache: '+file);
for(const link of sw.matchAll(/'([^']+\.css)'/g))if(!files.some(f=>link[1]==='./assets/'+f))throw Error('Obsolete cache reference: '+link[1]);
if(process.env.CSS_AUDIT_OUTPUT)writeFileSync(process.env.CSS_AUDIT_OUTPUT,JSON.stringify(report,null,2));
console.log(JSON.stringify(report.map(({examples,...item})=>item),null,2));
if(!clean&&report.some(r=>r.redundantDeclarations))throw Error('Redundant declarations reintroduced; review npm run check:styles output.');
