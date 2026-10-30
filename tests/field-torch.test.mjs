import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createFieldTorch} from '../src/field-torch.js';

function screen(role='ronda'){
 const listeners=new Map(),nativeListeners=new Map();
 const btn={attrs:{},classList:{toggle(){}},setAttribute(name,value){this.attrs[name]=value;},
   querySelector(){return {textContent:''}},addEventListener(){},disabled:false};
 const dashboard={dataset:{torchRole:role},querySelector:()=>null,append(){}};
 const doc={
  hidden:false,
  addEventListener(name,fn){listeners.set(name,fn)},
  querySelector(sel){return sel==='.dashboard'?dashboard:sel==='[data-field-torch]'?btn:null},
  createElement(){
   return {muted:false,autoplay:false,playsInline:false,style:{},srcObject:null,setAttribute(){},
    play:async()=>{},remove(){}};
  },body:{append(){}}
 };
 const win={
  addEventListener(name,fn){if(!nativeListeners.has(name))nativeListeners.set(name,new Set());nativeListeners.get(name).add(fn)},
  removeEventListener(name,fn){nativeListeners.get(name)?.delete(fn)},
  emit(name,detail){for(const fn of nativeListeners.get(name)||[])fn({detail})}
 };
 return {doc,win,btn,dashboard,listeners};
}
test('PWA: só indica lanterna ligada após câmera traseira e torch confirmados',async()=>{
 const ui=screen();let stopped=0,on=false,requests=0;
 const track={readyState:'live',getCapabilities:()=>({torch:true}),
  getSettings:()=>({facingMode:'environment',torch:on}),
  applyConstraints:async c=>{on=!!c.advanced?.[0]?.torch},
  stop:()=>{stopped++}};
 const camera={getUserMedia:async options=>{
  requests++;
  assert.equal(options.video.facingMode.exact,'environment');
  return {getVideoTracks:()=>[track],getTracks:()=>[track]};
 }};
 const torch=createFieldTorch({doc:ui.doc,win:ui.win,mediaDevices:camera});
 await torch.toggle();assert.equal(torch.isOn(),true);
 assert.equal(ui.btn.attrs['aria-pressed'],'true');assert.equal(requests,1);
 torch.stop();assert.equal(torch.isOn(),false);assert.equal(stopped,1);
 assert.equal(ui.btn.attrs['aria-pressed'],'false');
});
test('PWA: sem suporte a flash mantém botão desligado e libera câmera',async()=>{
 const ui=screen();let stopped=0;const messages=[];
 const track={getCapabilities:()=>({torch:false}),getSettings:()=>({facingMode:'environment'}),
  stop:()=>{stopped++}};
 const torch=createFieldTorch({doc:ui.doc,win:ui.win,notify:x=>messages.push(x),
  mediaDevices:{getUserMedia:async()=>({getVideoTracks:()=>[track],getTracks:()=>[track]})}});
 await torch.toggle();assert.equal(torch.isOn(),false);
 assert.equal(stopped,1);assert.match(messages[0],/não liberou o flash/);
});
test('APK: chama controle nativo, confirma estado e desliga ao ocultar tela',async()=>{
 const ui=screen();const actions=[];
 const bridge={setTorchEnabled(on,id){
  actions.push(on);
  queueMicrotask(()=>ui.win.emit('rondas-native-torch-result',{requestId:id,enabled:on}));
 }};
 const torch=createFieldTorch({doc:ui.doc,win:ui.win,nativeBridge:bridge,
  mediaDevices:{getUserMedia:()=>{throw Error('Nativo não deve abrir MediaStream')}}});
 await torch.toggle();assert.equal(torch.isOn(),true);
 assert.equal(actions[0],true);
 ui.doc.hidden=true;ui.listeners.get('visibilitychange')();
 assert.equal(torch.isOn(),false);
 assert.deepEqual(actions.slice(0,2),[true,false]);
});
test('Não mantém flash ativo após troca de perfil',async()=>{
 const ui=screen();let off=0;
 const bridge={setTorchEnabled(on,id){
  if(!on)off++;
  queueMicrotask(()=>ui.win.emit('rondas-native-torch-result',{requestId:id,enabled:on}));
 }};
 const torch=createFieldTorch({doc:ui.doc,win:ui.win,nativeBridge:bridge});
 await torch.toggle();assert.equal(torch.isOn(),true);
 ui.dashboard.dataset.torchRole='admin';torch.decorate();
 assert.equal(torch.isOn(),false);assert.equal(off,1);
});
test('Lanterna Android real: câmera traseira, permissão, resposta à UI e parada ao sair',()=>{
 const java=readFileSync(new URL('../android/app/src/main/java/br/com/horizon/maxvel/MainActivity.java',import.meta.url),'utf8');
 assert.match(java,/getSystemService\(CAMERA_SERVICE\)/);
 assert.match(java,/CameraCharacteristics\.LENS_FACING_BACK/);
 assert.match(java,/setTorchMode\(torchId,enabled\)/);
 assert.match(java,/onPause\(\)/);
 assert.match(java,/PermissionRequest\.RESOURCE_VIDEO_CAPTURE/);
 assert.match(java,/rondas-native-torch-result/);
});

test('Lanterna do ponto utiliza o controlador compartilhado, sem segunda sessão de câmera',()=>{
 const curtain=readFileSync(new URL('../src/checkpoint-curtain.js',import.meta.url),'utf8');
 const app=readFileSync(new URL('../src/app.js',import.meta.url),'utf8');
 const central=readFileSync(new URL('../src/central.js',import.meta.url),'utf8');
 assert.match(curtain,/api\.torch\?\.toggle\(\)/);
 assert.match(curtain,/api\.torch\?\.subscribe/);
 assert.match(curtain,/api\.torch\?\.stop\(\)/);
 assert.doesNotMatch(curtain,/torchStream|torchTrack|getUserMedia/);
 assert.match(app,/createCheckpointCurtain\([^;]+notify,torch\}/);
 assert.match(app,/view==='minha-ronda'/);
 assert.match(central,/\['dashboard','inspections','send','dispatches'\]\.includes\(page\)/);
});
test('Assinantes da lanterna mantêm o botão do ponto sincronizado com o flutuante',async()=>{
 const ui=screen();let lit=false;
 const track={readyState:'live',getCapabilities:()=>({torch:true}),getSettings:()=>({facingMode:'environment',torch:lit}),
  applyConstraints:async options=>{lit=!!options.advanced[0].torch},stop:()=>{}};
 const torch=createFieldTorch({doc:ui.doc,win:ui.win,mediaDevices:{
  getUserMedia:async()=>({getVideoTracks:()=>[track],getTracks:()=>[track]})}});
 const states=[];
 const unsubscribe=torch.subscribe(state=>states.push({...state}));
 assert.deepEqual(states[0],{on:false,busy:false});
 await torch.toggle();
 assert.equal(states.at(-1).on,true);
 torch.stop();
 assert.deepEqual(states.at(-1),{on:false,busy:false});
 const size=states.length;unsubscribe();
 await torch.toggle();
 assert.equal(states.length,size);
 torch.stop();
});
test('Solicitação da câmera cancelada durante navegação não acende a lanterna',async()=>{
 const ui=screen();let release,stops=0;
 const gate=new Promise(resolve=>release=resolve);
 const track={getCapabilities:()=>({torch:true}),getSettings:()=>({facingMode:'environment',torch:true}),
  applyConstraints:async()=>{throw Error('não deveria ligar')},stop:()=>{stops++}};
 const torch=createFieldTorch({doc:ui.doc,win:ui.win,mediaDevices:{
  getUserMedia:()=>gate}});
 const waiting=torch.toggle();
 ui.dashboard.dataset.torchRole='admin';torch.decorate();
 release({getVideoTracks:()=>[track],getTracks:()=>[track]});
 await waiting;
 assert.equal(torch.isOn(),false);
 assert.equal(stops,1);
});
