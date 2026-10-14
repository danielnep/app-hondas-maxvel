/**
 * A permissão já concedida é verificada em silêncio.
 * O navegador nunca recebe uma solicitação nova sem uma ação explícita da pessoa.
 */
export function createLocationEntryGate({onGranted=()=>{},onUnavailable=()=>{}}={}){
 let active=false,granted=false,root=null,busy=false,checking=false,sequence=0;
 const fixOf=position=>({lat:position.coords.latitude,lng:position.coords.longitude,
  accuracy:position.coords.accuracy,at:position.timestamp||Date.now()});
 function close(){active=false;sequence++;root?.remove();root=null;document.body.classList.remove('location-entry-locked')}
 function permit(position){granted=true;close();onGranted(fixOf(position))}
 function showGate(){
  if(!active||granted||root)return;
  document.body.classList.add('location-entry-locked');
  root=document.createElement('section');root.className='location-entry-gate';root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Localização necessária para executar a ronda');
  root.innerHTML='<div class="location-entry-shade"></div><div class="location-entry-panel">'+
    '<span class="location-entry-icon" aria-hidden="true">⌖</span>'+
    '<h2>Ative sua localização</h2>'+
    '<p>O aplicativo só funciona com permissão de localização.</p>'+
    '<p class="location-entry-state" role="status" aria-live="polite">Permita o acesso ao GPS para continuar.</p>'+
    '<button type="button" class="location-entry-grant">Ativar localização</button>'+
    '<div class="location-entry-emergency" aria-label="Comunicação de emergência sem GPS">'+
    '<button type="button" class="location-entry-panic" data-ops="panic-confirm">🚨 Pânico · sem GPS</button>'+
    '<a class="location-entry-contact" href="/central.html#message">Mensagens à central ↗</a></div>'+
    '<small>Se estiver bloqueada, libere a permissão nas configurações do navegador. O GPS pode precisar de alguns segundos para obter sinal.</small></div>';
  document.body.append(root);
  root.querySelector('.location-entry-grant').addEventListener('click',request);
 }
 async function open({demo=false}={}){
  if(granted)return;
  active=true;
  if(root||checking)return;
  checking=true;
  const checkId=++sequence;
  try{
   if(navigator.geolocation&&navigator.permissions?.query){
    const permission=await navigator.permissions.query({name:'geolocation'});
    if(!active||checkId!==sequence)return;
    if(permission.state==='granted'){
     const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,
      {enableHighAccuracy:true,timeout:10000,maximumAge:5000}));
     if(active&&checkId===sequence){permit(position);return;}
    }
   }
  }catch{}
  finally{checking=false}
  if(active&&checkId===sequence)showGate();
 }
 function request(){
  if(busy||!root)return;
  const state=root.querySelector('.location-entry-state'),button=root.querySelector('.location-entry-grant');
  if(!navigator.geolocation){state.textContent='Localização indisponível neste dispositivo.';onUnavailable('unsupported');return}
  busy=true;button.disabled=true;button.textContent='Aguardando GPS…';
  navigator.geolocation.getCurrentPosition(position=>{busy=false;permit(position)},error=>{
   busy=false;if(!root)return;
   state.textContent=error.code===1
    ?'O aplicativo só funciona com permissão de localização. Habilite o acesso nas configurações e tente novamente.'
    :error.code===2?'Sem posição confiável. Verifique o GPS e tente novamente.'
    :'A localização demorou a responder. Tente novamente.';
   button.disabled=false;button.textContent='Tentar novamente';onUnavailable(error.code);
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 }
 function reset(){granted=false;close()}
 function isGranted(){return granted}
 return {open,close,reset,isGranted};
}
