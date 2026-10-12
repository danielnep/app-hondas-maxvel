import {loadLeaflet} from './map.js';
import {DEMO_WATCHERS,DEMO_ROUTES,routeForWatcher,createPrograms} from './scheduling.js';

/** Ronda assistida, todas as etapas cabem em uma tela, sem formulários longos. */
export function createPatrolWizard({modal,showDialog,notify,getPrograms,getRules,onSave}){
 let draft=null,stage=0,map=null,lastLookup=0;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=ms=>{const d=new Date(ms);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16)};
 const button=(label,action,kind='')=>'<button type="button" class="button '+kind+'" data-wizard="'+action+'">'+label+'</button>';
 function clean(){if(map){map.remove();map=null}}
 function open(){
  const now=Date.now();draft={watcherId:'v01',routeId:'centro',startAt:now+3600000,
   endAt:now+7200000,repeat:'once',customRoute:{points:[],rules:{...getRules()}}};
  stage=0;paint();
 }
 function paint(){
  if(!draft)return;
  clean();const watcher=DEMO_WATCHERS.find(w=>w.id===draft.watcherId);
  const names=['Escolha o vigia','Defina o horário','Marque os pontos','Revise e confirme'];
  let content='';
  if(stage===0){
   content='<p>Selecione quem executará a ronda.</p><div class="rev3-wiz-watchers">'+DEMO_WATCHERS.map(w=>
    '<button type="button" data-wizard="person" data-id="'+w.id+'"><strong>'+esc(w.name)+'</strong><small>'+esc(w.unit)+'</small> →</button>').join('')+'</div>';
  }else if(stage===1){
   content='<p>'+esc(watcher.name)+' · Informe o período previsto.</p>'+
   '<form id="rev3-time-form"><label>Início<input type="datetime-local" name="begin" required value="'+fmt(draft.startAt)+'"></label>'+
   '<label>Término<input type="datetime-local" name="end" required value="'+fmt(draft.endAt)+'"></label></form>'+
   '<p class="rev3-footnote">Conflitos serão verificados antes de salvar.</p>';
  }else if(stage===2){
   content='<p>Toque no mapa para adicionar um ponto. Ou busque o endereço e selecione o resultado.</p>'+
   '<div class="rev3-address"><input id="rev3-address" type="search" maxlength="120" placeholder="Ex.: Rua Bahia, Divinópolis" aria-label="Endereço do ponto"/>'+
   button('Localizar','lookup')+'</div><div id="rev3-wizard-map" role="application" aria-label="Mapa para marcar pontos"></div>'+
   '<div class="rev3-pointline"><strong>'+draft.customRoute.points.length+' ponto(s)</strong>'+
   button('Desfazer último','undo')+'</div>'+
   '<div class="rev3-pointlabels">'+draft.customRoute.points.map((p,i)=>'<span>'+(i+1)+'. '+esc(p.name)+'</span>').join('')+'</div>'+
   '<p class="rev3-footnote">Cada ponto: '+Math.round(getRules().dwellMs/1000)+' s de permanência.</p>';
  }else{
   content='<p>Confira a ordem, os horários e o responsável antes de concluir.</p>'+
   '<div class="rev3-review"><div>Vigia <strong>'+esc(watcher.name)+'</strong></div>'+
   '<div>Início <strong>'+esc(fmt(draft.startAt).replace('T',' '))+'</strong></div>'+
   '<div>Término <strong>'+esc(fmt(draft.endAt).replace('T',' '))+'</strong></div>'+
   '<div>Pontos <strong>'+draft.customRoute.points.length+' · '+Math.round(getRules().dwellMs/1000)+' s por ponto</strong></div>'+
   draft.customRoute.points.map((p,i)=>'<div>'+(i+1)+'. <strong>'+esc(p.name)+'</strong></div>').join('')+
   '</div><p class="rev3-footnote">Programação local demonstrativa. Não despacha ordens para outros dispositivos.</p>';
  }
  showDialog('<section class="rev3-wizard"><header><small>PROGRAMAR RONDA · ETAPA '+(stage+1)+' / 4</small>'+
   '<h2>'+names[stage]+'</h2></header><div class="rev3-wizard-content">'+content+'</div>'+
   '<footer>'+button(stage===0?'Cancelar':'Voltar',stage===0?'close':'back')+
   (stage===0?'':stage===1?'<button type="submit" form="rev3-time-form" class="button primary">Próximo →</button>':
    stage===2?button('Revisar →','next','primary'):button('Salvar ronda','save','primary'))+'</footer></section>',true);
  if(stage===2)setupMap();
 }
 async function setupMap(){
  const el=modal.querySelector('#rev3-wizard-map');if(!el||!draft)return;
  const route=routeForWatcher(draft.watcherId);
  try{
   const L=await loadLeaflet();if(!el.isConnected)return;
   const m=L.map(el,{zoomControl:true,scrollWheelZoom:false}).setView([route.base.lat,route.base.lng],16);map=m;
   L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{
    maxZoom:19,attribution:'© OpenStreetMap contributors · © CARTO'}).addTo(m);
   for(const [i,p] of draft.customRoute.points.entries())L.marker([p.lat,p.lng]).addTo(m).bindTooltip('Ponto '+(i+1));
   if(draft.customRoute.points.length>1)L.polyline(draft.customRoute.points.map(p=>[p.lat,p.lng]),
    {color:'#28B6E8',dashArray:'5,7'}).addTo(m);
   m.on('click',e=>{
    if(draft.customRoute.points.length>=8){notify('Limite de oito pontos nesta demonstração.');return}
    draft.customRoute.points.push({name:'Ponto '+(draft.customRoute.points.length+1),
     lat:e.latlng.lat,lng:e.latlng.lng});paint();
   });
   setTimeout(()=>{if(map===m)m.invalidateSize()},150);
  }catch{el.textContent='Mapa indisponível. Conecte-se para selecionar um ponto ou buscar endereço.'}
 }
 async function lookup(input,button){
  const name=input?.value?.trim();if(!name||name.length<5){notify('Digite um endereço mais completo.');return;}
  if(draft.customRoute.points.length>=8){notify('Limite de oito pontos.');return;}
  if(Date.now()-lastLookup<1250){notify('Aguarde um momento antes de consultar novamente.');return;}
  lastLookup=Date.now();button.disabled=true;
  try{
   const response=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q='+
    encodeURIComponent(name+', Divinópolis, MG'),{headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Serviço indisponível');
   const result=(await response.json())[0];
   if(!result){notify('Endereço não encontrado. Experimente outro ou toque no mapa.');return;}
   draft.customRoute.points.push({name:name.slice(0,70),lat:Number(result.lat),lng:Number(result.lon)});paint();
  }catch{notify('Busca indisponível. Use o mapa ou tente novamente.')}
  finally{button.disabled=false}
 }
 modal.addEventListener('click',async event=>{
  const button=event.target.closest('[data-wizard]');if(!button||!draft)return;
  const action=button.dataset.wizard;event.preventDefault();event.stopPropagation();
  if(action==='close'){draft=null;clean();modal.close();return;}
  if(action==='person'){
   if(!DEMO_WATCHERS.some(w=>w.id===button.dataset.id))return;
   draft.watcherId=button.dataset.id;draft.routeId=DEMO_ROUTES.find(x=>x.unit===DEMO_WATCHERS.find(w=>w.id===draft.watcherId).unit)?.id||'centro';
   stage=1;paint();return;
  }
  if(action==='back'){stage=Math.max(0,stage-1);paint();return;}
  if(action==='undo'){draft.customRoute.points.pop();paint();return;}
  if(action==='lookup'){await lookup(modal.querySelector('#rev3-address'),button);return;}
  if(action==='next'){
   if(!draft.customRoute.points.length){notify('Marque pelo menos um ponto.');return;}
   stage=3;paint();return;
  }
  if(action==='save'){
   const result=createPrograms(draft,getPrograms(),Date.now());
   if(!result.ok){notify(result.error);return;}
   draft=null;clean();modal.close();onSave(result.items);
  }
 });
 modal.addEventListener('submit',e=>{
  if(e.target.id!=='rev3-time-form'||!draft)return;
  e.preventDefault();e.stopImmediatePropagation();
  const f=new FormData(e.target),start=new Date(f.get('begin')).getTime(),end=new Date(f.get('end')).getTime();
  if(!Number.isFinite(start)||!Number.isFinite(end)||start<Date.now()-60000||end<=start||end-start>12*3600000){
   notify('Corrija início e término (duração máxima de 12 horas).');return;
  }
  draft.startAt=start;draft.endAt=end;stage=2;paint();
 },true);
 return {open,close:clean};
}
