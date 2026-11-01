#!/usr/bin/env python3
"""Windows and roles rendered from the final APK with an isolated QA database."""
import os,json,socket,subprocess,time,secrets,zipfile,mimetypes,tempfile,shutil
from pathlib import Path
from urllib.parse import urlparse,unquote
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'artifacts/android-parity/windows';OUT.mkdir(parents=True,exist_ok=True)
temp=Path(tempfile.mkdtemp(prefix='ronda-window-theme-'));bundle=temp/'app';bundle.mkdir()
with zipfile.ZipFile('/opt/ronda-pro-build-2.2.4/Ronda-Pro-2.2.4-Operacional.apk') as z:
 for name in z.namelist():
  if name.startswith('assets/app/') and not name.endswith('/'):
   f=bundle/name[11:];f.parent.mkdir(parents=True,exist_ok=True);f.write_bytes(z.read(name))
password=secrets.token_hex(18)+'@Aa1'
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
env={**os.environ,'PORT':str(port),'RONDA_PRO_DB_PATH':str(temp/'test.sqlite'),'RONDA_PRO_MASTER_EMAIL':'master@qa.invalid','RONDA_PRO_MASTER_PASSWORD':password,'RONDA_PRO_INITIAL_ACCOUNTS':json.dumps([{'role':r,'name':r+' QA','email':r+'@qa.invalid','username':r,'password':password} for r in ['ronda','admin','coi']])}
log=(OUT/'server.log').open('w');server=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=log,stderr=log);base='http://127.0.0.1:'+str(port);results=[]
def style(page):
 return page.locator('#dialog').evaluate("""el=>{const c=getComputedStyle(el),r=el.getBoundingClientRect();return {background:c.backgroundImage,color:c.color,border:c.borderColor,radius:c.borderRadius,font:c.fontFamily,opacity:c.opacity,translate:c.translate,width:r.width,height:r.height,x:r.x,y:r.y,viewport:{w:innerWidth,h:innerHeight},overflow:el.scrollHeight>el.clientHeight}}""")
try:
 for _ in range(100):
  try:urlopen(base+'/api/health',timeout=.3);break
  except Exception:time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/opt/horizon-work-runtime/browsers/chromium-1248/chrome-linux64/chrome',args=['--no-sandbox','--disable-dev-shm-usage'])
  for role in ['ronda','admin','coi','master']:
   context=browser.new_context(viewport={'width':393,'height':820},is_mobile=True,has_touch=True,service_workers='block',permissions=['geolocation'],geolocation={'latitude':-20.145,'longitude':-44.891,'accuracy':8})
   context.add_init_script("window.RondaOffline={pending:()=>0,cache:()=>{},read:()=>'',flush:()=>{}};window.AndroidTracking={rememberToken:()=>{},forgetToken:()=>{},startShift:()=>{}};")
   page=context.new_page();page.set_default_timeout(10000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   def serve(route):
    path=unquote(urlparse(route.request.url).path)
    if path.startswith('/api/'):return route.continue_()
    rel=path[5:] if path.startswith('/app/') else path.lstrip('/');f=bundle/rel
    if '..' not in rel and f.is_file():return route.fulfill(path=str(f),content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
    return route.continue_()
   page.route(base+'/**',serve);page.goto(base+'/app/index.html',wait_until='domcontentloaded')
   page.locator('#live-login-form [name=identifier]').fill('master@qa.invalid' if role=='master' else role);page.locator('#live-login-form [name=password]').fill(password);page.locator('#live-login-form button').click();page.locator('.dashboard').wait_for(timeout=15000)
   page.locator('.location-entry-gate').wait_for(state='hidden',timeout=15000)
   cases=[('profile','.user-profile-button'),('menu','[data-action="open-mobile-menu"]:visible')]
   if role=='ronda':cases=[('panic','[data-ops="panic-confirm"]'),('map-help','[data-topic="map"]:visible'),*cases,('alert','[data-ops="central-alert"]'),('incident','[data-ops="incident-quick"]')]
   for name,selector in cases:
    target=page.locator(selector).first
    if name in ['alert','incident']:
     target.wait_for(state='visible');box=target.bounding_box()
     assert box and 0<=box['y']+box['height']/2<=820,('action outside viewport',name,box)
     page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
    else:target.click()
    page.locator('#dialog[open]').wait_for();page.locator('#dialog').evaluate("async el=>{await Promise.all(el.getAnimations().filter(a=>a.effect?.getTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))}")
    data=style(page);data.update(role=role,case=name)
    assert 'linear-gradient' in data['background'],data
    assert 'Inter' in data['font'],data
    assert data['x']>=-1 and data['x']+data['width']<=394,data
    assert data['y']>=-1 and data['y']+data['height']<=821,data
    if name!='menu':assert data['radius']=='16px',data
    assert page.locator('#dialog').inner_text().strip(),data
    page.screenshot(path=str(OUT/(role+'-'+name+'.png')))
    close=page.locator('#dialog .rp-drawer-handle') if name=='menu' else page.locator('#dialog .dialog-close')
    close.first.click();page.locator('#dialog[open]').wait_for(state='hidden');results.append(data)
   assert not errors,errors
   context.close()
  browser.close()
 (OUT/'results.json').write_text(json.dumps({'passed':True,'cases':results,'physicalAndroidTested':False,'productionDataChanged':False},ensure_ascii=False,indent=2))
 print(json.dumps({'passed':True,'roles':4,'windows':len(results)}))
finally:
 server.terminate()
 try:server.wait(timeout=8)
 except subprocess.TimeoutExpired:server.kill();server.wait()
 log.close();shutil.rmtree(temp,ignore_errors=True)
