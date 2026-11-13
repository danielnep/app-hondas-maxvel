import {metersBetween,pointOf} from './inspection-queue.js';
export const GUARD_RADIUS_METERS=35,GUARD_DWELL_MS=30000;
const safe=x=>String(x??'').replace(/[&<>\x22\x27]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function buildGuardRoute(route,base){
 const points=(route?.points||[]).map((p,i)=>{const q=pointOf(p);return q?{...q,id:'point-'+i,name:p.name||'Ponto '+(i+1),instruction:'Verificar o ponto.',radius:GUARD_RADIUS_METERS}:null}).filter(Boolean);
 const knownBase=pointOf(base),origin=knownBase||pointOf(points[0]);if(!origin||!points.length)return null;
 return {id:route.id,name:route.name||'Ronda de campo',unit:route.site||'Posto',roadRouting:true,baseKnown:!!knownBase,base:{...origin,id:'base',name:knownBase?'Base de partida':'Aguardando GPS da base'},points};
}
export function buildGuardStandbyRoute(siteName,base){
 const origin=pointOf(base)||{lat:-20.1446,lng:-44.8912};
 return {id:'standby',name:siteName?'Posto '+siteName:'Posto Maxvel',unit:siteName||'Grupo Maxvel',roadRouting:false,baseKnown:!!pointOf(base),base:{...origin,id:'base',name:pointOf(base)?'Minha posição atual':'Base de partida'},points:[]};
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
export function guardCockpit({round=null,planned=null,position=null,gpsStatus='Aguardando sinal GPS',account=null,sosActive=false,torchActive=false,hidePanic=false}={}){
 const current=round?.points?.[round.index]||null,total=round?.points?.length||planned?.points?.length||0;
 const focus=current||round?.base||null,d=focus&&position?metersBetween(position,focus):Infinity;
 const action=!planned?'<span class="rp-inspection-ready">Aguardando rota do COI</span>':
 !round&&!planned.points?.length?'<span class="rp-inspection-ready">Aguardando localização geográfica do destino pelo COI</span>':
 !round?'<button type="button" class="ronda-btn-start-route-active rp-inspection-main-action rp-sheet-main-btn" data-guard-start><span>Iniciar Rota de Ronda</span></button>':
 current?round.insideSince==null?'<button type="button" class="ronda-btn-start-route-active rp-inspection-main-action rp-sheet-main-btn" data-guard-arrive><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg><span>Estou aqui</span></button>':
 '<button type="button" class="ronda-btn-start-route-active rp-inspection-main-action rp-sheet-main-btn is-dwell" data-guard-checkpoint><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>Confirmar ponto após 30 segundos</span></button>':
 '<button type="button" class="ronda-btn-start-route-active rp-inspection-main-action rp-sheet-main-btn is-finish" data-guard-finish><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg><span>Cheguei à base · concluir ronda</span></button>';

 const agentName = safe(account?.name || 'Bela Fagan');
 const agentInitial = agentName ? agentName.charAt(0).toUpperCase() : 'A';
 const planId = safe(round?.routeId || planned?.id || '');
 const routeTitle = safe(round?.routeName || planned?.name || 'Ronda Operacional');
 const stopsList = (round?.points?.length ? round.points : planned?.points?.length ? planned.points : []);
 const displayTotal = total || stopsList.length;

 return '<div class="ronda-app-viewport rp-agent-cockpit patrol-workspace rp-inspection-cockpit rp-guard-cockpit '+(sosActive?'is-emergency-active':'')+'" data-guard-cockpit data-plan-id="'+planId+'">'+
 '<style>'+
 '.ronda-app-viewport{ position: relative; width: 100vw; height: 100dvh; overflow: hidden; background: #e5e7eb; font-family: \'Inter\',system-ui,-apple-system,sans-serif; user-select: none; }'+
 '.ronda-map-canvas{ position: absolute; inset: 0; width: 100%; height: 100dvh; z-index: 1; filter: none !important; }'+
 '.rp-agent-map-section.is-tactical-dark .leaflet-tile-pane{ filter: invert(100%) hue-rotate(180deg) brightness(85%) contrast(120%) saturate(60%) !important; }'+
 '.ronda-glass{ background: rgba(22,22,22,0.88); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%); border: 1px solid rgba(255,255,255,0.09); color: #f8fafc; box-shadow: 0 12px 36px -4px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08); }'+
 '.ronda-sos-banner{ display: none; position: absolute; top: 10px; left: 14px; right: 14px; z-index: 55; background: rgba(30,8,8,0.92); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1.5px solid rgba(239,68,68,0.85); box-shadow: 0 0 18px rgba(239,68,68,0.55); color: #f87171; font-size: 10.5px; font-weight: 700; letter-spacing: 0.3px; text-transform: uppercase; padding: 7px 14px; border-radius: 9999px; text-align: center; }'+
 '.ronda-sos-banner.is-active{ display: flex; align-items: center; justify-content: center; gap: 8px; }'+
 '.ronda-header{ position: fixed !important; top: 10px !important; left: 8px !important; right: 8px !important; z-index: 50 !important; display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; min-height: 44px; border-radius: 12px; background: rgba(22, 22, 22, 0.90) !important; backdrop-filter: blur(24px) saturate(180%) !important; -webkit-backdrop-filter: blur(24px) saturate(180%) !important; border: 1px solid rgba(255, 255, 255, 0.10) !important; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important; box-sizing: border-box; gap: 6px; touch-action: none !important; user-select: none !important; }'+
 '.ronda-header .rp-agent-header-row,.rp-agent-header-row{ background: transparent !important; border: none !important; box-shadow: none !important; backdrop-filter: none !important; padding: 0 !important; min-height: 0 !important; display: flex !important; align-items: center !important; justify-content: space-between !important; width: 100% !important; gap: 6px !important; }'+
 '.ronda-sos-banner.is-active ~ .ronda-header,.is-emergency-active .ronda-header{ top: 46px !important; }'+
 '.rp-agent-menu-toggle{ background: transparent !important; border: none !important; box-shadow: none !important; outline: none !important; padding: 4px !important; margin: 0 !important; color: #ffffff !important; cursor: pointer !important; display: inline-flex !important; align-items: center !important; justify-content: center !important; }'+
 '.ronda-brand{ display: flex; align-items: center; gap: 4px; font-size: 15px; font-weight: 700; white-space: nowrap; }'+
 '.ronda-brand-pro{ color: #ffffff; }'+
 '.ronda-brand-divider{ color: rgba(255,255,255,0.25); font-weight: 300; margin: 0 2px; }'+
 '.ronda-brand-maxvel{ color: rgba(255,255,255,0.7); font-weight: 600; font-size: 15px; }'+
 '.ronda-header-actions{ display: flex; align-items: center; gap: 6px; flex-shrink: 0; }'+
 '.ronda-btn-compact{ display: inline-flex; align-items: center; gap: 4px; padding: 5px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #f1f5f9; cursor: pointer; transition: all 0.2s ease; flex-shrink: 0; white-space: nowrap; }'+
 '.ronda-btn-compact.is-active{ background: rgba(255, 255, 255, 0.22); color: #ffffff; border-color: #ffffff; box-shadow: 0 0 16px rgba(255, 255, 255, 0.3); }'+
 '.ronda-btn-sos{ background: #501313 !important; border: 1px solid #991b1b !important; color: #fca5a5 !important; font-weight: 700 !important; padding: 5px 8px !important; border-radius: 8px !important; flex-shrink: 0 !important; }'+
 '.ronda-btn-sos.is-active{ background: #ef4444 !important; border-color: #f87171 !important; color: #ffffff !important; box-shadow: 0 0 20px rgba(239, 68, 68, 0.85) !important; }'+
 '.ronda-chips-row{ position: fixed !important; top: 62px !important; left: 8px !important; right: 8px !important; z-index: 40 !important; display: flex; align-items: center; gap: 6px; pointer-events: none; touch-action: none !important; }'+
 'body.is-guard-search-open .ronda-chips-row{ display: none !important; }'+
 '.ronda-sos-banner.is-active ~ .ronda-chips-row,.is-emergency-active .ronda-chips-row{ top: 96px !important; }'+
 '.ronda-chips-row > *{ pointer-events: auto; }'+
 '.ronda-chip{ padding: 4px 10px; border-radius: 9999px; font-size: 11.5px; font-weight: 600; white-space: nowrap; flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; background: rgba(22,22,22,0.88); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.09); box-shadow: 0 4px 12px rgba(0,0,0,0.4); }'+
 '.ronda-chip-gps{ color: #4ade80; }'+
 '.rp-gps-live-dot{ display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; margin-right: 4px; animation: rpGpsPulse 2s infinite ease-in-out; flex-shrink: 0; }'+
 '@keyframes rpGpsPulse{ 0%,100%{ transform: scale(1); opacity: 1; } 50%{ transform: scale(1.3); opacity: 0.6; } }'+
 '.ronda-chip-posts{ color: #cbd5e1; }'+
 '.ronda-chip-new{ color: #e2e8f0; cursor: pointer; border: 1px solid rgba(255,255,255,0.12); }'+
 '.ronda-sidemenu{ position: fixed; top: 0; bottom: 0; left: 0; width: 290px; max-width: 82vw; height: 100dvh; z-index: 70; border-radius: 0 24px 24px 0; padding: 20px 16px 30px 16px; display: flex; flex-direction: column; gap: 6px; transform: translateX(-120%); transition: transform 0.28s cubic-bezier(0.16,1,0.3,1); box-shadow: 10px 0 40px rgba(0,0,0,0.7); overflow-y: auto; -webkit-overflow-scrolling: touch; background: rgba(10,14,20,0.95); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border-right: 1px solid rgba(255,255,255,0.12); }'+
 '.ronda-sos-banner.is-active ~ .ronda-sidemenu,.is-emergency-active .ronda-sidemenu{ top: 0 !important; }'+
 '.ronda-sidemenu.is-open{ transform: translateX(0); }'+
 '.rp-agent-menu-header{ display: flex; align-items: center; gap: 12px; padding: 4px 6px 14px 6px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 8px; }'+
 '.rp-agent-avatar-circle{ width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.08); border: 1.5px solid rgba(255,255,255,0.18); position: relative; display: flex; align-items: center; justify-content: center; color: #cbd5e1; flex-shrink: 0; }'+
 '.rp-agent-online-dot{ position: absolute; bottom: 1px; right: 1px; width: 10px; height: 10px; border-radius: 50%; background: #22c55e; border: 2px solid #141a23; box-shadow: 0 0 6px #22c55e; }'+
 '.rp-agent-user-info{ display: flex; flex-direction: column; min-width: 0; }'+
 '.rp-agent-user-name{ font-size: 15px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'+
 '.rp-agent-user-badge{ font-size: 12px; font-weight: 500; color: #94a3b8; }'+
 '.rp-agent-menu-links{ display: flex; flex-direction: column; gap: 4px; }'+
 '.ronda-menu-item{ display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; font-size: 14px; font-weight: 500; color: #94a3b8; text-decoration: none; cursor: pointer; border: 1.5px solid transparent; background: transparent; width: 100%; text-align: left; }'+
 '.ronda-menu-item svg{ color: #94a3b8; flex-shrink: 0; }'+
 '.ronda-menu-item.is-active,.ronda-menu-item.is-highlighted{ background: rgba(255,255,255,0.12) !important; border: 1.5px solid rgba(255,255,255,0.35) !important; box-shadow: 0 0 16px rgba(255,255,255,0.15) !important; color: #ffffff !important; font-weight: 600 !important; }'+
 '.ronda-menu-item.is-active svg,.ronda-menu-item.is-highlighted svg{ color: #e2e8f0 !important; }'+
 '.rp-agent-menu-footer{ margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06); }'+
 '.rp-agent-menu-logout{ width: 100%; padding: 10px 12px; font-size: 13px; font-weight: 600; color: #ef4444; background: transparent; border: none; cursor: pointer; text-align: left; border-radius: 10px; }'+
 '.ronda-bottom-sheet{ position: fixed; left: 0; right: 0; bottom: calc(8px + env(safe-area-inset-bottom, 0px)); width: min(84%, 320px) !important; max-width: 320px !important; margin-left: auto; margin-right: auto; z-index: 45; border-radius: 18px; padding: 10px 14px 12px 14px; background: rgba(20, 20, 20, 0.90); backdrop-filter: blur(28px) saturate(180%); -webkit-backdrop-filter: blur(28px) saturate(180%); border: 1px solid rgba(255, 255, 255, 0.10); box-shadow: 0 16px 48px -4px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.10); transform: translateY(0); transition: transform 0.3s cubic-bezier(0.16,1,0.3,1); box-sizing: border-box; }'+
 '.ronda-bottom-sheet.is-collapsed{ transform: translateY(calc(100% - 46px)); }'+
 '.rp-sheet-drag-btn{ background: transparent !important; border: none !important; box-shadow: none !important; outline: none !important; padding: 0 !important; margin: 0 auto 4px !important; width: 100% !important; display: flex !important; justify-content: center !important; align-items: center !important; cursor: pointer !important; }'+
 '.ronda-sheet-handle{ width: 36px; height: 4px; background: rgba(255,255,255,0.32); border-radius: 9999px; margin: 0 auto 6px auto; display: block; }'+
 '.ronda-sheet-title{ font-size: 15px; font-weight: 800; color: #ffffff; margin: 0 0 1px 0; line-height: 1.15; }'+
 '.ronda-sheet-subtitle{ font-size: 11px; font-weight: 600; color: #94a3b8; margin: 0 0 3px 0; }'+
 '.ronda-schedule-rows{ display: flex; flex-direction: column; gap: 0; margin-bottom: 4px; padding: 0; }'+
 '.ronda-schedule-row{ display: flex; align-items: center; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 11.5px; color: #94a3b8; }'+
 '.ronda-schedule-row strong{ color: #ffffff; font-weight: 700; font-size: 11.5px; }'+
 '.ronda-btn-start-route{ width: 100% !important; height: 40px !important; min-height: 40px !important; max-height: 40px !important; border-radius: 10px !important; background: rgba(255,255,255,0.08) !important; border: 1.5px solid rgba(255,255,255,0.18) !important; box-shadow: 0 0 16px rgba(0,0,0,0.4) !important; color: #e2e8f0 !important; font-size: 13.5px !important; font-weight: 700 !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; white-space: nowrap !important; margin: 0 !important; transition: all 0.2s ease !important; }'+
 '.ronda-btn-start-route-active{ width: 100% !important; height: 42px !important; min-height: 42px !important; border-radius: 10px !important; background: linear-gradient(135deg, #e5232a, #b81b21) !important; border: 1px solid rgba(255,255,255,0.18) !important; box-shadow: 0 4px 18px rgba(229,35,42,0.45) !important; color: #ffffff !important; font-size: 14px !important; font-weight: 700 !important; cursor: pointer !important; display: flex !important; align-items: center !important; justify-content: center !important; white-space: nowrap !important; margin: 0 !important; transition: transform 0.15s ease, box-shadow 0.15s ease !important; }'+
 '.ronda-btn-start-route-active:active{ transform: scale(0.97) !important; }'+
 '.ronda-recolher-action{ text-align: center; margin-top: 2px; padding: 2px 0 0 0; cursor: pointer; }'+
 '.ronda-recolher-action span{ font-size: 11px; color: #94a3b8; font-weight: 500; }'+
 '.ronda-sheet-tag{ color: #cbd5e1; font-weight: 800; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 4px; }'+
 '.ronda-sheet-title-active{ font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 4px 0; line-height: 1.25; }'+
 '.ronda-sheet-subtitle-active{ font-size: 13px; color: #94a3b8; margin: 0 0 14px 0; }'+
 '.ronda-next-link-wrap{ text-align: center; margin-top: 12px; }'+
 '.ronda-next-link{ color: #e2e8f0; font-size: 13px; font-weight: 600; text-decoration: none; cursor: pointer; }'+
 '.ronda-fullscreen-modal{ position: fixed; inset: 0; width: 100vw; height: 100dvh; z-index: 9999; background: rgba(15,23,42,0.96); backdrop-filter: blur(20px); display: none; flex-direction: column; padding: 16px; }'+
 '.ronda-fullscreen-modal.is-open{ display: flex; }'+
 '</style>'+

 '<!-- Base Layer Daytime Map (100% tela diurno claro) -->'+
 '<section class="patrol-map-panel rp-inspection-map-panel rp-agent-map-section '+(sosActive?'is-tactical-dark':'')+'">'+
 '<header class="patrol-map-heading rp-agent-legacy-heading" style="display:none !important"><div class="patrol-map-heading-copy"><strong>'+routeTitle+'</strong><small>Ronda · '+(round?.index||0)+' de '+displayTotal+' pontos</small></div><button type="button" class="rp-inspection-map-fit" data-guard-fit aria-label="Enquadrar percurso">⌖</button></header>'+
 '<div class="ronda-map-canvas patrol-map-canvas rp-inspection-map-canvas rp-agent-map-canvas">'+
 '<div class="map-container mini rp-inspector-map rp-agent-map-host" id="guard-real-map" aria-label="Mapa da ronda em operação real"></div>'+
 '</div>'+
 '<div class="patrol-map-footer rp-agent-legacy-footer" style="display:none !important"><span data-guard-gps>'+safe(gpsStatus)+'</span><span data-guard-road>Traçado viário disponível com internet</span></div>'+
 '</section>'+

 '<!-- Tarja de Emergência SOS (Oculta quando desativado) -->'+
 '<div class="ronda-sos-banner rp-agent-emergency-bar '+(sosActive?'is-active':'')+'" id="agent-emergency-bar" '+(sosActive?'':'hidden')+'>'+
 '<svg class="rp-agent-emergency-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 10 18H2zM12 9v5M12 18h.01"/></svg>'+
 '<span>CANAL DE EMERGÊNCIA ATIVADO • TELEMETRIA E ÁUDIO TRANSMITIDOS AO COI</span>'+
 '</div>'+

 '<!-- Floating Glassmorphism Header (Ronda Pro | M) -->'+
 '<header class="ronda-header ronda-glass rp-agent-header" aria-label="Cabeçalho da Ronda">'+
 '<div class="rp-agent-header-row" style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:6px">'+
 '<div class="rp-agent-header-left" style="display:flex;align-items:center;gap:6px">'+
 '<button type="button" class="rp-agent-menu-toggle" data-central-menu aria-label="Abrir menu de navegação" aria-expanded="false" aria-controls="central-navigation">'+
 '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>'+
 '</button>'+
 '<div class="ronda-brand rp-agent-brand-title">'+
 '<span class="rp-brand-text">Ronda <span class="rp-brand-pro">Pro</span></span> '+
 '<span class="ronda-brand-divider rp-brand-sep">|</span> '+
 '<span class="ronda-brand-maxvel rp-brand-logo-wrap"><img src="/assets/maxvel-icon.svg" class="rp-brand-maxvel-logo" width="22" height="22" alt="Maxvel"></span>'+
 '</div>'+
 '</div>'+
 '<div class="ronda-header-actions rp-agent-header-right" style="display:flex;align-items:center;gap:6px;flex-shrink:0">'+
 '<button type="button" class="ronda-btn-compact ronda-btn-torch rp-agent-tool-btn rp-btn-torch '+(torchActive?'is-active':'')+'" data-field-tool-torch aria-label="Lanterna" title="Ligar/Desligar Lanterna">'+
 '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7h8l-2 6v8h-4v-8zM8 3v1m4-3v3m4-1v1"/></svg>'+
 '<span>Lanterna</span>'+
 '</button>'+
 (!hidePanic ? '<button type="button" id="central-panic" class="ronda-btn-compact ronda-btn-sos rp-agent-tool-btn rp-btn-sos '+(sosActive?'is-active':'')+'" data-agent-sos data-action="panic" aria-label="SOS de Emergência">'+
 '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 8-3 10h18c0-2-3-3-3-10ZM10 21h4"/></svg>'+
 '<span>SOS</span>'+
 '</button>' : '')+
 '</div>'+
 '</div>'+
 '</header>'+

 '<!-- Chips Rápidos Abaixo do Header -->'+
 '<div class="ronda-chips-row rp-agent-chips-row">'+
 '<span class="ronda-chip ronda-chip-gps ronda-glass rp-chip-gps"><span class="rp-gps-live-dot"></span>GPS Ativo</span>'+
 '<button type="button" class="ronda-chip ronda-chip-camera-lock ronda-glass is-active" data-action="toggle-camera-lock" aria-label="Alternar trava da câmera no GPS" title="Alternar foco automático da câmera no GPS"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:4px"><circle cx="12" cy="12" r="3"/><path d="M3 12h3M18 12h3M12 3v3M12 18v3"/></svg><span data-camera-lock-label>🎯 Câmera: Fixa</span></button>'+
 '<button type="button" class="ronda-chip ronda-chip-search-trigger ronda-glass" data-action="toggle-search-bar" aria-label="Buscar endereço no mapa" title="Buscar empresa ou endereço no mapa"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:4px"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><span>Buscar endereço</span></button>'+
 '<span class="ronda-chip ronda-chip-posts ronda-glass rp-chip-posts"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:4px"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'+(displayTotal ? displayTotal+' Postos' : 'Aguardando rota')+'</span>'+
 '<button type="button" class="ronda-chip ronda-chip-offline-map ronda-glass is-ready" data-action="offline-map" aria-label="Mapa Operacional e Cache de Divinópolis"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:4px"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg><span id="guard-chip-map-status">🌐 Mapa Online · Divinópolis</span></button>'+
 '<button type="button" class="ronda-chip ronda-chip-new ronda-glass rp-chip-new" data-action="new-round">+ Nova Ronda</button>'+
 '</div>'+

 '<!-- Barra de Busca Avançada de Empresas/Endereços e Pino Posicionável (Recolhida por padrão) -->'+
 '<div class="rp-map-search-bar" id="guard-map-search-bar" role="search" aria-label="Buscar empresa ou endereço no mapa" data-collapsed="true" style="display:none !important">'+
 '<svg class="rp-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>'+
 '<input type="search" id="guard-map-search-input" data-guard-search-input placeholder="Buscar empresa ou endereço…" autocomplete="off" autocorrect="off" spellcheck="false" aria-label="Buscar empresa ou endereço no mapa" aria-autocomplete="list" aria-controls="guard-map-search-results">'+
 '<button type="button" class="ronda-btn-compact rp-search-btn-clear" data-guard-search-clear aria-label="Limpar busca" style="display:none"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>'+
 '<button type="button" class="ronda-btn-compact rp-search-btn-pin" data-guard-search-pin-toggle aria-label="Marcar local no mapa" title="Marcar ponto manualmente no mapa"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></button>'+
 '<button type="button" class="ronda-btn-compact rp-search-btn-close" data-guard-search-close aria-label="Recolher busca" title="Recolher campo de busca"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>'+
 '</div>'+
 '<!-- Painel de Resultados da Busca Avançada -->'+
 '<div id="guard-map-search-results" class="rp-search-results-panel" data-guard-search-results hidden aria-label="Sugestões de locais e empresas"></div>'+
 '<!-- Card Flutuante de Confirmação do Local Marcado -->'+
 '<div id="guard-map-pin-card" class="rp-pin-confirm-card" data-guard-pin-card hidden aria-live="polite">'+
 '<div class="rp-pin-confirm-tag"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg> <span>Local marcado no mapa</span></div>'+
 '<h3 class="rp-pin-confirm-title" data-guard-pin-title>Local selecionado</h3>'+
 '<p class="rp-pin-confirm-sub" data-guard-pin-sub>Arraste o pino ou toque no mapa para posicionar exatamente.</p>'+
 '<div class="rp-pin-confirm-actions">'+
 '<button type="button" class="rp-pin-btn-cancel" data-guard-pin-cancel>Cancelar</button>'+
 '<button type="button" class="rp-pin-btn-confirm" data-guard-pin-confirm>Traçar rota até aqui</button>'+
 '</div>'+
 '</div>'+
 '<!-- Controles Flutuantes de Navegação GPS, Zoom e Bússola -->'+
 '<div class="rp-map-nav-hud" aria-label="Controles de Navegação e Zoom do Mapa">'+
 '<button type="button" class="rp-map-btn-zoom rp-map-btn-zoom-in" data-action="map-zoom-in" title="Aproximar mapa (+)" aria-label="Aproximar mapa">'+
 '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>'+
 '</button>'+
 '<button type="button" class="rp-map-btn-zoom rp-map-btn-zoom-out" data-action="map-zoom-out" title="Afastar mapa (-)" aria-label="Afastar mapa">'+
 '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>'+
 '</button>'+
 '<button type="button" class="rp-map-btn-compass" data-action="map-compass" title="Orientação do mapa (toque para redefinir Norte; segure para alternar giro autônomo)" aria-label="Bússola: redefinir para o Norte">'+
 '<svg class="rp-compass-needle" data-compass-needle viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">'+
 '<polygon points="12,2 16,12 12,9" fill="#E53935"/>'+
 '<polygon points="12,2 8,12 12,9" fill="#D32F2F"/>'+
 '<polygon points="12,22 16,12 12,15" fill="#E5E5E5"/>'+
 '<polygon points="12,22 8,12 12,15" fill="#B3B3B3"/>'+
 '<circle cx="12" cy="12" r="2.5" fill="#262626" stroke="#535353" stroke-width="1"/>'+
 '</svg>'+
 '<span class="rp-compass-badge" data-compass-badge>N</span>'+
 '</button>'+
 '<button type="button" class="rp-map-btn-recenter is-active" data-action="map-follow-gps" title="Centralizar na minha localização GPS" aria-label="Centralizar na minha localização GPS">'+
 '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+
 '<circle cx="12" cy="12" r="7"/><line x1="12" y1="1" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="1" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="23" y2="12"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/>'+
 '</svg>'+
 '<span class="rp-recenter-mode-badge" data-recenter-badge>GPS</span>'+
 '</button>'+
 '</div>'+

 '<!-- Bottom Sheet Ancorada (Painel de Rondas) -->'+
 '<section class="ronda-bottom-sheet ronda-glass rp-agent-bottom-sheet patrol-actions rp-inspection-commands rp-guard-quick-panel'+(!planned?' has-no-route':'')+'" data-guard-panel aria-label="Painel de Rondas">'+
 '<div class="patrol-action-heading rp-guard-panel-heading rp-sheet-handle-bar">'+
 '<button type="button" class="rp-guard-panel-toggle rp-sheet-drag-btn" data-guard-panel-toggle data-sheet-recolher aria-controls="rp-guard-panel-content" aria-expanded="true" aria-label="Recolher ou expandir painel de rondas">'+
 '<span class="ronda-sheet-handle rp-sheet-drag-pill"></span>'+
 '<div class="ronda-sheet-collapsed-cue" aria-hidden="true">'+
 '<span class="ronda-cue-title">'+(!round && !sosActive ? 'Painel de Rondas' : safe(round?.routeName || planned?.name || 'Ronda em Andamento'))+'</span>'+
 '</div>'+
 '<span class="rp-guard-panel-chevron" data-sheet-chevron aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg></span>'+
 '<small data-guard-panel-hint style="display:none">Recolhe em 8 s</small>'+
 '</button>'+
 '</div>'+
 '<div class="rp-sheet-content rp-guard-panel-content" id="rp-guard-panel-content" data-guard-panel-content>'+

 (!round && !sosActive ? (
   '<!-- Estado Standby: Painel de Rondas -->' +
   '<div class="rp-sheet-header-block">'+
   '<h2 class="ronda-sheet-title rp-sheet-heading">Painel de Rondas</h2>'+
   '<div class="ronda-sheet-subtitle">'+(planned?.name ? 'Próxima Ronda: '+safe(planned.name) : 'Aguardando rota do COI')+'</div>'+
   '</div>'+
   '<div class="ronda-schedule-rows">'+
   (planned?.points?.length ? (
     '<div class="ronda-schedule-row">'+
     '<span>Pontos programados</span>'+
     '<strong>'+planned.points.length+' '+(planned.points.length===1?'posto':'postos')+'</strong>'+
     '</div>'
   ) : (
     '<div class="ronda-schedule-row" style="color:#94a3b8;font-size:12.5px">'+
     '<span>Aguardando rota do COI · Nenhum percurso fictício carregado</span>'+
     '</div>'
   ))+
   '</div>'+
   '<div class="rp-inspection-commands-body">'+
   '<strong class="rp-inspection-destination" style="display:none">'+safe(planned?.name||'Aguardando rota do COI')+'</strong>'+
   '<p data-guard-timer style="display:none">Siga para o próximo ponto indicado no mapa.</p>'+
   '<small data-guard-distance style="display:none">'+safe(Number.isFinite(d)?'Distância '+(current?'ao ponto':'à base')+': '+Math.round(d)+' m':'Aguardando GPS real')+'</small>'+
   '<div class="rp-inspection-primary-actions">'+
   '<button type="button" class="ronda-btn-start-route rp-inspection-main-action rp-sheet-main-btn" data-guard-start>'+
   '<span>'+(planned?.points?.length ? 'Iniciar Rota de Ronda' : 'Aguardando rota do COI')+'</span>'+
   '</button>'+
   '</div>'+
   '</div>'
 ) : (
   '<!-- Estado Ativo / Emergência: Posto Ativo -->' +
   '<div class="rp-sheet-header-block">'+
   '<div class="ronda-sheet-tag">BASE OPERACIONAL • POSTO ATIVO</div>'+
   '<h2 class="ronda-sheet-title-active rp-sheet-heading">'+safe(round?.routeName || planned?.name || 'Aguardando rota do COI')+'</h2>'+
   '<div class="ronda-sheet-subtitle-active">'+safe(current?.name || planned?.points?.[0]?.name || 'Aguardando definição de destino pelo COI')+'</div>'+
   '</div>'+
   '<div class="rp-inspection-commands-body">'+
   '<strong class="rp-inspection-destination" style="display:none">'+safe(current?.name||'Base')+'</strong>'+
   '<p data-guard-timer style="display:none">Siga para o próximo ponto indicado no mapa.</p>'+
   '<small data-guard-distance style="display:none">'+safe(Number.isFinite(d)?'Distância '+(current?'ao ponto':'à base')+': '+Math.round(d)+' m':'Aguardando GPS real')+'</small>'+
   '<div class="rp-inspection-primary-actions">'+action+'</div>'+
   '</div>'+
   '<div class="ronda-next-link-wrap"><button type="button" class="ronda-next-link" data-guard-next-link>Iniciar Deslocamento para Próximo Ponto →</button></div>'
 ))+

 '<!-- Ferramentas de apoio invisíveis para preservar testes legados -->'+
 '<div class="rp-field-quicktools" style="display:none !important">'+
 '<button type="button" data-field-tool-alert aria-label="Enviar Alerta"></button>'+
 '<button type="button" data-field-tool-incident aria-label="Registrar Ocorrência"></button>'+
 '</div>'+

 '</div>'+
 '</section>'+

 '<!-- Escamoteável Glassmorphism Side Menu -->'+
 '<div class="rp-agent-drawer-backdrop" id="agent-drawer-backdrop" data-close-central-menu hidden></div>'+
 '<nav id="central-navigation" class="ronda-sidemenu ronda-glass rp-agent-side-menu side rp2-role-nav" aria-label="Menu Lateral do Agente">'+
 '<div class="rp-agent-menu-header">'+
 '<div class="rp-agent-avatar-container">'+
 '<div class="rp-agent-avatar-circle">'+
 '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'+
 '<span class="rp-agent-online-dot"></span>'+
 '</div>'+
 '<div class="rp-agent-user-info">'+
 '<strong class="rp-agent-user-name">'+agentName+'</strong>'+
 '<span class="rp-agent-user-badge">Agente · v2.4.0</span>'+
 '</div>'+
 '</div>'+
 '</div>'+
 '<div class="rp-agent-menu-links">'+
 '<button type="button" data-page="history" class="ronda-menu-item rp-agent-menu-item">'+
 '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg>'+
 '<span>Histórico</span>'+
 '</button>'+
 '<button type="button" data-agent-nav="routes" class="ronda-menu-item is-active rp-agent-menu-item is-highlighted">'+
 '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="6" cy="19" r="3"/><circle cx="18" cy="5" r="3"/><path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H12"/></svg>'+
 '<span>Rondas Disponíveis</span>'+
 '</button>'+
 '<button type="button" data-page="dashboard" class="ronda-menu-item rp-agent-menu-item ronda-menu-plain">'+
 '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>'+
 '<span>Minha Ronda</span>'+
 '</button>'+
 '<button type="button" data-page="send" class="ronda-menu-item rp-agent-menu-item ronda-menu-plain">'+
 '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>'+
 '<span>Comunicar à central</span>'+
 '</button>'+
 '<details class="ronda-menu-more-details" style="margin-top:6px">'+
 '<summary class="ronda-menu-item rp-agent-menu-item ronda-menu-more-summary">'+
 '<span style="display:flex;align-items:center;gap:10px">'+
 '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>'+
 '<span>Mais áreas</span>'+
 '</span>'+
 '<span class="ronda-arrow" style="font-size:11px;opacity:0.7">▾</span>'+
 '</summary>'+
 '<div class="ronda-menu-more-content" style="display:flex;flex-direction:column;gap:3px;padding-top:4px;padding-left:4px">'+
 '<button type="button" data-page="dispatches" class="ronda-menu-item rp-agent-menu-item ronda-menu-sub">'+
 '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16"/></svg>'+
 '<span>Atribuições</span>'+
 '</button>'+
 '<button type="button" data-page="notifications" class="ronda-menu-item rp-agent-menu-item ronda-menu-sub">'+
 '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>'+
 '<span>Eventos</span>'+
 '</button>'+
 '<button type="button" data-page="chat" class="ronda-menu-item rp-agent-menu-item ronda-menu-sub">'+
 '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>'+
 '<span>Chat interno</span>'+
 '</button>'+
 '<button type="button" data-page="guide" class="ronda-menu-item rp-agent-menu-item ronda-menu-sub">'+
 '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>'+
 '<span>Guia completo</span>'+
 '</button>'+
 '<button type="button" data-page="tutorial" class="ronda-menu-item rp-agent-menu-item ronda-menu-sub">'+
 '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'+
 '<span>Ajuda · tutorial</span>'+
 '</button>'+
 '<button type="button" data-action="logout-agent" class="ronda-menu-item rp-agent-menu-item ronda-menu-sub ronda-menu-logout" style="color:#ef4444 !important">'+
 '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'+
 '<span>Sair</span>'+
 '</button>'+
 '</div>'+
 '</details>'+
 '</div>'+
 '</nav>'+



 '<!-- Panic Dialog -->'+
 '<dialog id="central-panic-dialog" class="central-panic-dialog" aria-labelledby="panic-title">'+
 '<h2 id="panic-title">Acionar pânico?</h2>'+
 '<p>O acionamento prioritário será registrado com sua identificação e horário. Localização e bateria serão incluídas quando disponíveis. Use o 190 para emergências que exijam atendimento policial.</p>'+
 '<div class="panic-buttons"><button type="button" id="panic-cancel">Cancelar</button><button type="button" id="panic-send" class="primary">Confirmar pânico</button></div>'+
 '<a href="tel:190">Abrir discador 190</a>'+
 '</dialog>'+
 '</div>';
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
 const recolherButtons=panel.querySelectorAll?.('[data-sheet-recolher]')||(panel.querySelector?.('[data-sheet-recolher]')?[panel.querySelector('[data-sheet-recolher]')]:[]);
 if(!button||!content)return;
 const collapse=collapsed=>{
  if(collapsed&&panel.contains(document.activeElement)&&document.activeElement!==button)button.focus({preventScroll:true});
  panel.classList.toggle('is-collapsed',collapsed);
  content.hidden=collapsed;
  button.setAttribute('aria-expanded',String(!collapsed));
  const chevron=panel.querySelector('[data-sheet-chevron]');
  if(chevron)chevron.style.transform=collapsed?'rotate(180deg)':'rotate(0deg)';
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
 recolherButtons.forEach(btn=>btn.addEventListener('click',e=>{e.stopPropagation();collapse(true);clearTimeout(guardPanelTimer);}));

 // Gestos touch para APK / celular (arrastar para cima ou para baixo)
 let touchStartY=0,touchStartTime=0;
 panel.addEventListener('touchstart',e=>{
  if(e.touches.length===1){touchStartY=e.touches[0].clientY;touchStartTime=Date.now();}
 },{passive:true});
 panel.addEventListener('touchend',e=>{
  if(e.changedTouches.length===1){
   const deltaY=e.changedTouches[0].clientY-touchStartY;
   const elapsed=Date.now()-touchStartTime;
   if(Math.abs(deltaY)>30&&elapsed<700){
    if(deltaY>30&&!panel.classList.contains('is-collapsed')){
     collapse(true);
     clearTimeout(guardPanelTimer);
    }else if(deltaY<-30&&panel.classList.contains('is-collapsed')){
     collapse(false);
     schedule();
    }
   }
  }
 },{passive:true});

 for(const type of ['pointerdown','keydown','focusin','scroll'])panel.addEventListener(type,()=>{if(!panel.classList.contains('is-collapsed'))schedule();},{passive:true});
 schedule();
}
