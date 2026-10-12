/** Programação em quatro etapas. Usa mapa interativo ou endereço e mantém o resultado local. */
import {DEMO_WATCHERS,routeForWatcher} from './scheduling.js';

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const dateLocal=ms=>new Date(ms-new Date(ms).getTimezoneOffset()*60000).toISOString().slice(0,16);
export function createRoundWizard({dialog,showDialog,settings,onMap,onSave,notify}){
 let step=0,disposed=false,points=[],watcherId='v01',startAt=dateLocal(Date.now()+3600000),
  endAt=dateLocal(Date.now()+7200000),repeat='once',notes='',currentMap=null;
 const labels=['Quem fará a ronda?','Quando será?','Marque os pontos','Revisar e programar'];
 const worker=()=>DEMO_WATCHERS.find(w=>w.id===watcherId)??DEMO_WATCHERS[0];
 const pointText=p=>esc(p.name||'Ponto');
 function getUi(){
  const progress='<div class="wizard-progress">'+[0,1,2,3].map(i=>'<i class="'+(i<=step?'done':'')+'"></i>').join('')+'</div>';
  const head='<div class="eyebrow">RONDA · ETAPA '+(step+1)+' / 4</div><h2>'+labels[step]+'</h2>'+progress;
  let content='';
  if(step===0){
   content='<p>Selecione um dos quatro vigias que receberá a ronda.</p><div class="wizard-watchers">'+
    DEMO_WATCHERS.map(w=>'<button type="button" data-wizard="worker" data-id="'+esc(w.id)+'" class="'+(w.id===watcherId?'selected':'')+'">'+
      '<b>'+esc(w.name)+'</b><small>'+esc(w.unit)+'</small></button>').join('')+'</div>';
  }else if(step===1){
   content='<p>Defina o início e término. Conflitos de horários serão verificados antes de salvar.</p>'+
    '<label>Início<input id="wizard-start" type="datetime-local" value="'+esc(startAt)+'"></label>'+
    '<label>Término<input id="wizard-end" type="datetime-local" value="'+esc(endAt)+'"></label>';
  }else if(step===2){
   content='<p>Toque no mapa ou pesquise cada endereço. Os pontos seguem a ordem de inclusão.</p>'+
    '<div id="wizard-map" class="wizard-map"></div>'+
    '<div class="wizard-address"><input id="wizard-address" placeholder="Rua e número em Divinópolis" aria-label="Endereço do ponto">'+
    '<button type="button" data-wizard="address">Localizar</button></div>'+
    '<div class="wizard-coordinates"><input id="wizard-lat" type="number" step="any" placeholder="Latitude" aria-label="Latitude">'+
    '<input id="wizard-lng" type="number" step="any" placeholder="Longitude" aria-label="Longitude">'+
    '<button type="button" data-wizard="coordinates">Adicionar</button></div>'+
    '<div class="wizard-point-foot"><span>'+points.length+' / 8 pontos · '+Number(settings.dwellSeconds||30)+' s por ponto</span>'+
     (points.length?'<button type="button" data-wizard="remove">Remover último</button>':'')+'</div>';
  }else{
   content='<div class="wizard-review"><p><strong>Responsável:</strong> '+esc(worker().name)+'</p>'+
    '<p><strong>Período:</strong> '+esc(startAt.replace('T',' '))+' até '+esc(endAt.replace('T',' '))+'</p>'+
    '<p><strong>Pontos:</strong> '+points.map((p,i)=>(i+1)+'. '+pointText(p)).join(' · ')+'</p>'+
    '<p><strong>Permanência:</strong> '+Number(settings.dwellSeconds||30)+' s por ponto</p></div>'+
    '<label>Repetição<select id="wizard-repeat"><option value="once">Uma vez</option><option value="daily7">Todos os dias por 7 dias</option></select></label>'+
    '<label>Observação (opcional)<input id="wizard-notes" maxlength="240" value="'+esc(notes)+'"></label>';
  }
  const footer='<nav class="wizard-nav"><button type="button" data-wizard="back" '+(step===0?'disabled':'')+'>Voltar</button>'+
     '<button type="button" class="button primary" data-wizard="'+(step===3?'save':'next')+'">'+(step===3?'Confirmar programação':'Continuar')+'</button></nav>';
  return '<div class="round-wizard"><div class="wizard-head">'+head+'</div><div class="wizard-body">'+content+'</div>'+footer+
   '<small>Cenário fictício · salvo apenas neste navegador.</small></div>';
 }
 function pick(location,name){
  if(disposed)return;
  if(points.length>=8){notify('Limite de oito pontos por ronda nesta demonstração.');return;}
  const lat=Number(location.lat),lng=Number(location.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){notify('Coordenadas inválidas.');return;}
  points.push({name:name||'Ponto '+(points.length+1),lat,lng});render();
 }
 function render(){
  if(disposed)return;
  currentMap?.destroy?.();currentMap=null;
  showDialog(getUi(),true);
  const rep=dialog.querySelector('#wizard-repeat');if(rep)rep.value=repeat;
  if(step===2){
   requestAnimationFrame(()=>{
    if(disposed||step!==2||!dialog.querySelector('#wizard-map'))return;
    const route=routeForWatcher(watcherId);
    const chosen=points.map((p,i)=>({id:'draft-'+i,name:p.name,instruction:'Verificar este ponto.',lat:p.lat,lng:p.lng,radius:25}));
    route.points=chosen;route.legs=Array.from({length:chosen.length+1},()=>[]);
    currentMap=onMap(dialog.querySelector('#wizard-map'),route,pick);
   });
  }
 }
 function consumeTimes(){
  const a=dialog.querySelector('#wizard-start')?.value,b=dialog.querySelector('#wizard-end')?.value;
  const from=new Date(a||'').getTime(),to=new Date(b||'').getTime();
  if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from||to-from>12*3600000||from<Date.now()-60000){
   notify('Escolha início e término futuros, em intervalo de até 12 horas.');return false;
  }
  startAt=a;endAt=b;return true;
 }
 async function click(e){
  const target=e.target.closest('[data-wizard]');
  if(!target||!dialog.contains(target)||disposed)return;
  const action=target.dataset.wizard;
  if(action==='worker'){
   if(!DEMO_WATCHERS.some(w=>w.id===target.dataset.id))return;
   watcherId=target.dataset.id;points=[];render();return;
  }
  if(action==='back'){step=Math.max(0,step-1);render();return;}
  if(action==='next'){
   if(step===1&&!consumeTimes())return;
   if(step===2&&points.length===0){notify('Marque ao menos um ponto no mapa ou digite um endereço.');return;}
   step=Math.min(3,step+1);render();return;
  }
  if(action==='remove'){points.pop();render();return;}
  if(action==='coordinates'){
   const lat=dialog.querySelector('#wizard-lat')?.value,lng=dialog.querySelector('#wizard-lng')?.value;
   if(!lat||!lng){notify('Informe latitude e longitude.');return;}
   pick({lat:Number(lat),lng:Number(lng)});return;
  }
  if(action==='address'){
   const address=dialog.querySelector('#wizard-address')?.value.trim();
   if(!address||address.length<4){notify('Informe rua e número.');return;}
   target.disabled=true;target.textContent='Localizando…';
   try{
    const full=/Divin[óo]polis/i.test(address)?address:address+', Divinópolis, MG, Brasil';
    const res=await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q='+encodeURIComponent(full));
    if(!res.ok)throw Error('geocoding');
    const items=await res.json();
    if(!items[0]){notify('Endereço não encontrado. Toque no mapa ou use coordenadas.');return;}
    pick({lat:Number(items[0].lat),lng:Number(items[0].lon)},address);
   }catch{notify('Busca de endereço indisponível. Use o mapa ou coordenadas.');}
   finally{if(target.isConnected){target.disabled=false;target.textContent='Localizar';}}
   return;
  }
  if(action==='save'){
   repeat=dialog.querySelector('#wizard-repeat')?.value==='daily7'?'daily7':'once';
   notes=dialog.querySelector('#wizard-notes')?.value.trim().slice(0,240)||'';
   const unit=worker().unit,routeId=unit==='Unidade Centro'?'centro':unit==='Unidade Norte'?'norte':'industrial';
   const result=onSave({watcherId,routeId,startAt:new Date(startAt).getTime(),endAt:new Date(endAt).getTime(),
    repeat,notes,customRoute:{points, rules:{dwellMs:Number(settings.dwellSeconds||30)*1000,blockOnDeviation:settings.deviationJustification!==false,logDeviations:true}}});
   if(result?.ok){destroy();}else notify(result?.error||'Não foi possível salvar.');
  }
 }
 function destroy(){disposed=true;currentMap?.destroy?.();dialog.removeEventListener('click',click);}
 dialog.addEventListener('click',click);
 render();
 return {destroy};
}
