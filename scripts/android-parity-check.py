#!/usr/bin/env python3
"""HTML/APK parity and regressions with isolated accounts and simulated QA GPS.
No emulator, physical Android, production credentials or production data."""
import os,json,socket,subprocess,time,secrets,zipfile,mimetypes,tempfile,shutil
from pathlib import Path
from urllib.parse import urlparse,unquote
from urllib.request import urlopen
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'artifacts/android-parity';OUT.mkdir(parents=True,exist_ok=True)
APK=Path(os.environ.get('RP_QA_APK','/opt/ronda-pro-build-2.2.4/Ronda-Pro-2.2.4-Operacional.apk'))
OLD=Path('/opt/ronda-pro-build-2.2.3/Ronda-Pro-2.2.3-Operacional.apk')
temp=Path(tempfile.mkdtemp(prefix='ronda-android-parity-'))
def extract(apk,directory):
 directory.mkdir()
 with zipfile.ZipFile(apk) as z:
  for n in z.namelist():
   if n.startswith('assets/app/') and not n.endswith('/'):
    p=directory/n[11:];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(z.read(n))
 return directory
bundles={'before':extract(OLD,temp/'before'),'html':ROOT,'apk':extract(APK,temp/'apk')}
password=secrets.token_hex(18)+'@Aa1'
with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
env={**os.environ,'PORT':str(port),'RONDA_PRO_DB_PATH':str(temp/'isolated.sqlite'),'RONDA_PRO_MASTER_EMAIL':'master@qa.invalid','RONDA_PRO_MASTER_PASSWORD':password,'RONDA_PRO_INITIAL_ACCOUNTS':json.dumps([{'role':r,'name':n,'email':r+'@qa.invalid','username':r,'password':password} for r,n in [('ronda','Agente de Ronda'),('admin','Administrador Maxvel'),('coi','Operador COI')]])}
log=(OUT/'parity-server.log').open('w')
server=subprocess.Popen(['node','server.js'],cwd=ROOT,env=env,stdout=log,stderr=log)
base='http://127.0.0.1:'+str(port);results=[]
def metrics(page):
 return page.evaluate("""() => {
 const b=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,font:c.fontSize,family:c.fontFamily,display:c.display};};
 return {width:innerWidth,height:innerHeight,scale:visualViewport.scale,overflow:document.documentElement.scrollWidth-innerWidth,header:b('.app-header'),menu:b('.app-menu-button'),profile:b('.user-profile-button'),brand:b('.app-header>.brand'),overlay:b('.rp-field-page-overlay'),chat:b('#rp-demo-chat-overlay'),input:b('#demo-chat-body')};
 }""")
def nav(page,key):
 page.locator('[data-action="open-mobile-menu"]:visible').click()
 page.locator('[data-view="'+key+'"]:visible').first.click()
 page.locator('.rp-field-page-overlay').wait_for()
def snapshot(page,name,width):page.screenshot(path=str(OUT/(name+'-'+str(width)+'.png')))
def close_enough(a,b,path=''):
 if isinstance(a,dict):
  assert a.keys()==b.keys(),path
  for key in a:close_enough(a[key],b[key],path+'/'+key)
 elif isinstance(a,(float,int)):
  assert abs(a-b)<1.0,(path,a,b)
 else:assert a==b,(path,a,b)
try:
 for _ in range(100):
  try:urlopen(base+'/api/health',timeout=.3);break
  except Exception:
   if server.poll() is not None:raise RuntimeError('Servidor de QA encerrou')
   time.sleep(.1)
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path=os.environ.get('RP_CHROME_BIN','/opt/horizon-work-runtime/browsers/chromium-1248/chrome-linux64/chrome'),args=['--no-sandbox','--disable-dev-shm-usage'])
  for variant,folder in bundles.items():
   sizes=[(393,820)] if variant=='before' else [(360,740),(393,820),(412,844),(873,345)]
   for width,height in sizes:
    context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True,device_scale_factor=1,service_workers='block',locale='pt-BR',permissions=['geolocation'],geolocation={'latitude':-20.145,'longitude':-44.891,'accuracy':8})
    context.add_init_script("window.RondaOffline={pending:()=>0,cache:()=>{},read:()=>'',flush:()=>{}};window.AndroidTracking={rememberToken:()=>{},forgetToken:()=>{},startShift:()=>{}};")
    page=context.new_page();page.set_default_timeout(12000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    def serve(route):
     path=unquote(urlparse(route.request.url).path)
     if path.startswith('/api/'):return route.continue_()
     rel=path[5:] if path.startswith('/app/') else path.lstrip('/');f=folder/rel
     if '..' not in rel and f.is_file():return route.fulfill(path=str(f),content_type=mimetypes.guess_type(f)[0] or 'application/octet-stream')
     route.continue_()
    page.route(base+'/**',serve)
    page.goto(base+'/app/index.html',wait_until='domcontentloaded')
    page.locator('#live-login-form [name=identifier]').fill('ronda')
    page.locator('#live-login-form [name=password]').fill(password)
    page.locator('#live-login-form button').click()
    page.locator('.dashboard').wait_for(timeout=20000)
    page.locator('.location-entry-gate').wait_for(state='hidden',timeout=15000)
    page.wait_for_timeout(450)
    result={'variant':variant,'width':width,'map':metrics(page)}
    snapshot(page,variant+'-map',width)
    nav(page,'historico');page.wait_for_timeout(250)
    result['history']=metrics(page)
    result['panicBehindPage']=page.evaluate("""() => {const panic=document.querySelector('.ops-panic'),b=panic.getBoundingClientRect(),r=document.querySelector('.rp-field-page-overlay').getBoundingClientRect();const left=Math.max(b.left,r.left),right=Math.min(b.right,r.right),top=Math.max(b.top,r.top),bottom=Math.min(b.bottom,r.bottom);const intersects=right>left&&bottom>top;const covered=!intersects||!!document.elementFromPoint((left+right)/2,(top+bottom)/2)?.closest('.rp-field-page-overlay');return covered&&!!panic.closest('[inert]')}""")
    result['historyTitleVisible']=page.locator('.rp-field-page-overlay h1').is_visible()
    snapshot(page,variant+'-history',width)
    nav(page,'meus-envios');page.wait_for_timeout(250)
    result['submissionsEmptyVisible']=page.get_by_text('Nenhum alerta ou ocorrência registrado.',exact=True).is_visible()
    snapshot(page,variant+'-submissions',width)
    page.locator('.rp-page-back').click()
    page.locator('[data-action="demo-chat-overlay"]:visible').first.click()
    page.locator('#rp-demo-chat-overlay [data-action="demo-chat-contacts"]').click()
    page.locator('#rp-demo-chat-overlay [data-action="live-chat-contact"]').first.click()
    page.locator('#demo-chat-body').wait_for();page.wait_for_timeout(250)
    result['chat']=metrics(page)
    snapshot(page,variant+'-chat',width)
    if variant!='before':
     draft='Rascunho de verificação de interface'
     page.locator('#demo-chat-body').fill(draft)
     page.set_viewport_size({'width':width,'height':458 if height>458 else 300})
     page.locator('#demo-chat-body').focus();page.wait_for_timeout(200)
     result['keyboard']=metrics(page)
     result['draftPreserved']=page.locator('#demo-chat-body').input_value()==draft
     if variant=='apk' and width==393:
      page.locator('#demo-chat-body').evaluate('(el)=>el.setSelectionRange(4,11)')
      with page.expect_response(lambda response:'/chat/conversations/' in response.url and '/messages' in response.url and response.request.method=='GET',timeout=12000):
       page.wait_for_timeout(9000)
      page.wait_for_timeout(150)
      result['pollDraftPreserved']=page.locator('#demo-chat-body').input_value()==draft
      result['pollFocusPreserved']=page.locator('#demo-chat-body').evaluate('(el)=>document.activeElement===el&&el.selectionStart===4&&el.selectionEnd===11')
      assert result['pollDraftPreserved'] and result['pollFocusPreserved'],('poll destroyed composer',result)

     snapshot(page,variant+'-keyboard',width)
     input_box=result['keyboard']['input']
     assert input_box and input_box['y']>=0 and input_box['y']+input_box['h']<=result['keyboard']['height']+1,('composer outside keyboard viewport',variant,width,input_box)
     assert result['draftPreserved'],('draft lost',variant,width)
     assert result['panicBehindPage'],('panic covers history',variant,width)
     assert result['historyTitleVisible'],('history title hidden',variant,width)
     assert result['submissionsEmptyVisible'],('empty page',variant,width)
     for state in ['map','history','chat','keyboard']:
      assert result[state]['overflow']<=1,(state,variant,width,'overflow')
     assert abs(result['map']['header']['h']-68)<1,('header changed',variant,width)
    assert not errors,errors
    result['errors']=errors;results.append(result);context.close()
  browser.close()
 before=next(r for r in results if r['variant']=='before')
 assert not before['panicBehindPage'],'old APK did not reproduce overlap'
 assert not before['submissionsEmptyVisible'],'old APK did not reproduce blank page'
 for width in [360,393,412,873]:
  html=next(r for r in results if r['variant']=='html' and r['width']==width)
  apk=next(r for r in results if r['variant']=='apk' and r['width']==width)
  for state in ['map','history','chat','keyboard']:close_enough(html[state],apk[state],str(width)+'/'+state)
 report={'passed':True,'apk':APK.name,'results':results,'simulatedGpsForUiOnly':True,'physicalAndroidTested':False,'emulatorStarted':False,'productionDataChanged':False}
 (OUT/'parity-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 print(json.dumps({'passed':True,'scenarios':len(results),'viewports':[360,393,412,873],'oldRegressionsReproduced':True,'htmlApkGeometryEqual':True,'physicalAndroidTested':False},ensure_ascii=False))
finally:
 server.terminate()
 try:server.wait(timeout=8)
 except subprocess.TimeoutExpired:server.kill();server.wait()
 log.close();shutil.rmtree(temp,ignore_errors=True)
