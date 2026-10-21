import {loadLeaflet} from './map.js';

/** Responsividade da proposta aprovada: endereço -> agendamento -> revisão.
 * O endereço informado vira coordenadas SOMENTE após seleção de resultado de geocodificação.
 * Não há campos de latitude/longitude na interface, nem trajetos rodoviários inventados.
 */
export function createRoutePlanner({getData,api,afterSave,notify}){
 const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let step=1,points=[],kind='routine',recurrence='daily',hour='08:00',startDate='',weekdays=[1,2,3,4,5],workerId='',name='',suggestions=[],query='',loading=false,lookupTimer=null,lookupSerial=0,map=null,mapSeq=0,saving=false;
 const watcherList=()=>getData().users.filter(u=>u.role==='ronda'&&u.active!==0&&(!getData().demo||String(u.username||'').startsWith('vigia-demo-')));
 const roleOk=()=>['admin','coi','operador','master'].includes(getData().role);
 const week=['D','S','T','Q','Q','S','S'];
 const weekLabel=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
 const repeatLabels={once:'Uma vez',daily:'Todo dia',alternate:'Dia sim, dia não',weekly:'Dias específicos'};
 const kindLabels={routine:'Ronda de rotina',specific:'Ronda específica / aleatória'};
 const field=(label,body)=>'<label class="rp-plan-field"><span>'+label+'</span>'+body+'</label>';
 const safePoint=p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180&&String(p.name).trim();
 const footer='<p class="rp-plan-caption">A representação liga os pontos cadastrados em ordem. Não representa navegação por ruas. © OpenStreetMap.</p>';
 function html(){
  if(!roleOk())return '<p class="rp-plan-warning">A configuração de rondas é permitida ao COI e à Administração.</p>';
  const people=watcherList();if(!people.some(w=>w.id===workerId))workerId=people[0]?.id||'';
  const positions=points.map((p,i)=>'<div class="rp-plan-stop"><span class="rp-plan-grip" aria-hidden="true">⠿</span><b class="rp-plan-number">'+(i+1)+'</b><div class="rp-plan-stop-copy"><strong>Endereço '+(i+1)+' · '+escape(p.name)+'</strong><small>'+escape(p.address||p.name)+'</small></div><div class="rp-plan-order"><button type="button" data-action="rp-plan-up" data-index="'+i+'" aria-label="Subir endereço '+(i+1)+'" '+(i===0?'disabled':'')+'>↑</button><button type="button" data-action="rp-plan-down" data-index="'+i+'" aria-label="Descer endereço '+(i+1)+'" '+(i===points.length-1?'disabled':'')+'>↓</button><button type="button" class="rp-plan-remove" data-action="rp-plan-remove" data-index="'+i+'" aria-label="Remover endereço '+(i+1)+'">×</button></div></div>').join('');
  const summary='<div class="rp-plan-summary"><div><small>Tipo</small><strong>'+kindLabels[kind]+'</strong></div><div><small>Destino</small><strong>'+points.length+' pontos</strong></div><div><small>Agendamento</small><strong>'+(recurrence==='once'?(startDate||'Data não informada'):repeatLabels[recurrence])+' · '+hour+'</strong></div></div>';
  return '<section id="rp-plan" class="rp-plan" data-step="'+step+'">'+
   '<div class="rp-plan-heading"><div><h1>Rotas e rondas</h1><p>Cadastro de percursos e atribuição de vigias.</p></div><span class="rp-plan-access">COI + Administrador</span></div>'+
   (getData().demo?'<div class="rp-plan-demo"><strong>DEMONSTRAÇÃO</strong> Esta é uma simulação do funcionamento do Ronda Pro. As rotas criadas aqui ficam somente neste navegador e não são enviadas para a operação real.</div>':'<p class="rp-plan-info">Configuração operacional. Ao salvar, a rota fica disponível para o vigia vinculado após sincronização.</p>')+
   '<nav class="rp-plan-steps" aria-label="Etapas do cadastro">'+[[1,'Endereços'],[2,'Agendamento'],[3,'Revisão e envio']].map(([n,t])=>'<button type="button" class="'+(step===n?'selected':'')+'" data-action="rp-plan-step" data-step="'+n+'" aria-current="'+(step===n?'step':'false')+'"><b>'+n+'</b><span>'+t+'</span></button>').join('')+'</nav>'+
   '<form id="rp-plan-form" class="rp-plan-layout">'+
   '<div class="rp-plan-left"><section class="rp-plan-panel rp-plan-addresses" data-part="1">'+
   '<h2>Definir os endereços</h2><div class="rp-plan-type"><button type="button" data-action="rp-plan-kind" data-kind="routine" class="'+(kind==='routine'?'selected':'')+'" aria-pressed="'+(kind==='routine')+'"><strong>Ronda de rotina</strong><small>Sequência fixa de endereços</small></button><button type="button" data-action="rp-plan-kind" data-kind="specific" class="'+(kind==='specific'?'selected':'')+'" aria-pressed="'+(kind==='specific')+'"><strong>Ronda específica / aleatória</strong><small>Ronda pontual ou extraordinária</small></button></div>'+
   field('Vigia responsável','<select id="rp-plan-worker" name="userId" required>'+people.map(w=>'<option value="'+escape(w.id)+'" '+(w.id===workerId?'selected':'')+'>'+escape(w.name)+'</option>').join('')+'</select>')+
   field('Nome da rota','<input id="rp-plan-name" name="routeName" maxlength="120" minlength="3" placeholder="Ex.: Ronda do turno noturno" value="'+escape(name)+'" required>')+
   '<label class="rp-plan-field"><span>Adicionar endereço ou empresa</span><input id="rp-plan-query" autocomplete="off" placeholder="Pesquisar empresa, local ou endereço" value="'+escape(query)+'" aria-autocomplete="list" aria-controls="rp-plan-suggestions"></label>'+
   '<div id="rp-plan-suggestions" class="rp-plan-suggestions" role="listbox" aria-label="Endereços encontrados">'+(loading?'<p>Pesquisando locais…</p>':'')+suggestionsHtml()+'</div>'+
   '<div class="rp-plan-stop-head"><h3>Pontos da rota ('+points.length+')</h3>'+(points.length?'<button type="button" data-action="rp-plan-clear">Limpar</button>':'')+'</div>'+
   '<div class="rp-plan-stops">'+(positions||'<p class="rp-plan-empty">Busque e selecione ao menos dois endereços para criar a rota.</p>')+'</div></section></div>'+
   '<div class="rp-plan-right"><section class="rp-plan-panel rp-plan-map-panel" data-part="1"><h2>Visualização da rota</h2><div id="rp-plan-map" class="rp-plan-map" role="img" aria-label="Mapa dos endereços da rota"><span>Adicione endereços para visualizar os pontos.</span></div>'+footer+'</section>'+
   '<section class="rp-plan-panel rp-plan-schedule" data-part="2"><h2>Agendamento</h2><div class="rp-plan-fields">'+field('Horário de início','<input id="rp-plan-hour" type="time" name="hour" value="'+escape(hour)+'" required>')+
   field('Recorrência','<select id="rp-plan-repeat" name="recurrence">'+Object.entries(repeatLabels).map(([key,val])=>'<option value="'+key+'" '+(recurrence===key?'selected':'')+'>'+val+'</option>').join('')+'</select>')+
   (['once','alternate'].includes(recurrence)?field(recurrence==='once'?'Data da ronda':'Data de referência','<input id="rp-plan-date" type="date" name="startDate" value="'+escape(startDate)+'" required>'):'')+'</div>'+
   (recurrence==='weekly'?'<div class="rp-plan-weekdays"><strong>Dias da semana</strong><div>'+week.map((w,i)=>'<label><input type="checkbox" name="weekday" value="'+i+'" '+(weekdays.includes(i)?'checked':'')+'><span aria-label="'+weekLabel[i]+'">'+w+'</span></label>').join('')+'</div></div>':'')+
   '<p class="rp-plan-caption">Ronda específica sem repetição: selecione “Uma vez”. Dias alternados seguem a data de referência.</p></section>'+
   '<section class="rp-plan-panel rp-plan-review" data-part="3"><h2>Resumo e envio</h2>'+summary+
   '<p class="rp-plan-info">'+(getData().demo?'Demonstração local, sem comunicação com vigias reais.':'Disponibilização após sincronização do dispositivo do vigia.')+'</p></section></div>'+
   '<div class="rp-plan-actions"><button type="button" class="rp-plan-secondary" data-action="rp-plan-back" '+(step===1?'disabled':'')+'>Voltar</button><button type="button" class="rp-plan-next" data-action="rp-plan-next" '+(step===3?'hidden':'')+'>Próximo: '+(step===1?'Agendamento':'Revisão')+' →</button><button type="submit" class="rp-plan-save" '+(step!==3?'data-mobile-final="hidden"':'')+' '+(!people.length||saving?'disabled':'')+'>'+(saving?'Salvando…':getData().demo?'Salvar demonstração':'Salvar e disponibilizar ao vigia')+'</button></div></form>'+
   '<section class="rp-plan-saved"><h2>Rotas cadastradas</h2>'+(getData().routes.length?getData().routes.slice(0,5).map(r=>'<div class="rp-plan-saved-row"><strong>'+escape(r.name)+'</strong><small>'+escape(r.workerName||people.find(w=>w.id===r.userId)?.name||'Vigia')+' · '+r.points.length+' endereços</small></div>').join(''):'<p>Nenhuma rota cadastrada.</p>')+'</section></section>';
 }
 function suggestionsHtml(){return suggestions.map((p,i)=>'<button type="button" role="option" data-action="rp-plan-pick" data-index="'+i+'"><strong>'+escape(p.name)+'</strong><small>'+escape(p.address)+'</small></button>').join('');}
 function replaceSuggestions(){const host=document.getElementById('rp-plan-suggestions');if(host)host.innerHTML=(loading?'<p>Pesquisando locais…</p>':'')+suggestionsHtml();}
 function clearMap(){if(map){try{map.remove()}catch{}map=null;}}
 async function mount(){
  const host=document.getElementById('rp-plan-map');if(!host)return;
  const current=++mapSeq;clearMap();
  try{
   const L=await loadLeaflet();if(current!==mapSeq||!host.isConnected)return;
   host.innerHTML='';
   map=L.map(host,{scrollWheelZoom:false,zoomControl:true});
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
   if(points.length){
    const line=points.map(p=>[p.lat,p.lng]);
    L.polyline(line,{weight:4,color:'#38bdf8',dashArray:'7 6'}).addTo(map);
    for(let i=0;i<points.length;i++){
     const p=points[i];
     const marker=L.marker([p.lat,p.lng],{icon:L.divIcon({className:'rp-plan-pin',html:'<span>'+(i+1)+'</span>',iconSize:[31,34],iconAnchor:[15,32]})});
     marker.addTo(map).bindTooltip(escape(p.name));
    }
    points.length===1?map.setView(line[0],15):map.fitBounds(L.latLngBounds(line).pad(.25),{maxZoom:16});
   }else map.setView([-19.92,-43.94],7);
   setTimeout(()=>{if(map&&host.isConnected)map.invalidateSize()},100);
  }catch{if(current===mapSeq&&host.isConnected)host.innerHTML='<span>Mapa temporariamente indisponível. Os endereços permanecem salvos na lista.</span>';}
 }
 function dispose(){lookupSerial++;clearTimeout(lookupTimer);mapSeq++;clearMap();}
 function changed(){afterSave(false);}
 function validCurrentStep(){
  if(step===1){
   if(!watcherList().some(w=>w.id===workerId)){notify('Selecione um vigia de demonstração ou um profissional cadastrado.');return false;}
   if(name.trim().length<3){notify('Informe o nome da rota.');return false;}
   if(points.length<2){notify('Adicione ao menos dois endereços pela pesquisa.');return false;}
  }else if(step===2){
   if(!/^\d{2}:\d{2}$/.test(hour)){notify('Informe o horário.');return false;}
   if(['once','alternate'].includes(recurrence)&&!startDate){notify('Informe a data para este agendamento.');return false;}
   if(recurrence==='weekly'&&!weekdays.length){notify('Selecione pelo menos um dia da semana.');return false;}
  }
  return true;
 }
 async function click(el){
  const act=el.dataset.action;if(!act?.startsWith('rp-plan-'))return false;
  if(act==='rp-plan-pick'){const p=suggestions[Number(el.dataset.index)];if(p&&points.length<30&&safePoint(p)){points.push(p);query='';suggestions=[];changed();}else notify('Limite de 30 pontos por rota.');return true;}
  if(act==='rp-plan-kind'){kind=el.dataset.kind==='specific'?'specific':'routine';changed();return true;}
  if(act==='rp-plan-remove'){points.splice(Number(el.dataset.index),1);changed();return true;}
  if(act==='rp-plan-clear'){points=[];changed();return true;}
  if(act==='rp-plan-up'||act==='rp-plan-down'){const from=Number(el.dataset.index),to=from+(act==='rp-plan-up'?-1:1);if(from>=0&&to>=0&&to<points.length)[points[from],points[to]]=[points[to],points[from]];changed();return true;}
  if(act==='rp-plan-step'){const target=Number(el.dataset.step);if(target>=1&&target<=3&&(target<=step||validCurrentStep())){step=target;changed();}return true;}
  if(act==='rp-plan-next'){if(validCurrentStep()){step=Math.min(3,step+1);changed();}return true;}
  if(act==='rp-plan-back'){step=Math.max(1,step-1);changed();return true;}
  return true;
 }
 function change(el){
  if(el.id==='rp-plan-worker'){workerId=el.value;return true;}
  if(el.id==='rp-plan-name'){name=el.value;return true;}
  if(el.id==='rp-plan-hour'){hour=el.value;return true;}
  if(el.id==='rp-plan-date'){startDate=el.value;return true;}
  if(el.id==='rp-plan-repeat'){recurrence=el.value;changed();return true;}
  if(el.matches('#rp-plan input[name="weekday"]')){weekdays=[...document.querySelectorAll('#rp-plan input[name="weekday"]:checked')].map(el=>Number(el.value));return true;}
  return false;
 }
 function input(el){
  if(el.id==='rp-plan-name'){name=el.value;return true;}
  if(el.id!=='rp-plan-query')return false;
  query=el.value;const serial=++lookupSerial;clearTimeout(lookupTimer);suggestions=[];
  loading=query.trim().length>=3;replaceSuggestions();
  if(!loading)return true;
  lookupTimer=setTimeout(async()=>{
   try{
    const url='https://photon.komoot.io/api/?limit=6&lang=pt&q='+encodeURIComponent(query.trim());
    const response=await fetch(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(9000)});
    if(!response.ok)throw Error('Pesquisa indisponível');
    const data=await response.json();if(serial!==lookupSerial)return;
    suggestions=(data.features||[]).map(f=>{
     const p=f.properties||{},c=f.geometry?.coordinates||[];
     const label=[p.name,p.street,p.housenumber,p.city,p.state].filter(Boolean).join(', ');
     return {name:String(p.name||p.street||'Local').slice(0,100),address:label||'Endereço identificado no mapa',lat:Number(c[1]),lng:Number(c[0])};
    }).filter(safePoint);
   }catch{if(serial===lookupSerial){suggestions=[];notify('A busca de endereços está indisponível. Confira sua conexão e tente novamente.');}}
   if(serial===lookupSerial){loading=false;replaceSuggestions();}
  },650);
  return true;
 }
 async function submit(form){
  if(form.id!=='rp-plan-form')return false;
  if(saving)return true;
  if(![1,2].every(n=>{const old=step;step=n;const ok=validCurrentStep();step=old;return ok;}))return true;
  saving=true;
  try{
   const payload={userId:workerId,name:name.trim(),points:points.map(({name,lat,lng,address})=>({name,address,lat,lng})),schedule:{kind,recurrence,hour,startDate,weekdays}};
   await api('/routes',{method:'POST',data:payload});
   notify(getData().demo?'Rota fictícia salva neste navegador. Escolha o Vigia para conferir.':'Rota salva. Ela ficará disponível ao vigia após a próxima sincronização.');
   step=1;points=[];name='';query='';suggestions=[];
   await afterSave(true);
  }catch(err){notify(err.message||'Não foi possível salvar a rota.');}
  finally{saving=false;await afterSave(false);}
  return true;
 }
 return {html,mount,dispose,click,change,input,submit};
}