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
export function inspectionCockpit({queue=[],mapId,mode='real',position=null,base=null,gpsActive=false,fullTitle='Minhas vistorias'}={}){
 const current=queue[0]||null,coords=pointOf(current),p=pointOf(position),
  distance=coords&&p?Math.round(metersBetween(coords,p)):null;
 const action=current?started(current)?arrived(current)?
  ('<button type="button" class="rp-inspection-main-action" '+(mode==='demo'?'data-action="demo-wizard-open"':'data-wizard-open')+'>Estou aqui · Abrir checklist</button>'):
  '<button type="button" class="primary rp-inspection-main-action" '+(mode==='demo'?'data-action="demo-inspection-arrive"':'data-inspection-arrive')+'>Estou aqui</button>':
  '<button type="button" class="primary rp-inspection-main-action" '+(mode==='demo'?'data-action="demo-inspection-depart"':'data-inspection-depart')+'>Sair da base · iniciar deslocamento</button>':
  '<span class="rp-inspection-ready">Nenhuma vistoria pendente</span>';
 const first=html(current?.address||current?.site||'Aguardando solicitação do COI');
 const directions=current?coords?
  'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(coords.lat+','+coords.lng):
  'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(current.address||current.site||''):'';
 return '<div class="patrol-workspace rp-inspection-cockpit" data-inspection-cockpit data-mode="'+mode+'">'+
 '<section class="patrol-map-panel rp-inspection-map-panel" aria-label="Mapa operacional de vistorias">'+
  '<header class="patrol-map-heading"><div class="patrol-map-heading-copy"><strong>'+html(fullTitle)+'</strong><small><span data-inspection-queue-count>'+queue.length+'</span> destino(s) · Circuito determinado pelo COI</small></div>'+
  '<button type="button" class="rp-inspection-map-fit" '+(mode==='demo'?'data-action="demo-inspection-fit"':'data-inspection-fit')+' aria-label="Enquadrar todos os destinos">⌖</button></header>'+
  '<div class="patrol-map-canvas rp-inspection-map-canvas"><div id="'+html(mapId)+'" class="map-container mini rp-inspector-map" role="application" aria-label="Mesmo mapa de rondas adaptado às vistorias"></div>'+
  '<div class="rp-inspection-map-hud"><span class="rp-inspection-hud-label">'+(current?started(current)?arrived(current)?'● NO DESTINO':'● EM DESLOCAMENTO':'● NOVA VISTORIA':'● SEM VISTORIAS')+'</span><strong data-inspection-current-title>'+first+'</strong><small data-inspection-distance>'+(distance!==null?'Distância em linha reta: '+(distance>=1000?(distance/1000).toFixed(1)+' km':distance+' m'):'Localização ou destino sem coordenadas')+'</small></div></div>'+
  '<div class="patrol-map-footer"><span data-inspection-gps-state>'+ (gpsActive?'GPS acompanhando':'GPS não iniciado')+'</span><span data-inspection-road-state>Preparando percurso…</span></div>'+
 '</section>'+
 '<section class="patrol-actions rp-inspection-commands" aria-label="Próximo atendimento">'+
  '<div class="rp-field-quicktools" role="group" aria-label="Ferramentas de campo">'+
   '<button type="button" data-field-tool-torch>Lanterna</button>'+
   '<button type="button" class="rp-urgent" data-field-tool-panic>Pânico</button>'+
   '<button type="button" data-field-tool-alert>Alerta</button>'+
   '<button type="button" data-field-tool-incident>Ocorrência</button>'+
   '<button type="button" data-field-tool-chat>Mensagens</button>'+
  '</div>'+
  '<div class="patrol-action-heading"><strong>PRÓXIMO DESTINO · <span data-inspection-current-count>'+(queue.length?'1 de '+queue.length:'Sem tarefas')+'</span></strong></div>'+
  '<div class="rp-inspection-commands-body"><p data-inspection-instructions>'+html(current?.instructions||current?.reason||'O COI enviará os locais que precisam de vistoria.')+'</p>'+
  '<div class="rp-inspection-primary-actions">'+action+
  (current?'<a class="rp-inspection-navigate" target="_blank" rel="noopener noreferrer" href="'+html(directions)+'">Navegar pelas ruas ↗</a>':'')+'</div></div>'+
  '<details class="rp-inspection-upcoming"><summary>Ver circuito e próximas vistorias <span>'+queue.length+'</span></summary><ol data-inspection-stops>'+inspectionStops(queue)+'</ol><small>A próxima visita é sugerida por distância geográfica, não pelo trânsito. O destino iniciado permanece primeiro.</small></details>'+
 '</section></div>';
}
