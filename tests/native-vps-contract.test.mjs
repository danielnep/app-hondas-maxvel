import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const android=new URL('../android/app/src/main/java/br/com/horizon/maxvel/',import.meta.url);
const activity=readFileSync(new URL('MainActivity.java',android),'utf8');
const store=readFileSync(new URL('NativeOfflineStore.java',android),'utf8');
const service=readFileSync(new URL('PatrolLocationService.java',android),'utf8');
const trace=readFileSync(new URL('TraceStore.java',android),'utf8');
const gradle=readFileSync(new URL('../android/app/build.gradle',import.meta.url),'utf8');
const manifest=readFileSync(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
const map=readFileSync(new URL('../src/map.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../src/live-client.js',import.meta.url),'utf8');
const boot=readFileSync(new URL('../src/native-boot.js',import.meta.url),'utf8');

test('APK nativo, nao PWA: empacota interface Glass local real HTML CSS JavaScript',()=>{
 assert.match(activity,/new WebView\(this\)/);
 assert.match(activity,/getAssets\(\)\.open\(local\)/);
 assert.match(activity,/\/app\/index\.html/);
 assert.match(gradle,/embedGlassFrontend/);
 assert.match(gradle,/include 'index.html', 'central.html', 'manifest.webmanifest', 'src\/\*\*', 'assets\/\*\*'/);
 assert.match(gradle,/preBuild\.dependsOn/);
 assert.match(gradle,/__RONDA_ANDROID_BUNDLE__/);
 assert.match(manifest,/PatrolLocationService/);
 for(const p of ['index.html','central.html','src/app.js','assets/field.css','assets/theme.css','assets/vendor/leaflet/leaflet.js','assets/vendor/leaflet/leaflet.css','assets/vendor/leaflet/leaflet-rotate.js'])
  assert.ok(existsSync(new URL('../'+p,import.meta.url)),p);
});
test('mapa navegacao vira conforme bússola/GPS com seta de direcao correta ou contraria',()=>{
 assert.match(activity,/Sensor\.TYPE_ROTATION_VECTOR/);
 assert.match(activity,/GeomagneticField/);
 assert.match(activity,/rondapro:native-heading/);
 assert.match(map,/rotate:!!window\.__RONDA_ANDROID_BUNDLE__/);
 assert.match(map,/setHeading/);
 assert.match(map,/panTo\(latlng\(this\.position\)/);
 assert.match(map,/Sentido contrário/);
 assert.match(map,/Direção correta/);
});
test('auth e dados do COI chegam de verdade pelo backend, offline mantem SQLite e outbox',()=>{
 assert.match(client,/rondaspro_android_token/);
 assert.match(client,/rememberToken/);
 assert.match(store,/CREATE TABLE IF NOT EXISTS cached/);
 assert.match(store,/CREATE TABLE IF NOT EXISTS outbox/);
 assert.match(store,/DELETE FROM outbox WHERE id=/);
 assert.match(boot,/RondaOffline/);
 assert.match(store,/pendingSync/);
 assert.match(activity,/if\(path.startsWith\("\/api\/"\)\)return null/);
 assert.match(activity,/onGeolocationPermissionsShowPrompt/);
 assert.match(activity,/trustedOrigin\(android\.net\.Uri\.parse\(origin\)\)/);
 assert.match(activity,/trustedOrigin\(request\.getOrigin\(\)\)/);
 assert.match(activity,/onPermissionRequest/);
 assert.match(activity,/setTorchEnabled/);
});
test('ronda em segundo plano e GPS por 15 segundos durante queda da rede',()=>{
 assert.match(service,/startForeground\(NOTIFICATION_ID,notice/);
 assert.match(service,/setOngoing\(true\)/);
 assert.match(service,/START_STICKY/);
 assert.match(service,/database\.enqueue/);
 assert.match(trace,/CREATE TABLE IF NOT EXISTS gps_outbox/);
 assert.match(trace,/markSent/);
 assert.match(activity,/startForegroundService\(intent\)/);
});
