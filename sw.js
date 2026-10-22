/* Cache da interface operacional autenticada do Ronda Pro. Não tenta baixar tiles
 * de OpenStreetMap em massa. O mapa esquemático é gerado localmente no app.
 */
const CACHE='rondas-pro-interface-v74';
const CORE=['./assets/theme.css','./src/theme-shell.js','./assets/ronda-pro.css','./assets/central.css','./assets/operational.css','./assets/mobile-critical.css','./assets/field.css','./src/field-inspection-wizard.js','./src/inspection-demo-camera.js','./src/inspection-queue.js','./src/inspection-cockpit.js','./src/inspection-street-route.js','./src/inspection-route-map.js','./src/internal-chat-ui.js','./src/internal-chat-calls.js','./src/activity-history-ui.js',
 './','./index.html','./manifest.webmanifest',

 './assets/maxvel-logo.webp',
 './src/app.js','./src/saved-points-admin.js','./src/geo-tools.js','./src/settings-manager.js','./src/dispatch-wizard.js','./src/route-schedule.js','./src/route-planner.js','./src/route-demo-mode.js','./src/live-client.js','./src/pages-test-api.js','./src/field-torch.js','./src/location-entry-gate.js','./src/media-capture.js','./src/mobile-role-guides.js','./src/soft-polish.js','./src/operations-upgrade.js','./src/install.js','./src/field-intelligence.js','./src/report-xlsx.js','./src/checkpoint-curtain.js','./src/central.js','./src/coi-monitor.js','./src/treatment-policy.js','./src/ops-center-ui.js','./central.html',
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
