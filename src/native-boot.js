/* Entra somente no bundle Android: interface offline com o MESMO frontend Glass web. */
(function(){
 'use strict';
 window.__RONDA_ANDROID_BUNDLE__=true;
 window.__RONDA_PRODUCTION__=true;
 const bridge=window.RondaOffline;
 const originalFetch=window.fetch.bind(window);
 const pendingChatKey='ronda-pro-offline-chat-outbox-view-v1';
 const chatMessagesPath=/^\/chat\/conversations\/([a-zA-Z0-9-]+)\/messages(?:\?.*)?$/;
 function pendingChats(){try{return JSON.parse(localStorage.getItem(pendingChatKey)||'[]').filter(x=>x&&x.id&&x.cid)}catch{return []}}
 function savePending(items){try{localStorage.setItem(pendingChatKey,JSON.stringify(items.slice(-300)))}catch{}}
 function mergeChat(path,raw){
  const match=path.match(chatMessagesPath);if(!match)return raw;
  try{
   const obj=JSON.parse(raw),pending=pendingChats(),existing=new Set((obj.messages||[]).map(m=>m.id));
   const keep=pending.filter(m=>!existing.has(m.id));if(keep.length!==pending.length)savePending(keep);
   const extra=keep.filter(m=>m.cid===match[1]).map(({cid,...m})=>m);
   if(!extra.length)return raw;
   obj.messages=[...(obj.messages||[]),...extra].sort((a,b)=>a.created_at-b.created_at);
   return JSON.stringify(obj);
  }catch{return raw}
 }
 function rememberPending(path,token,body){
  const match=path.match(chatMessagesPath);if(!match)return;
  try{
   const d=JSON.parse(body||'{}');if(!d.id||!d.body)return;
   const user=JSON.parse(bridge.read('/me',token)||'{}').user||{};
   const pending=pendingChats();if(pending.some(m=>m.id===d.id))return;
   pending.push({id:d.id,cid:match[1],body:d.body,author_id:user.id||'own',author:'Envio pendente',created_at:Date.now(),kind:'text',pendingSync:true});savePending(pending);
  }catch{}
 }

 let online=navigator.onLine?null:false;
 function badge(){
  let b=document.getElementById('rp-android-connectivity');
  if(!b){b=document.createElement('output');b.id='rp-android-connectivity';b.setAttribute('role','status');b.style.cssText='position:fixed;top:max(8px,env(safe-area-inset-top));right:12px;z-index:99999;padding:7px 11px;border-radius:999px;background:#111a20e8;color:#f2f5f7;font:600 12px system-ui;box-shadow:0 5px 18px #0005;pointer-events:none';document.body.append(b);}
  let pending=0;try{pending=bridge.pending()}catch{}
  b.textContent=(online===null?'Conectando':online?'Conectado':'Offline')+(pending?' · '+pending+' pendente(s)':'');b.style.background=online?'#122a2899':'#7d3b16ee';
 }
 async function jsonRequest(input,options={}){
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  const method=String(options.method||'GET').toUpperCase();
  if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return originalFetch(input,options);
  const path=url.pathname.slice('/api'.length)+url.search;
  const headers=new Headers(options.headers||{});
  const token=(headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
  try{
   if(!navigator.onLine)throw new TypeError('offline');
   const response=await originalFetch(input,options);
   let liveResponse=response;
   if(response.ok&&method==='GET'){
    try{
     const raw=await response.clone().text();bridge.cache(path,token,raw);
     if(chatMessagesPath.test(path))liveResponse=new Response(mergeChat(path,raw),{status:response.status,headers:{'Content-Type':'application/json'}});
    }catch{}
   }
   online=true;badge();try{bridge.flush();}catch{}
   return liveResponse;
  }catch(error){
   if(error.name==='AbortError')throw error;
   online=false;badge();
   if(method==='GET'){
    let saved='';try{saved=bridge.read(path,token);}catch{}
    if(saved)return new Response(mergeChat(path,saved),{status:200,headers:{'Content-Type':'application/json','X-Ronda-Offline':'cache'}});
    return new Response(JSON.stringify({error:'Sem conexão e sem dados locais para esta tela.'}),{status:503,headers:{'Content-Type':'application/json'}});
   }
   let receipt='';try{receipt=bridge.queue(method,path,token,typeof options.body==='string'?options.body:'');}catch{}
   let json;try{json=JSON.parse(receipt);}catch{json={error:'Falha ao guardar operação offline.'};}
   if(json.error)return new Response(JSON.stringify(json),{status:503,headers:{'Content-Type':'application/json'}});
   rememberPending(path,token,typeof options.body==='string'?options.body:'');
   badge();return new Response(receipt,{status:202,headers:{'Content-Type':'application/json','X-Ronda-Offline':'outbox'}});
  }
 }
 window.fetch=jsonRequest;
 window.addEventListener('online',()=>{online=true;try{bridge.flush();}catch{}badge();});
 window.addEventListener('offline',()=>{online=false;badge();});
 window.addEventListener('rondapro:native-location',event=>{const item=event.detail;window.__rondaNativeFix=item;});
 window.addEventListener('rondapro:native-heading',event=>{window.__rondaNativeHeading=event.detail?.heading;});
 document.addEventListener('DOMContentLoaded',()=>{badge();});
})();
