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
 const action=!planned?'<span class="rp-inspection-ready">Aguardando rota atribuída pelo COE</span>':
 !round?'<button type="button" class="rp-inspection-main-action" data-guard-start>Iniciar ronda · sair da base</button>':
 current?round.insideSince==null?'<button type="button" class="rp-inspection-main-action" data-guard-arrive>Estou aqui</button>':
 '<button type="button" class="rp-inspection-main-action" data-guard-checkpoint>Confirmar ponto após 30 segundos</button>':
 '<button type="button" class="rp-inspection-main-action" data-guard-finish>Cheguei à base · concluir ronda</button>';
 const status=!round?'● RONDA PREPARADA':current?'● PONTO '+(round.index+1):'● RETORNO À BASE';
 return '<div class="patrol-workspace rp-inspection-cockpit rp-guard-cockpit" data-guard-cockpit>'+
 '<section class="patrol-map-panel rp-inspection-map-panel"><header class="patrol-map-heading"><div class="patrol-map-heading-copy"><strong>'+safe(round?.routeName||planned?.name||'Minha ronda')+'</strong><small>Ronda · '+(round?.index||0)+' de '+total+' pontos</small></div><button type="button" class="rp-inspection-map-fit" data-guard-fit aria-label="Enquadrar percurso">⌖</button></header>'+
 '<div class="patrol-map-canvas rp-inspection-map-canvas"><div class="map-container mini rp-inspector-map" id="guard-real-map" aria-label="Mapa da ronda em operação real"></div>'+
 '<div class="rp-inspection-map-hud"><span class="rp-inspection-hud-label">'+status+'</span><strong>'+safe(current?.name||(!round?'Rota pronta para partida':'Volte à base'))+'</strong><small data-guard-distance>'+
 (Number.isFinite(d)?'Distância '+(current?'ao ponto':'à base')+': '+Math.round(d)+' m':'Aguardando GPS real')+'</small></div></div>'+
 '<div class="patrol-map-footer"><span data-guard-gps>'+safe(gpsStatus)+'</span><span data-guard-road>Traçado viário disponível com internet</span></div></section>'+
 '<section class="patrol-actions rp-inspection-commands" aria-label="Comandos da ronda">'+
 '<div class="rp-field-quicktools"><button type="button" data-field-tool-torch>Lanterna</button><button type="button" class="rp-urgent" data-field-tool-panic>Pânico</button><button type="button" data-field-tool-alert>Alerta</button><button type="button" data-field-tool-incident>Ocorrência</button><button type="button" data-field-tool-chat>Mensagens</button></div>'+
 '<div class="patrol-action-heading"><strong>'+(current?'PONTO '+(round.index+1)+' DE '+total:'PRÓXIMA RONDA')+'</strong></div>'+
 '<div class="rp-inspection-commands-body"><p data-guard-timer>'+(round&&round.insideSince!=null?'Permanência em verificação. Aguarde 30 segundos.':'Siga para o próximo ponto indicado no mapa.')+'</p><div class="rp-inspection-primary-actions">'+action+'</div></div>'+
 '<details class="rp-inspection-upcoming"><summary>Ver pontos da ronda <span>'+total+'</span></summary><ol data-guard-stops>'+
 (round?.points||planned?.points||[]).map((p,i)=>'<li class="rp-inspection-stop '+(i===(round?.index||0)?'is-next':'')+'"><span class="rp-stop-order">'+(round&&i<round.index?'✓':i+1)+'</span><div><strong>'+safe(p.name)+'</strong><small>'+safe(i<(round?.index||0)?'Concluído':'Aguardando verificação')+'</small></div></li>').join('')+
 '</ol></details></section></div>';
}
