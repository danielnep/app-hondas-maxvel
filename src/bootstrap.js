// Entrypoint unico: dados reais com servidor; previa isolada em hospedagem estatica.
const root=document.getElementById('app');
async function getRuntime(){
 const c=new AbortController(),t=setTimeout(()=>c.abort(),2400);
 try{const r=await fetch('./api/runtime',{signal:c.signal,cache:'no-store'});
  return r.ok?await r.json():{operational:false};
 }catch{return {operational:false}}finally{clearTimeout(t)}
}
async function loadOperational(){
 document.documentElement.dataset.runtime='operational';
 document.body.classList.add('rp-theme','rp-operational-app');
 const style=document.createElement('link');
 style.rel='stylesheet';style.href='./assets/central.css?v=51';
 document.head.insertBefore(style,document.querySelector('link[href*="ronda-pro.css"]'));
 root.innerHTML='<header class="top"><div class="brand"><img src="./assets/maxvel-icon.svg" alt="Maxvel" width="36" height="36"><span><b>Ronda Pro</b><small>OPERAÇÃO</small></span></div><div class="top-actions"><span id="current-role"></span><button id="exit" hidden>Sair</button></div></header><main id="conteudo"><div id="central-root" aria-live="polite"><p>Preparando a operação…</p></div></main><div id="notice" role="status" aria-live="polite"></div>';
 await new Promise(resolve=>{if(window.L){resolve();return;}
  const s=document.createElement('script');s.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  s.onload=resolve;s.onerror=resolve;document.head.append(s)});
 await import('./central.js?v=51');
}
async function start(){
 if((await getRuntime()).operational===true)await loadOperational();
 else{
  document.documentElement.dataset.runtime='preview';
  await import('./app.js?v=63');
  await import('./inspection-demo-camera.js?v=1');
  await import('./soft-polish.js?v=1');
 }
}
start().catch(error=>{console.error('Inicializacao:',error);
 root.innerHTML='<div class="boot"><img src="./assets/maxvel-logo.webp" alt="Maxvel" width="160"><strong>Não foi possível iniciar.</strong><p>Atualize a página ou contate a administração.</p></div>';});
