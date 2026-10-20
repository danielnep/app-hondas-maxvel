import {readFileSync} from 'node:fs';
const files=['ronda-pro','central','operational','mobile-critical','field'];
/** Inspect a named, live CSS section rather than an obsolete source snapshot. */
export function readStyles(section){
 if(section==='application')return ['ronda-pro','operational','mobile-critical','field'].map(f=>readFileSync(new URL('../../assets/'+f+'.css',import.meta.url),'utf8')).join('\n');
 for(const file of files){
  const css=readFileSync(new URL('../../assets/'+file+'.css',import.meta.url),'utf8');
  const marker='/* SECTION: '+section+' */';const start=css.indexOf(marker);
  if(start>=0){const end=css.indexOf('/* SECTION:',start+marker.length);return css.slice(start+marker.length,end<0?undefined:end);}
 }
 throw Error('Missing live CSS section: '+section);
}
