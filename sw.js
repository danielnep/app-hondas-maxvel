/* Cache da interface para a demonstração Web/PWA. Não tenta baixar tiles
 * de OpenStreetMap em massa. O mapa esquemático é gerado localmente no app.
 */
const CACHE='rondas-pro-interface-v10';
const CORE=[
 './','./index.html','./manifest.webmanifest',
 './assets/ronda-pro.css','./assets/ronda-pro-upgrade.css','./assets/soft-polish.css',
 './assets/maxvel-logo.webp',
 './src/app.js','./src/mobile-role-guides.js','./src/soft-polish.js','./src/operations-upgrade.js','./src/install.js','./src/field-intelligence.js','./src/report-xlsx.js','./src/checkpoint-curtain.js','./src/central.js','./central.html','./assets/central.css','./assets/checkpoint-curtain.css',
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
 event.respondWith(caches.match(request,{ignoreSearch:true}).then(hit=>hit||fetch(request).then(response=>{
  if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy)).catch(()=>{});}
  return response;
 })).catch(()=>caches.match('./index.html')));
});
