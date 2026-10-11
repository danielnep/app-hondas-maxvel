import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const styles=readFileSync(new URL('../assets/horizon-operacional.css',import.meta.url),'utf8');
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
 for(const [fg,bg] of [['FFFFFF','0D61C3'],['E8F3FC','0B1D30'],['E8F3FC','102A42'],['0D2B45','F7FBFF']])assert.ok(ratio(fg,bg)>=4.5,fg+'/'+bg+' = '+ratio(fg,bg).toFixed(2));
 assert.match(styles,/#0D61C3/i);
 assert.match(styles,/#0B1D30/i);
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

test('ponte nativa só inicia serviço ao acionar a ronda real',()=>{
 assert.match(web,/mode==='real'&&!presentation/);
 assert.match(web,/if\(presentation&&act==='mode-real'\)/);
 assert.match(web,/AndroidTracking\?\.startTracking\(\)/);
 assert.match(web,/AndroidTracking\?\.stopTracking\(\)/);
 assert.match(web,/O navegador não acompanha sua posição depois de fechado/);
 assert.match(activity,/appassets\.androidplatform\.net/);
 assert.match(activity,/setAllowFileAccess\(false\)/);
 assert.match(activity,/setAllowContentAccess\(false\)/);
});
