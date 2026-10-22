import {metersBetween,pointOf} from './inspection-queue.js';
const html=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const started=item=>!!(item?.started_at||item?.startedAt);
const arrived=item=>!!(item?.arrived_at||item?.arrivedAt);
export function inspectionStops(queue=[]){
 return queue.length?queue.map((task,i)=>{
  const coords=pointOf(task),label=task.address||task.site||'Vistoria sem endereço';
  const status=arrived(task)?'No local':started(task)?'Em deslocamento':!coords?'Sem coordenadas':'Aguardando';
  return '<li class="rp-inspection-stop '+(i===0?'is-next':'')+'"><span class="rp-stop-order">'+(i+1)+'</span><div><strong>'+html(label)+'</strong><small>'+html(status)+' · '+html(task.reason||task.instructions||'Verificar local')+'</small></div>'+(i===0?'<span class="rp-stop-next">ATUAL</span>':'')+'</li>';
 }).join(''):'<li class="rp-inspection-stop rp-inspection-stop-empty">Aguardando nova solicitação do COI.</li>';
}

const icons={
 alert:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5m0 3h.01"/>',
 incident:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h6"/>',
 chat:'<path d="M4 5h16v12H9l-5 4V5Z"/><path d="M8 9h8M8 13h5"/>',
 panic:'<circle cx="12" cy="12" r="9"/><path d="M12 7v7m0 4h.01"/>',
 help:'<circle cx="12" cy="12" r="10"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4h.01"/>',
 locate:'<circle cx="12" cy="12" r="7"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
 torch:'<path d="M9 2h6l1 5-4 4-4-4 1-5Z"/><path d="M10 11v10m4-10v10M7 22h10"/>',
 arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>'
};
const svg=key=>'<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[key]+'</svg>';
export function inspectionCockpit({queue=[],mapId,mode='real',position=null,base=null,gpsActive=false,fullTitle='Minhas vistorias'}={}){
 const current=queue[0]||null,coords=pointOf(current),p=pointOf(position),
  distance=coords&&p?Math.round(metersBetween(coords,p)):null;
 const round=current&&(current.taskKind==='ronda'||current.kind==='ronda');
 const step=mode==='live'&&round?(started(current)?'Ronda em andamento':'Ronda preparada'):current?started(current)?arrived(current)?'No destino':'Em deslocamento':'Vistoria preparada':'Aguardando COI';
 const liveAction=kind=>'data-action="live-inspection-'+kind+'" data-id="'+html(current?.id)+'"';
 const action=mode==='live'&&round?started(current)?
  '<button type="button" class="rp-inspection-main-action" data-action="inspector-round-finish" data-id="'+html(current.id)+'">Finalizar ronda '+svg('arrow')+'</button>':
  '<button type="button" class="primary rp-inspection-main-action" '+liveAction('start')+'>Iniciar ronda '+svg('arrow')+'</button>':current?started(current)?arrived(current)?
  '<button type="button" class="rp-inspection-main-action" '+(mode==='demo'?'data-action="demo-wizard-open"':mode==='live'?liveAction('report'):'data-wizard-open')+'>'+(mode==='live'?'Registrar vistoria':'Abrir checklist')+' '+svg('arrow')+'</button>':
  '<button type="button" class="primary rp-inspection-main-action" '+(mode==='demo'?'data-action="demo-inspection-arrive"':mode==='live'?liveAction('arrive'):'data-inspection-arrive')+'>Confirmar chegada '+svg('arrow')+'</button>':
  '<button type="button" class="primary rp-inspection-main-action" '+(mode==='demo'?'data-action="demo-inspection-depart"':mode==='live'?liveAction('start'):'data-inspection-depart')+'>Iniciar deslocamento '+svg('arrow')+'</button>':
  '';
 const first=html(current?.address||current?.site||'Sem destinos atribuídos');
 const destination=coords?coords.lat+','+coords.lng:String(current?.address||current?.site||'');
 const directions=current?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination):'';
 const waze=current?'https://www.waze.com/ul?'+(coords?'ll=':'q=')+encodeURIComponent(destination)+'&navigate=yes':'';
 const count=queue.length;
 return '<div class="patrol-workspace rp-inspection-cockpit '+(current?'has-destination':'is-idle')+'" data-inspection-cockpit data-mode="'+mode+'">'+
 '<section class="patrol-map-panel rp-inspection-map-panel" aria-label="Mapa operacional de vistorias">'+
  '<div class="patrol-map-canvas rp-inspection-map-canvas">'+
   '<div id="'+html(mapId)+'" class="map-container mini rp-inspector-map" role="application" aria-label="Mapa de ruas e trajeto de vistorias do COI"></div>'+
   '<header class="patrol-map-heading rp-inspection-route-bar"><div class="patrol-map-heading-copy"><strong>'+html(current?current.routeName||current.route_name||'Circuito de vistorias · COI':fullTitle)+'</strong><small><span data-inspection-queue-count>'+count+'</span> destino(s) · '+html(current?'Próximo: '+(current.address||current.site||'Local designado'):'Aguardando COI')+'</small></div>'+
    '<button type="button" class="rp-inspection-map-fit" '+(mode==='demo'?'data-action="demo-inspection-fit"':mode==='live'?'data-action="center-maps"':'data-inspection-fit')+' aria-label="Enquadrar destinos">'+svg('locate')+'</button></header>'+
   '<div class="rp-inspection-map-controls"><button type="button" class="rp-inspection-panic" data-field-tool-panic aria-label="Acionar pânico">'+svg('panic')+'<span>PÂNICO</span></button>'+
    '<button type="button" class="rp-inspection-help" data-inspection-help-open aria-label="Ajuda do mapa">'+svg('help')+'</button></div>'+
   '<button type="button" class="rp-inspection-torch" data-field-tool-torch aria-label="Ligar ou desligar lanterna">'+svg('torch')+'<span>Lanterna</span></button>'+
   '<nav class="rp-inspection-map-actions" aria-label="Comunicação de campo">'+
    '<button type="button" data-field-tool-alert>'+svg('alert')+'<span>Enviar alerta</span></button>'+
    '<button type="button" data-field-tool-incident>'+svg('incident')+'<span>Registrar<br>ocorrência</span></button>'+
    
   '</nav>'+
  '</div>'+
  '<div class="patrol-map-footer rp-inspection-status-readout" aria-live="polite"><span data-inspection-gps-state>'+(gpsActive?'GPS acompanhando':'GPS não iniciado')+'</span><span data-inspection-road-state>Preparando percurso…</span></div>'+
 '</section>'+
 '<section class="patrol-actions rp-inspection-commands" aria-label="Próximo atendimento">'+
  '<div class="rp-inspection-sheet-heading"><div><span class="rp-inspection-sheet-indicator" aria-hidden="true">'+svg('locate')+'</span><strong>'+html(step)+'</strong></div><button type="button" data-inspection-circuit-open>Mais opções</button></div>'+
  '<div class="rp-inspection-commands-body"><span class="rp-inspection-step-label">PRÓXIMO DESTINO · <span data-inspection-current-count>'+(count?'1 de '+count:'Nenhum')+'</span></span>'+
   '<strong class="rp-inspection-destination" data-inspection-current-title>'+first+'</strong>'+
   '<p class="rp-inspection-instruction" data-inspection-instructions>'+html(current?.instructions||current?.reason||'O COI enviará os locais que precisam de vistoria.')+'</p>'+
   '<small class="rp-inspection-distance" data-inspection-distance>'+(distance!==null?'Distância em linha reta: '+(distance>=1000?(distance/1000).toFixed(1)+' km':distance+' m'):'Localização ou destino sem coordenadas')+'</small>'+
   '<div class="rp-inspection-primary-actions">'+action+
   (current?'<nav class="rp-inspection-directions" aria-label="Abrir destino em aplicativo de navegação">'+
   '<a class="rp-inspection-navigate" target="_blank" rel="noopener noreferrer" href="'+html(directions)+'" aria-label="Abrir destino no Google Maps">Google Maps ↗</a>'+
   '<a class="rp-inspection-navigate" target="_blank" rel="noopener noreferrer" href="'+html(waze)+'" aria-label="Abrir destino no Waze">Waze ↗</a></nav>':'')+'</div>'+
  (mode==='live'?'<nav class="rp-inspector-create-actions" aria-label="Criar atividades"><button type="button" data-action="inspector-create" data-task-kind="inspection">+ Nova vistoria</button><button type="button" data-action="inspector-create" data-task-kind="ronda">+ Nova ronda</button><button type="button" data-action="inspector-history-all">Histórico</button></nav>':'')+
  '</div>'+
 '</section>'+
 '<dialog class="rp-inspection-dialog" data-inspection-circuit-modal aria-label="Circuito e próximas vistorias">'+
  '<header><div><small>CIRCUITO DO COI</small><h2>Próximas vistorias</h2></div><button type="button" data-inspection-modal-close aria-label="Fechar janela">✕</button></header>'+
  '<ol class="rp-inspection-upcoming" data-inspection-stops>'+inspectionStops(queue)+'</ol>'+
  '<p class="rp-inspection-dialog-note">A ordem sugerida considera proximidade geográfica; o trânsito pode exigir outro percurso.</p>'+
  '<button type="button" class="rp-inspection-dialog-history" data-inspection-history-open>'+svg('incident')+' Histórico de vistorias</button>'+
 '</dialog>'+
 '<dialog class="rp-inspection-dialog rp-inspection-help-dialog" data-inspection-help-dialog aria-label="Ajuda do mapa">'+
  '<header><h2>Mapa operacional</h2><button type="button" data-inspection-modal-close aria-label="Fechar janela">✕</button></header>'+
  '<p>O mapa acompanha sua localização quando o GPS está ativo. Os marcadores indicam os destinos definidos pelo COI.</p>'+
  '<p>Use Google Maps ou Waze para abrir o trajeto nas vias públicas. Para iniciar ou concluir uma vistoria, utilize o botão do painel inferior.</p>'+
 '</dialog>'+
 '</div>';
}
// Controles compartilhados entre o modo demonstrativo e a operação autenticada.
if(typeof document!=='undefined')document.addEventListener('click',event=>{
 const control=event.target.closest('[data-inspection-circuit-open],[data-inspection-history-open],[data-inspection-help-open],[data-inspection-modal-close]');
 if(!control)return;
 const cockpit=control.closest('[data-inspection-cockpit]'),scope=cockpit||document;
 if(control.hasAttribute('data-inspection-circuit-open')){
  scope.querySelector('[data-inspection-circuit-modal]')?.showModal();
 }else if(control.hasAttribute('data-inspection-help-open')){
  scope.querySelector('[data-inspection-help-dialog]')?.showModal();
 }else if(control.hasAttribute('data-inspection-history-open')){
  document.querySelector('[data-inspection-circuit-modal][open]')?.close();
  document.querySelector('[data-inspection-history-dialog]')?.showModal();
 }else if(control.hasAttribute('data-inspection-modal-close')){
  control.closest('dialog')?.close();
 }
});
