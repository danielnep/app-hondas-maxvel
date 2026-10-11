/** Apresenta informação clara sem substituir a autorização do sistema operacional. */
const KEY='horizon-maxvel-localizacao-ciencia-v1';
export const CONSENT_VERSION='2026-10-11';
export function getConsent(storage=globalThis.localStorage){
 try{const s=JSON.parse(storage.getItem(KEY)||'null');return s?.version===CONSENT_VERSION&&s?.accepted===true?s:null;}catch{return null;}
}
export function saveConsent(storage=globalThis.localStorage,now=Date.now()){
 const s={version:CONSENT_VERSION,accepted:true,at:now};storage.setItem(KEY,JSON.stringify(s));return s;
}
export function revokeConsent(storage=globalThis.localStorage){try{storage.removeItem(KEY)}catch{}}
export const LOCATION_REQUIREMENTS=Object.freeze([
 {id:'active',title:'Durante a ronda ativa',description:'O acompanhamento deve ficar visível e pode continuar com o aparelho bloqueado na versão nativa Android.'},
 {id:'native',title:'Mesmo fora da tela',description:'A versão nativa usa uma notificação persistente. O navegador não acompanha a localização depois de fechado.'},
 {id:'control',title:'Controle do acompanhamento',description:'O serviço é encerrado ao finalizar a ronda ou ao selecionar Parar na notificação. O Android também pode interrompê-lo.'},
 {id:'privacy',title:'Privacidade e responsabilidade',description:'A localização deve ser utilizada somente para a finalidade informada e em contexto autorizado. Falhas de GPS exigem revisão humana.'}
]);