/** Real mobile click regression for the requested slide-down messages interface. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {createAppServer} from '../server.js';

const server=createAppServer();
let browser;
try {
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  browser=await chromium.launch({
    headless:true, args:['--no-sandbox','--disable-dev-shm-usage'],
    ...(process.env.CHROME_BIN ? {executablePath:process.env.CHROME_BIN} : {})
  });
  for(const [width,height] of [[360,800],[390,844],[768,900]]){
    const context=await browser.newContext({
      viewport:{width,height},isMobile:width<=390,hasTouch:width<=390,
      reducedMotion:'reduce',permissions:['geolocation'],
      geolocation:{latitude:-20.14,longitude:-44.88,accuracy:8}
    });
    const page=await context.newPage();
    const pageErrors=[];
    page.on('pageerror',e=>pageErrors.push(e.message));
    await page.addInitScript(()=>{
      localStorage.setItem('horizon-maxvel-tour-v2','seen');
      localStorage.setItem('horizon-maxvel-localizacao-ciencia-v1',
        JSON.stringify({version:'2026-10-11',accepted:true,at:Date.now()}));
    });
    await page.goto('http://127.0.0.1:'+server.address().port,
      {waitUntil:'domcontentloaded'});
    await page.locator('.dashboard').waitFor();
    if(await page.locator('.location-entry-grant').count()){
      await page.locator('.location-entry-grant').click();
      await page.locator('.location-entry-gate').waitFor({state:'detached'});
    }
    if(width<=900){
      await page.locator('.dashboard [data-action="open-mobile-menu"]').click();
      const access=page.locator('#dialog[open] .ux-access-menu');
      await access.waitFor();
      await access.locator('[data-view]').first().click();
      assert.equal(await page.locator('#dialog[open] .ux-access-menu').count(),0,
        'Menu mobile deve fechar após escolher a rota');
    }
    const menu=page.locator('.dashboard .rp-message-trigger');
    assert.equal(await menu.count(),1,'Mensagens deve ser ação direta, não popover aninhado');
    await menu.click({timeout:7000});
    const sheet=page.locator('#rp-demo-chat-overlay[open]');
    await sheet.waitFor();
    const box=await sheet.boundingBox();
    assert.ok(box,'Mensagem deve ficar visível e clicável');
    const diagnostics=await sheet.evaluate(node=>({
      rect:{width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height,
            x:node.getBoundingClientRect().x,y:node.getBoundingClientRect().y},
      viewport:{width:window.innerWidth,height:window.innerHeight},
      styles:{width:getComputedStyle(node).width,height:getComputedStyle(node).height,
              maxWidth:getComputedStyle(node).maxWidth,maxHeight:getComputedStyle(node).maxHeight},
      matched:(()=>{
        const out=[];
        const walk=(list,media='all')=>{
          for(const rule of list){
            if(rule.cssRules){walk(rule.cssRules,rule.conditionText||media);continue;}
            if(!rule.selectorText||!rule.style?.length)continue;
            try{if(!node.matches(rule.selectorText))continue;}catch{continue;}
            const props=['width','max-width','height','max-height','margin','padding'];
            if(!props.some(p=>rule.style.getPropertyValue(p)))continue;
            out.push({selector:rule.selectorText,media,width:rule.style.width,
                      maxWidth:rule.style.maxWidth,height:rule.style.height,maxHeight:rule.style.maxHeight});
          }
        };
        for(const sheet of document.styleSheets)try{walk(sheet.cssRules);}catch{}
        return out.slice(-18);
      })()
    }));
    console.log('Chat viewport diagnostic:',JSON.stringify(diagnostics));
    const cascade=await page.evaluate(async()=>{
      const url=new URL('./assets/ronda-pro.css?v=20',location.href);
      const response=await fetch(url,{cache:'no-store'});
      const source=await response.text();
      const virtual=new CSSStyleSheet();
      virtual.replaceSync(source);
      const el=document.querySelector('#rp-demo-chat-overlay');
      const matched=[];
      const walk=(list,media='all')=>{
        for(const rule of list){
          if(rule.cssRules){walk(rule.cssRules,rule.conditionText||media);continue;}
          if(!rule.selectorText||!rule.style)continue;
          try{if(!el.matches(rule.selectorText))continue;}catch{continue;}
          if(!['width','max-width','height','max-height'].some(p=>rule.style.getPropertyValue(p)))continue;
          matched.push({selector:rule.selectorText,media,css:rule.style.cssText.slice(0,270)});
        }
      };
      walk(virtual.cssRules);
      const sample=[];
      const scan=(rules,depth=0)=>{
        for(const rule of rules){
          if(rule.cssRules){scan(rule.cssRules,depth+1);continue;}
          if(rule.selectorText&&(/rp-field-chat-overlay|rp-demo-chat-sheet|^dialog$/.test(rule.selectorText))){
            sample.push({selector:rule.selectorText.slice(0,250),css:rule.style?.cssText?.slice(0,280),matches:el.matches(rule.selectorText),depth});
          }
        }
      };
      scan(virtual.cssRules);
      return {sample:sample.slice(-15),sourceOccurrence:source.lastIndexOf('.rp-field-chat-overlay,.rp-field-chat-overlay[open]'),
              url:url.pathname,bytes:source.length,http:response.status,media600:matchMedia('(max-width:600px)').matches,
              className:el?.className,cssLoaded:Array.from(document.styleSheets).map(x=>({href:x.href,rules:(()=>{try{return x.cssRules.length}catch{return -1}})()})).slice(-8),
              virtualCount:virtual.cssRules.length,virtualSample:Array.from(virtual.cssRules).slice(0,3).map(x=>x.cssText.slice(0,120)),
              tailRules:Array.from(virtual.cssRules).slice(-8).map(x=>({type:x.constructor.name,length:x.cssText.length,
              head:x.cssText.slice(0,240),tail:x.cssText.slice(-240),selector:x.selectorText||null})),
              sourceRule:source.includes('.rp-field-chat-overlay,.rp-field-chat-overlay[open]'),
              rules:matched.slice(-30)};
    });
    console.log('Chat CSS cascade diagnostic:',JSON.stringify(cascade));
    if(width<=600){
      assert.ok(box.width>=width-2 && box.height>=height-2,
        'Janela de mensagens deve ocupar a viewport mobile: '+JSON.stringify(diagnostics));
      assert.ok(Math.abs(box.y)<3,'Painel deve começar no topo da viewport');
    }
    await sheet.locator('#demo-chat-body').fill('Mensagem real de teste de interface');
    await sheet.locator('#demo-chat-form button[type=submit]').click();
    await sheet.locator('.field-chat-thread').getByText('Mensagem real de teste de interface').waitFor();
    await sheet.locator('.field-chat-back').click();
    await sheet.waitFor({state:'hidden'});
    assert.ok(await page.locator('.dashboard .app-header').isVisible(),
      'A tela principal deve voltar a aceitar interação');
    await menu.click();
    await sheet.waitFor();
    await sheet.locator('[data-action="demo-chat-overlay-close"]').first().click();
    await sheet.waitFor({state:'hidden'});
    assert.deepEqual(pageErrors,[],'Erros JavaScript ao abrir/fechar/enviar');
    await context.close();
  }
} finally {
  await browser?.close();
  server.closeAllConnections();
  await new Promise(resolve=>server.close(resolve));
}
