// Web permission gate. Android uses its native disclosure before the OS prompt.
if(!globalThis.AndroidTracking&&globalThis.navigator?.geolocation){
 const geo=navigator.geolocation,originalGet=geo.getCurrentPosition.bind(geo),originalWatch=geo.watchPosition.bind(geo),originalClear=geo.clearWatch.bind(geo);
 const key='rondapro-web-location-20261108';let pending=null,declined=false,next=0;const watchers=new Map();
 const allowed=()=>{try{return localStorage.getItem(key)==='accepted'}catch{return false}};
 function consent(){
  if(allowed())return Promise.resolve(true);if(declined)return Promise.resolve(false);if(pending)return pending;
  pending=new Promise(resolve=>{
   const dialog=document.createElement('dialog');dialog.setAttribute('aria-labelledby','rp-location-title');dialog.style.cssText='max-width:420px;width:calc(100% - 48px);box-sizing:border-box;background:#262626;color:white;border:1px solid #777;border-radius:16px;padding:24px;';
   dialog.innerHTML='<h2 id="rp-location-title">Uso da localização</h2><p>O Ronda Pro coleta sua localização precisa para registrar trajetos, validar pontos e informar sua posição à central e aos gestores autorizados da empresa durante o expediente. No navegador, o acesso depende da página ativa e das regras do navegador. Para interromper, saia da conta ou revogue a permissão.</p><p><a href="/assets/privacy.html" target="_blank" rel="noopener" style="color:white;min-height:48px;display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;">Política de Privacidade</a></p><button type="button" data-no>Agora não</button> <button type="button" data-yes>Concordo e continuar</button>';
   const finish=yes=>{if(yes){try{localStorage.setItem(key,'accepted')}catch{}}else declined=true;dialog.close();dialog.remove();resolve(yes)};
   dialog.querySelector('[data-no]').onclick=()=>finish(false);dialog.querySelector('[data-yes]').onclick=()=>finish(true);dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false)});
   try{document.body?document.body.append(dialog):document.documentElement.append(dialog);dialog.showModal();}catch{finish(false);}
   setTimeout(()=>{if(dialog.isConnected){dialog.close();dialog.remove();resolve(false);}},15000);
  }).finally(()=>pending=null);return pending;
 }
 const denied=callback=>callback?.({code:1,message:'Localização não autorizada.',PERMISSION_DENIED:1});
 geo.getCurrentPosition=(success,error,options)=>{void consent().then(ok=>ok?originalGet(success,error,options):denied(error));};
 geo.watchPosition=(success,error,options)=>{const id=++next;watchers.set(id,null);void consent().then(ok=>{if(!watchers.has(id))return;if(!ok){watchers.delete(id);denied(error);return;}watchers.set(id,originalWatch(success,error,options));});return id;};
 geo.clearWatch=id=>{const real=watchers.get(id);watchers.delete(id);if(real!=null)originalClear(real);};
}
