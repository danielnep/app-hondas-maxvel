import {metersBetween,pointOf} from './inspection-queue.js';
export const GUARD_RADIUS_METERS=35,GUARD_DWELL_MS=30000;
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function buildGuardRoute(route,base){
 const points=(route?.points||[]).map((p,i)=>{const q=pointOf(p);return q?{...q,id:'point-'+i,name:p.name||'Ponto '+(i+1),instruction:'Verificar o ponto.',radius:GUARD_RADIUS_METERS}:null}).filter(Boolean);
 const knownBase=pointOf(base),origin=knownBase||pointOf(points[0]);if(!origin||!points.length)return null;
 return {id:route.id,name:route.name||'Ronda de campo',unit:route.site||'Posto',roadRouting:true,baseKnown:!!knownBase,base:{...origin,id:'base',name:knownBase?'Base de partida':'Aguardando GPS da base'},points};
}
export function nextGuardState(st,fix,{at=Date.now(),action='tick'}={}){
 if(!st||!st.startedAt||st.completedAt)return {state:st,ready:false,inside:false,elapsed:0};
 const current=st.points[st.index],focus=pointOf(current)||pointOf(st.base),distance=metersBetween(fix,focus);
 const fresh=Number.isFinite(fix?.at)&&at-fix.at>=-5000&&at-fix.at<=12000;
 const inside=fresh&&Number.isFinite(distance)&&Number.isFinite(fix?.accuracy)&&fix.accuracy<=GUARD_RADIUS_METERS&&distance<=GUARD_RADIUS_METERS;
 let insideSince=st.insideSince??null;if(!inside)insideSince=null;
 if(action==='arrive'&&inside&&current)insideSince=at;
 const elapsed=insideSince==null?0:Math.max(0,at-insideSince);
 return {state:{...st,insideSince},ready:!!current&&inside&&insideSince!=null&&elapsed>=GUARD_DWELL_MS,inside,elapsed,distance};
}
export function markGuardPoint(st,at=Date.now()){
 if(!st||st.index>=st.points.length)throw Error('Ronda sem próximo ponto');
 return {...st,index:st.index+1,insideSince:null,checkpoints:[...(st.checkpoints||[]),{index:st.index,at}]};
}
export function initialGuardState(route,base,at=Date.now()){
 if(!route?.points?.length||!pointOf(base))throw Error('Rota ou base GPS indisponível');
 return {id:globalThis.crypto?.randomUUID?.()||String(at)+'-round',routeId:route.id,routeName:route.name,
  base:pointOf(base),points:route.points.map(p=>({...p})),index:0,startedAt:at,checkpoints:[],insideSince:null,completedAt:null};
}
export function guardCockpit({round=null,planned=null,position=null,gpsStatus='Aguardando sinal GPS'}={}){
 const current=round?.points?.[round.index]||null,total=round?.points?.length||planned?.points?.length||0;
 const focus=current||round?.base||null,d=focus&&position?metersBetween(position,focus):Infinity;
 const action=!planned?'<span class="rp-inspection-ready">Aguardando rota do COI</span>':
 !round&&!planned.points?.length?'<span class="rp-inspection-ready">Aguardando localização geográfica do destino pelo COI</span>':
 !round?'<button type="button" class="rp-inspection-main-action" data-guard-start>Iniciar ronda · sair da base</button>':
 current?round.insideSince==null?'<button type="button" class="rp-inspection-main-action" data-guard-arrive>Estou aqui</button>':
 '<button type="button" class="rp-inspection-main-action" data-guard-checkpoint>Confirmar ponto após 30 segundos</button>':
 '<button type="button" class="rp-inspection-main-action" data-guard-finish>Cheguei à base · concluir ronda</button>';
 return '<div class="patrol-workspace rp-inspection-cockpit rp-guard-cockpit" data-guard-cockpit data-plan-id="'+safe(round?.routeId||planned?.id||'')+'">'+
 '<section class="patrol-map-panel rp-inspection-map-panel"><header class="patrol-map-heading"><div class="patrol-map-heading-copy"><strong>'+safe(round?.routeName||planned?.name||'Minha ronda')+'</strong><small>Ronda · '+(round?.index||0)+' de '+total+' pontos</small></div><button type="button" class="rp-inspection-map-fit" data-guard-fit aria-label="Enquadrar percurso">⌖</button></header>'+
 '<div class="patrol-map-canvas rp-inspection-map-canvas"><div class="map-container mini rp-inspector-map" id="guard-real-map" aria-label="Mapa da ronda em operação real"></div>'+
 '</div>'+
 '<div class="patrol-map-footer"><span data-guard-gps>'+safe(gpsStatus)+'</span><span data-guard-road>Traçado viário disponível com internet</span></div></section>'+
 '<section class="patrol-actions rp-inspection-commands rp-guard-quick-panel'+(!planned?' has-no-route':'')+'" data-guard-panel aria-label="Comandos da ronda">'+
 '<div class="patrol-action-heading rp-guard-panel-heading"><button type="button" class="rp-guard-panel-toggle" data-guard-panel-toggle aria-controls="rp-guard-panel-content" aria-expanded="true" aria-label="Recolher ou expandir controles da ronda"><span><strong>'+(current?'Ponto '+(round.index+1)+' de '+total:round?'Retorno à base':planned?'Ronda preparada':'Aguardando rota')+'</strong><small data-guard-panel-hint>Recolhe em 8 s</small></span><span class="rp-guard-panel-chevron" aria-hidden="true">⌄</span></button></div>'+
 '<div class="rp-guard-panel-content" id="rp-guard-panel-content" data-guard-panel-content>'+
 '<div class="rp-field-quicktools"><button type="button" data-field-tool-torch>Lanterna</button><button type="button" data-field-tool-alert>Alerta</button><button type="button" data-field-tool-incident>Ocorrência</button></div>'+
 '<div class="rp-inspection-commands-body"><strong class="rp-inspection-destination">'+safe(current?.name||(!planned?'Aguardando rota do COI':!round?'Ronda pronta para iniciar':'Retorne à base'))+'</strong><p data-guard-timer>'+ (!planned?'Você será avisado quando receber o percurso.':(round&&round.insideSince!=null?'Permanência em verificação. Aguarde 30 segundos.':'Siga para o próximo ponto indicado no mapa.'))+'</p><small data-guard-distance '+(!planned?'hidden':'')+'>'+safe(Number.isFinite(d)?'Distância '+(current?'ao ponto':'à base')+': '+Math.round(d)+' m':'Aguardando GPS real')+'</small><div class="rp-inspection-primary-actions">'+action+'</div></div>'+
 '<details class="rp-inspection-upcoming"><summary>Ver pontos da ronda <span>'+total+'</span></summary><ol data-guard-stops>'+
 (round?.points||planned?.points||[]).map((p,i)=>'<li class="rp-inspection-stop '+(i===(round?.index||0)?'is-next':'')+'"><span class="rp-stop-order">'+(round&&i<round.index?'✓':i+1)+'</span><div><strong>'+safe(p.name)+'</strong><small>'+safe(i<(round?.index||0)?'Concluído':'Aguardando verificação')+'</small></div></li>').join('')+
 '</ol></details></div></section></div>';
}

/** Um único painel de ronda: recolhe por inatividade e conserva o pânico visível. */
let guardPanelTimer=null,guardPanelActive=null;
export function mountGuardQuickPanel(root){
 const panel=root?.querySelector?.('[data-guard-panel]');
 if(guardPanelActive!==panel){clearTimeout(guardPanelTimer);guardPanelActive=panel;}
 if(!panel||panel.dataset.guardPanelReady)return;
 panel.dataset.guardPanelReady='true';
 const button=panel.querySelector('[data-guard-panel-toggle]');
 const content=panel.querySelector('[data-guard-panel-content]');
 const hint=panel.querySelector('[data-guard-panel-hint]');
 if(!button||!content)return;
 const collapse=collapsed=>{
  if(collapsed&&panel.contains(document.activeElement)&&document.activeElement!==button)button.focus({preventScroll:true});
  panel.classList.toggle('is-collapsed',collapsed);
  content.hidden=collapsed;
  button.setAttribute('aria-expanded',String(!collapsed));
  if(hint)hint.textContent=collapsed?'Toque para reabrir':'Recolhe em 8 s';
 };
 const schedule=()=>{
  clearTimeout(guardPanelTimer);
  if(panel.classList.contains('is-collapsed'))return;
  guardPanelTimer=setTimeout(()=>{
   if(!panel.isConnected)return;
   if((panel.contains(document.activeElement)&&document.activeElement!==button)||panel.querySelector('details[open]')||document.querySelector('dialog[open]')){schedule();return;}
   collapse(true);
  },8000);
 };
 button.addEventListener('click',()=>{const next=!panel.classList.contains('is-collapsed');collapse(next);if(!next)schedule();else clearTimeout(guardPanelTimer);});
 for(const type of ['pointerdown','keydown','focusin','scroll'])panel.addEventListener(type,()=>{if(!panel.classList.contains('is-collapsed'))schedule();},{passive:true});
 schedule();
}
