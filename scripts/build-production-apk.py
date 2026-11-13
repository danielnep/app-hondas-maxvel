#!/usr/bin/env python3
"""Build Android operacional com SDK local e assinatura persistente do proprietário."""
from pathlib import Path
import os,subprocess,zipfile,hashlib,re
R=Path(__file__).resolve().parents[1]
gradle=(R/'android/app/build.gradle').read_text()
package=re.search(r"applicationId\s+'([^']+)'",gradle).group(1)
version_code=re.search(r"versionCode\s+(\d+)",gradle).group(1)
version_name=re.search(r"versionName\s+'([^']+)'",gradle).group(1)
release=version_name.replace('-production','').replace('-beta','')
assert package in ['br.com.horizon.maxvel.production','com.horizon.rondapro'] and re.fullmatch(r'\d+\.\d+\.\d+-(production|beta)',version_name),'Identidade de release inválida'
W=Path(os.environ.get('RONDA_BUILD_DIR','/opt/ronda-pro-build-'+release));W.mkdir(parents=True,exist_ok=True)
SDK=Path(os.environ.get('ANDROID_SDK_ROOT','/opt/horizon-mobile-app/android-sdk'))
T=SDK/'build-tools/36.0.0';A=SDK/'platforms/android-36/android.jar'
KEY=Path('/opt/horizon-mobile-app/signing/horizon-pc-release.p12');PASS=KEY.parent/'storepass'
assert KEY.is_file() and PASS.is_file(),'Assinatura persistente ausente'
def run(*args):subprocess.run([str(a) for a in args],check=True)
manifest=(R/'android/app/src/main/AndroidManifest.xml').read_text()
manifest=manifest.replace('<manifest ',f'<manifest package="{package}" android:versionCode="{version_code}" android:versionName="{version_name}" ',1)
manifest=manifest.replace('<application ','<uses-sdk android:minSdkVersion="26" android:targetSdkVersion="36"/><application ',1)
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
   if not p.is_file() or p.suffix in ['.map', '.apk', '.bak'] or 'downloads' in p.parts:continue
   rel=p.relative_to(R).as_posix();data=(R/'src/production-api-mode.js').read_bytes() if rel=='src/pages-test-api.js' else p.read_bytes()
   z.writestr('assets/app/'+rel,data,compress_type=zipfile.ZIP_DEFLATED)
 for name in ['index.html','central.html','manifest.webmanifest']:
  data=(R/name).read_text()
  if name.endswith('.html'):
   data=data.replace('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','./assets/vendor/leaflet/leaflet.css').replace('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','./assets/vendor/leaflet/leaflet.js')
   data=data.replace('</head>','<script src="./src/native-boot.js"></script></head>')
   data=data.replace('if("serviceWorker" in navigator&&location.protocol==="https:"','if(!window.__RONDA_ANDROID_BUNDLE__&&"serviceWorker" in navigator&&location.protocol==="https:"')
  z.writestr('assets/app/'+name,data,compress_type=zipfile.ZIP_DEFLATED)
run(T/'zipalign','-f','4',u,W/'aligned.apk')
out=W/('Ronda-Pro-'+release+('-Beta' if version_name.endswith('-beta') else '-Operacional')+'.apk')
run(T/'apksigner','sign','--ks',KEY,'--ks-key-alias','horizonpc','--ks-pass','file:'+str(PASS),'--out',out,W/'aligned.apk')
run(T/'apksigner','verify','--verbose','--print-certs',out)
import shutil
target_rel=R/'artifacts/releases'/out.name
target_rel.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(out,target_rel)
target_down=R/'assets/downloads'
target_down.mkdir(parents=True,exist_ok=True)
shutil.copy2(out,target_down/out.name)
shutil.copy2(out,target_down/'ronda-pro.apk')
shutil.copy2(out,R/'assets/ronda-pro.apk')
print('APK',out,'BYTES',out.stat().st_size,'SHA256',hashlib.sha256(out.read_bytes()).hexdigest())
print('SYNCHRONIZED_TO:',target_rel,target_down/out.name,target_down/'ronda-pro.apk',R/'assets/ronda-pro.apk')
