#!/usr/bin/env python3
"""Build Android operacional com SDK local e assinatura persistente do proprietário."""
from pathlib import Path
import os,subprocess,zipfile,hashlib
R=Path(__file__).resolve().parents[1]
W=Path(os.environ.get('RONDA_BUILD_DIR','/opt/ronda-pro-build-2.2.3'));W.mkdir(parents=True,exist_ok=True)
SDK=Path(os.environ.get('ANDROID_SDK_ROOT','/opt/horizon-mobile-app/android-sdk'))
T=SDK/'build-tools/35.0.0';A=SDK/'platforms/android-35/android.jar'
KEY=Path('/opt/horizon-mobile-app/signing/horizon-pc-release.p12');PASS=KEY.parent/'storepass'
assert KEY.is_file() and PASS.is_file(),'Assinatura persistente ausente'
def run(*args):subprocess.run([str(a) for a in args],check=True)
manifest=(R/'android/app/src/main/AndroidManifest.xml').read_text()
manifest=manifest.replace('<manifest ','<manifest package="br.com.horizon.maxvel.production" android:versionCode="17" android:versionName="2.2.3-production" ',1)
manifest=manifest.replace('<application ','<uses-sdk android:minSdkVersion="26" android:targetSdkVersion="35"/><application ',1)
for name in ['MainActivity','PatrolLocationService']:manifest=manifest.replace('android:name=".'+name+'"','android:name="br.com.horizon.maxvel.'+name+'"')
(W/'AndroidManifest.xml').write_text(manifest)
run(T/'aapt2','compile','--dir',R/'android/app/src/main/res','-o',W/'resources.zip')
generated=W/'generated';generated.mkdir(exist_ok=True)
u=W/'unsigned.apk'
run(T/'aapt2','link','-o',u,'--manifest',W/'AndroidManifest.xml','-I',A,'--auto-add-overlay','-R',W/'resources.zip','--java',generated,'--custom-package','br.com.horizon.maxvel')
classes=W/'classes';classes.mkdir(exist_ok=True)
run('javac','-source','17','-target','17','-encoding','UTF-8','-classpath',A,'-d',classes,*list((R/'android/app/src/main/java').rglob('*.java')),*list(generated.rglob('*.java')))
dex=W/'dex';dex.mkdir(exist_ok=True)
run(T/'d8','--lib',A,'--min-api','26','--output',dex,*list(classes.rglob('*.class')))
with zipfile.ZipFile(u,'a') as z:
 for f in dex.glob('*.dex'):z.write(f,f.name,compress_type=zipfile.ZIP_STORED)
 for directory in ['assets','src']:
  for p in (R/directory).rglob('*'):
   if not p.is_file() or p.suffix=='.map':continue
   rel=p.relative_to(R).as_posix();data=p.read_bytes()
   if rel=='src/pages-test-api.js':data=(R/'src/production-api-mode.js').read_bytes()
   z.writestr('assets/app/'+rel,data,compress_type=zipfile.ZIP_DEFLATED)
 for name in ['index.html','central.html','manifest.webmanifest']:
  data=(R/name).read_text()
  if name.endswith('.html'):
   data=data.replace('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','./assets/vendor/leaflet/leaflet.css').replace('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','./assets/vendor/leaflet/leaflet.js')
   data=data.replace('</head>','<script src="./src/native-boot.js"></script></head>')
   data=data.replace('if("serviceWorker" in navigator&&location.protocol==="https:"','if(!window.__RONDA_ANDROID_BUNDLE__&&"serviceWorker" in navigator&&location.protocol==="https:"')
  z.writestr('assets/app/'+name,data,compress_type=zipfile.ZIP_DEFLATED)
run(T/'zipalign','-f','4',u,W/'aligned.apk')
out=W/'Ronda-Pro-2.2.3-Operacional.apk'
run(T/'apksigner','sign','--ks',KEY,'--ks-key-alias','horizonpc','--ks-pass','file:'+str(PASS),'--out',out,W/'aligned.apk')
run(T/'apksigner','verify','--verbose','--print-certs',out)
print('APK',out,'BYTES',out.stat().st_size,'SHA256',hashlib.sha256(out.read_bytes()).hexdigest())
