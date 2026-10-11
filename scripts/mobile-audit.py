#!/usr/bin/env python3
"""Read-only UX audit of Hondas Maxvel. Does not modify product files."""
import json, os, subprocess, time, traceback
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path('artifacts/mobile-ux-audit')
OUT.mkdir(parents=True, exist_ok=True)
RESULTS = []
ERRORS = []
VIEWPORTS = [(320, 640), (360, 740), (375, 812), (390, 780), (412, 915), (430, 760)]

METRICS_JS = r'''(stage) => {
 const body = document.body, doc = document.documentElement;
 const visible = el => { const r=el.getBoundingClientRect(),s=getComputedStyle(el); return s.visibility!=='hidden' && s.display!=='none' && r.width>0 && r.height>0; };
 const rect = el => {if(!el)return null;const r=el.getBoundingClientRect();return {top:Math.round(r.top),bottom:Math.round(r.bottom),width:Math.round(r.width),height:Math.round(r.height)};};
 const dialog = document.querySelector('dialog[open]');
 const buttons = [...document.querySelectorAll('button')].filter(visible);
 const smallButtons=buttons.filter(el=>{const r=el.getBoundingClientRect();return r.width<44||r.height<44;}).map(el=>({label:(el.textContent||'').trim().slice(0,50),w:Math.round(el.getBoundingClientRect().width),h:Math.round(el.getBoundingClientRect().height)})).slice(0,20);
 const smallText=[...document.querySelectorAll('small,p,.map-caption,.eyebrow')].filter(visible).filter(el=>{const sz=parseFloat(getComputedStyle(el).fontSize);return sz<12}).slice(0,12).map(el=>({size:parseFloat(getComputedStyle(el).fontSize),sample:(el.textContent||'').trim().slice(0,55)}));
 const action = document.querySelector('.checkpoint-card button[data-action="complete-point"], [data-action="start"], [data-action="confirm-start"]');
 const cta=dialog?.querySelector('[data-action="accept-location-notice"]') || action;
 const nav = document.querySelector('.mobile-nav');
 const viewportWidth=window.innerWidth,viewportHeight=window.innerHeight;
 return {stage,viewport:[viewportWidth,viewportHeight],scrollWidth:doc.scrollWidth,bodyWidth:body.scrollWidth,overflow:doc.scrollWidth>viewportWidth+2,
  documentHeight:doc.scrollHeight,dialog:rect(dialog),dialogScroll:dialog?{client:dialog.clientHeight,content:dialog.scrollHeight}:null,
  cta:rect(cta),ctaInitiallyVisible:cta?rect(cta).top>=0 && rect(cta).bottom<=viewportHeight:false,
  nav:rect(nav),navButtons:nav?[...nav.querySelectorAll('button')].map(el=>({label:(el.textContent||'').trim().slice(0,25),box:rect(el)})):[],
  map:rect(document.querySelector('#mobile-map,#ops-map,#hero-map')),
  buttons:buttons.length,tooSmallTargets:smallButtons,smallText,
  closeOnMandatory:!!dialog?.querySelector('[data-action="close-dialog"]')&&dialog?.dataset.mandatoryNotice==='true',
  bodyText:(document.querySelector('main')?.innerText||'').slice(0,240)};
}'''

def safe_shot(page, key, scroll=None):
    if scroll:
        try:page.locator(scroll).first.scroll_into_view_if_needed(timeout=3000)
        except Exception as e:ERRORS.append({'stage':key,'error':'scroll '+str(e)[:160]})
    elif page.locator('dialog[open]').count()==0:
        page.evaluate('window.scrollTo(0,0)')
    page.wait_for_timeout(250)
    page.screenshot(path=str(OUT / (key+'.png')),animations='disabled',timeout=10000)
    data=page.evaluate(METRICS_JS, key)
    RESULTS.append(data)
    print('CAPTURE',key,'OVERFLOW',data.get('overflow'),'TARGETS',len(data.get('tooSmallTargets',[])),flush=True)

def click(page, selector):
    page.locator(selector).first.click(timeout=8000)
    page.wait_for_timeout(250)

def accept_or_decline(page, accept=False):
    page.locator('dialog[open]').wait_for(timeout=8000)
    if accept:
        page.locator('#location-intro-check').check()
        click(page,'[data-action="accept-location-notice"]')
    else:
        click(page,'[data-action="decline-location-notice"]')

def login(page,role='ronda'):
    click(page,'[data-action="login"]')
    page.locator('#login-form input[name="name"]').fill('Teste de Usabilidade')
    page.locator(f'#login-form input[name="role"][value="{role}"]').check()
    click(page,'#login-form button[type="submit"]')
    page.locator('.app-shell').wait_for(timeout=9000)

def attempt(name, fn):
    try:fn()
    except Exception as e:
        ERRORS.append({'stage':name,'error':str(e)[:600], 'trace':traceback.format_exc(limit=2)})
        print('ERROR',name,str(e)[:300],flush=True)

def main():
    server=subprocess.Popen(['python3','-m','http.server','8123','--bind','127.0.0.1','--directory','.'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(1)
    try:
        with sync_playwright() as p:
            binary=os.environ.get('MAXVEL_CHROMIUM') or '/usr/bin/chromium'
            browser=p.chromium.launch(executable_path=binary,headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
            for width,height in VIEWPORTS:
                label=f'w{width}'
                context=browser.new_context(viewport={'width':width,'height':height},device_scale_factor=1,is_mobile=True,has_touch=True,locale='pt-BR',reduced_motion='reduce')
                page=context.new_page()
                page.set_default_timeout(10000)
                page.goto('http://127.0.0.1:8123/',wait_until='domcontentloaded',timeout=12000)
                page.locator('dialog[open]').wait_for(timeout=10000)
                attempt(label+'-consent',lambda: safe_shot(page,label+'-consent'))
                attempt(label+'-decline',lambda:accept_or_decline(page))
                attempt(label+'-landing',lambda:safe_shot(page,label+'-landing'))
                attempt(label+'-login',lambda:login(page))
                attempt(label+'-ronda',lambda:safe_shot(page,label+'-ronda'))
                if width==390:
                    def patrol_flow():
                        click(page,'[data-action="start"]')
                        safe_shot(page,label+'-start-rules')
                        page.locator('#declaration-check').check()
                        click(page,'[data-action="confirm-start"]')
                        safe_shot(page,label+'-active')
                        click(page,'[data-action="demo-leave"]')
                        page.wait_for_function("!!document.querySelector('[data-action=justify]')",timeout=20000)
                        safe_shot(page,label+'-deviation',scroll='[data-action="justify"]')
                        click(page,'[data-action="justify"]')
                        safe_shot(page,label+'-justification-form')
                        page.locator('#justification-form textarea[name="reason"]').fill('Necessário verificar uma anormalidade perto do portão.')
                        click(page,'#justification-form button[type="submit"]')
                        safe_shot(page,label+'-justified')
                        assert page.locator('[data-action="complete-point"]').first.is_disabled(), 'Ponto não pode liberar após justificar sem retorno.'
                    attempt(label+'-patrol-flow',patrol_flow)
                attempt(label+'-logout',lambda:click(page,'[data-action="logout"]'))
                attempt(label+'-supervisor-login',lambda:login(page,role='supervisor'))
                attempt(label+'-supervisor',lambda:safe_shot(page,label+'-supervisor'))
                if width==390:
                    def supervisor_flow():
                        click(page,'[data-action="launch-scenario"]')
                        safe_shot(page,label+'-presentation')
                        safe_shot(page,label+'-supervision-panel',scroll='#supervisor-map')
                    attempt(label+'-supervisor-flow',supervisor_flow)
                context.close()
            context=browser.new_context(viewport={'width':1440,'height':900},device_scale_factor=1,locale='pt-BR')
            desktop=context.new_page();desktop.goto('http://127.0.0.1:8123/',wait_until='domcontentloaded',timeout=12000)
            attempt('desktop-consent',lambda:safe_shot(desktop,'desktop-consent'))
            attempt('desktop-decline',lambda:accept_or_decline(desktop))
            attempt('desktop-landing',lambda:safe_shot(desktop,'desktop-landing'))
            attempt('desktop-login',lambda:login(desktop,'supervisor'))
            attempt('desktop-supervisor',lambda:safe_shot(desktop,'desktop-supervisor'))
            browser.close()
    finally:
        server.terminate();server.wait(timeout=5)
        (OUT/'results.json').write_text(json.dumps({'measurements':RESULTS,'errors':ERRORS},indent=2,ensure_ascii=False),encoding='utf-8')
        print('FINISHED',len(RESULTS),'captures',len(ERRORS),'errors',flush=True)
    # Automatic test fails only if major state was not reachable: keep artifacts for diagnosis.
    essential=['w390-consent','w390-landing','w390-ronda','w390-active','w390-justification-form','w390-supervisor','desktop-supervisor']
    missing=[s for s in essential if not (OUT/(s+'.png')).exists()]
    if missing:raise SystemExit('Missing required flow captures: '+','.join(missing))

if __name__=='__main__':main()