/**
 * Rondas Pro · autorização explícita antes da experiência do vigia.
 * Não tenta contornar "Negar" no navegador: somente nova ação do usuário pode tentar novamente.
 * O dispositivo ou navegador sempre pode revogar a permissão.
 */
export function createLocationEntryGate({onGranted=()=>{},onUnavailable=()=>{}}={}){
 let active=false,granted=false,root=null,busy=false;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function close(){active=false;root?.remove();root=null;document.body.classList.remove('location-entry-locked')}
 function open({demo=false}={}){
  if(granted)return;
  active=true;
  if(root){root.dataset.demo=String(demo);return}
  document.body.classList.add('location-entry-locked');
  root=document.createElement('section');root.className='location-entry-gate';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Localização necessária para executar a ronda');
  root.dataset.demo=String(demo);
  root.innerHTML='<div class="location-entry-shade"></div><div class="location-entry-panel">'+
   '<span class="location-entry-icon" aria-hidden="true">⌖</span><span class="location-entry-label">PRIMEIRA ETAPA · LOCALIZAÇÃO</span>'+
   '<h2>Ative sua localização</h2>'+
   '<p>Para iniciar e acompanhar a ronda, é necessário permitir a localização do dispositivo. Sem essa autorização, não será possível comprovar os pontos do percurso nem oferecer acompanhamento geográfico à central.</p>'+
   '<div class="location-entry-help"><strong>Como funciona</strong><ol><li>Toque em <b>Ativar localização</b>.</li><li>Quando o celular solicitar, escolha <b>Permitir</b>.</li><li>Depois, inicie a ronda. O mapa indicará sua localização disponível e os pontos do percurso.</li></ol></div>'+
   '<p class="location-entry-state" role="status" aria-live="polite">Localização aguardando autorização.</p>'+
   '<button type="button" class="location-entry-grant">Ativar localização</button>'+
   '<small>Se a permissão estiver bloqueada, habilite Localização nas configurações do navegador ou do aplicativo e volte para tentar novamente. O GPS exige um sinal confiável; permitir acesso não garante boa precisão.</small>'+
   '</div>';
  document.body.append(root);
  root.querySelector('button').addEventListener('click',request);
 }
 function request(){
  if(busy||!root)return;
  const state=root.querySelector('.location-entry-state'),button=root.querySelector('button');
  if(!navigator.geolocation){state.textContent='Localização indisponível neste aparelho ou navegador. Verifique a configuração do dispositivo.';onUnavailable('unsupported');return}
  busy=true;button.disabled=true;button.textContent='Aguardando autorização…';state.textContent='Confirme a solicitação de localização no seu aparelho.';
  navigator.geolocation.getCurrentPosition(position=>{
   busy=false;granted=true;
   const fix={lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy,at:position.timestamp||Date.now()};
   close();onGranted(fix);
  },error=>{
   busy=false;
   if(!root)return;
   state.textContent=error.code===1
    ?'Localização não autorizada. Ative o acesso nas configurações e toque novamente para continuar.'
    :error.code===2?'O GPS não conseguiu determinar a posição. Ative a localização e tente novamente.'
    :'Tempo de espera do GPS esgotado. Verifique o sinal e tente novamente.';
   button.disabled=false;button.textContent='Tentar ativar localização';
   onUnavailable(error.code);
  },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
 }
 function reset(){granted=false;close()}
 function isGranted(){return granted}
 return {open,close,reset,isGranted};
}
