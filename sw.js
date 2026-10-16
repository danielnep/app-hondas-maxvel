/* Cache da interface para a demonstração Web/PWA. Não tenta baixar tiles
 * de OpenStreetMap em massa. O mapa esquemático é gerado localmente no app.
 */
const CACHE='rondas-pro-interface-v46';
const CORE=['./assets/field-unified-20261016.css','./src/field-inspection-wizard.js','./assets/inspector-cockpit-20261016.css','./src/inspection-queue.js','./src/inspection-cockpit.js','./src/inspection-street-route.js','./assets/maxvel-print-qa-20261016.css','./src/inspection-route-map.js','./assets/maxvel-field-refinement-20261016.css','./assets/maxvel-atelier-20261016.css','./assets/mobile-critical-20261016.css','./assets/field-compact.css','./assets/events-chat-history.css','./src/internal-chat-ui.js','./src/internal-chat-calls.js','./src/activity-history-ui.js','./assets/uiux-refinement.css',
 './','./index.html','./manifest.webmanifest',
 './assets/ronda-pro.css','./assets/maxvel-premium-system-20261014.css','./assets/rondas-pro-flow-20261014.css','./assets/maxvel-visual-2026.css','./assets/field-entry-v2.css','./assets/evidence-direct.css','./assets/demo-roles.css','./assets/ronda-pro-upgrade.css','./assets/soft-polish.css',
 './assets/maxvel-logo.webp',
 './src/app.js','./src/field-torch.js','./src/location-entry-gate.js','./src/media-capture.js','./src/mobile-role-guides.js','./src/soft-polish.js','./src/operations-upgrade.js','./src/install.js','./src/field-intelligence.js','./src/report-xlsx.js','./src/checkpoint-curtain.js','./src/central.js','./src/coi-monitor.js','./src/treatment-policy.js','./src/ops-center-ui.js','./central.html','./assets/central.css','./assets/ops-center.css','./assets/coi-operations-v3.css','./assets/checkpoint-curtain.css',
 './src/domain.js','./src/map.js','./src/wizard.js',
 './src/demo-scenarios.js','./src/dashboard-insights.js',
 './src/dialog-pagination.js','./src/evidence.js',
 './src/simulation.js','./src/storage.js','./src/consent.js',
 './src/tutorial.js','./src/ui-motion.js',
 './src/scheduling.js','./src/experience.js',
 './src/scenarios.js','./src/viewport.js'
];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(
  CORE.map(url=>cache.add(new Request(url,{cache:'reload'})))
 )).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('rondas-pro-interface-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const u=new URL(request.url);
 if(u.origin!==self.location.origin)return;
 const allowed=/\.(?:js|css|html|webp|svg|png|jpg|jpeg|webmanifest)$/.test(u.pathname)||u.pathname===new URL('./',self.registration.scope).pathname;
 if(!allowed)return;
 // Navegações usam primeiro a versão publicada; offline mantém a última página disponível.
 if(request.mode==='navigate'){
  event.respondWith(fetch(request).then(response=>{
   if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});}
   return response;
  }).catch(async()=>await caches.match(request,{ignoreSearch:true})||await caches.match('./index.html')));
  return;
 }
 // Scripts e estilos: rede primeiro, para não servir um menu antigo após o deploy.
 // O cache só entra quando o dispositivo estiver realmente sem conexão.
 event.respondWith(fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{}));}
  return response;
 }).catch(async()=>{
  const exact=await caches.match(request);
  if(exact)return exact;
  const fallback=await caches.match(request,{ignoreSearch:true});
  return fallback||Response.error();
 }));
});
