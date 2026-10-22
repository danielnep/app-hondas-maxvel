import {readStyles} from './helpers/styles.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const styles=readStyles('maxvel-premium-system-20261014');
const manifest=readFileSync(new URL('../android/app/src/main/AndroidManifest.xml',import.meta.url),'utf8');
const service=readFileSync(new URL('../android/app/src/main/java/br/com/horizon/maxvel/PatrolLocationService.java',import.meta.url),'utf8');
const activity=readFileSync(new URL('../android/app/src/main/java/br/com/horizon/maxvel/MainActivity.java',import.meta.url),'utf8');
const web=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');

function luminance(hex){
 let [r,g,b]=hex.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255);
 return [.2126,.7152,.0722].reduce((n,k,i)=>n+k*([r,g,b][i]<=.04045?[r,g,b][i]/12.92:(([r,g,b][i]+.055)/1.055)**2.4),0);
}
function ratio(a,b){const l=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (l[0]+.05)/(l[1]+.05);}

test('cores primárias usadas no tema têm pelo menos contraste AA para texto comum',()=>{
 const tokens=Object.fromEntries([...styles.matchAll(/--mxp-([a-z-]+):#([0-9a-f]{6})/gi)].map(m=>[m[1],m[2]]));
 for(const [fg,bg] of [['ink','canvas'],['muted','panel']])assert.ok(ratio(tokens[fg],tokens[bg])>=4.5,fg+'/'+bg);

});

test('aplicativo Android declara rastreamento transparente com encerramento visível',()=>{
 assert.match(manifest,/FOREGROUND_SERVICE_LOCATION/);
 assert.match(manifest,/android:foregroundServiceType="location"/);
 assert.ok(existsSync(new URL('../android/app/src/main/res/drawable/ic_maxvel.xml',import.meta.url)),'ícone deve estar em res/drawable');
 assert.match(manifest,/android:allowBackup="false"/);
 assert.match(manifest,/android:usesCleartextTraffic="false"/);
 assert.match(service,/setOngoing\(true\)/);
 assert.match(service,/Parar acompanhamento/);
 assert.match(service,/stopForeground\(STOP_FOREGROUND_REMOVE\)/);
 assert.match(service,/START_NOT_STICKY/);
 assert.match(service,/onDestroy/);
});

test('APK Android liga GPS nativo a uma ronda autenticada e abre Glass UI embarcada',()=>{
 assert.match(web,/mode==='real'&&!presentation/);
 assert.match(web,/AndroidTracking\?\.startTracking\(session\.id\)/);
 assert.match(web,/AndroidTracking\?\.stopTracking\(\)/);
 assert.match(activity,/new WebView\(this\)/);
 assert.match(activity,/startForegroundService\(intent\)/);
 assert.match(activity,/getAssets\(\)\.open\(local\)/);
 assert.match(activity,/NativeApi\.token/);
});
