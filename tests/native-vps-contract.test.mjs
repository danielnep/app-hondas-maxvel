import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../android/app/src/main/java/br/com/horizon/maxvel/',import.meta.url);
const activity=readFileSync(new URL('MainActivity.java',root),'utf8');
const service=readFileSync(new URL('PatrolLocationService.java',root),'utf8');
const store=readFileSync(new URL('TraceStore.java',root),'utf8');

test('ronda Android nativa usa mapa, orientação do dispositivo e ruas reais',()=>{
 assert.match(activity,/new MapView\(this\)/);
 assert.match(activity,/Sensor\.TYPE_ROTATION_VECTOR/);
 assert.match(activity,/GeomagneticField/);
 assert.match(activity,/CameraPosition\.Builder\(\)/);
 assert.match(activity,/routed-car\/route\/v1\/driving/);
 assert.match(activity,/geometries=geojson/);
 assert.doesNotMatch(activity,/new WebView\(/);
});

test('presença do agente é mantida para COI atribuir rondas',()=>{
 assert.match(activity,/\/api\/presence/);
 assert.match(activity,/announcePresence\(\);loadDispatches\(false\)/);
 assert.match(activity,/announcePresence\(\);\s*handler\.removeCallbacks/);
 assert.match(activity,/\/api\/dispatches/);
});

test('localização persistente envia GPS e mantém fila local durante queda de rede',()=>{
 assert.match(service,/startForeground\(NOTIFICATION_ID,notice/);
 assert.match(service,/setOngoing\(true\)/);
 assert.match(service,/START_STICKY/);
 assert.match(service,/\/api\/events/);
 assert.match(service,/database\.enqueue/);
 assert.match(store,/CREATE TABLE IF NOT EXISTS gps_outbox/);
 assert.match(store,/markSent/);
});

test('check-in verifica raio e permanência antes de registrar ponto',()=>{
 assert.match(activity,/getAccuracy\(\)>35/);
 assert.match(activity,/distance\[0\]>35/);
 assert.match(activity,/dwell<30000/);
 assert.match(activity,/\"checkpoint\"/);
});
