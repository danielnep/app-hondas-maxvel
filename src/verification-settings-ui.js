import {verificationSettings} from './verification-policy.js';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function verificationSettingsHtml(value,routes=[]){
 const s=verificationSettings(value);
 const modes=[['gps','GPS no ponto + permanência'],['qr','QR Code por ponto'],['gps+qr','GPS + permanência + QR Code']];
 return '<section class="ops-added-section rp-verification-settings" aria-labelledby="verification-title"><h2 id="verification-title">Verificação dos pontos</h2>'+
  '<p>A regra é compartilhada com os aparelhos da equipe. Uma ronda em andamento mantém a regra com que foi iniciada.</p>'+
  '<form id="verification-settings-form" class="live-register rp-verification-form"><label>Como confirmar cada ponto<select name="verificationMode">'+modes.map(([id,label])=>'<option value="'+id+'" '+(s.verificationMode===id?'selected':'')+'>'+label+'</option>').join('')+'</select></label>'+
  '<label>Permanência por ponto em GPS (segundos)<input type="number" name="dwellSeconds" min="5" max="120" step="1" value="'+s.dwellSeconds+'" required></label>'+
  '<p>GPS: presença no raio do ponto durante o tempo configurado, padrão de 30 segundos. QR: leitura pela câmera do código cadastrado no ponto. GPS + QR: exige as duas confirmações. O GPS continua registrando a operação.</p>'+
  '<button type="submit" class="button primary">Salvar regra da equipe</button><output role="status" data-verification-status></output></form>'+
  '<h3>QR Codes dos pontos reais</h3>'+(routes.length?'<form id="verification-qr-form" class="live-register rp-verification-form"><label>Rota<select name="routeId" required>'+routes.map(r=>'<option value="'+escape(r.id)+'">'+escape(r.name)+'</option>').join('')+'</select></label><button type="submit" class="button">Gerar etiquetas QR</button></form>':'<p>Cadastre uma rota com endereços reais para gerar as etiquetas de cada ponto.</p>')+
  '<div data-verification-qr-labels></div></section>';
}
export async function saveVerificationSettings(form,request){
 const data=new FormData(form),button=form.querySelector('button[type=submit]'),status=form.querySelector('[data-verification-status]');
 button.disabled=true;if(status)status.textContent='Salvando na central…';
 try{
  const result=await request('/operational-settings',{method:'PUT',data:{verificationMode:String(data.get('verificationMode')),dwellSeconds:Number(data.get('dwellSeconds'))}});
  if(status)status.textContent='Regra salva na central. Os aparelhos recebem na próxima sincronização.';
  return result.settings;
 }finally{button.disabled=false;}
}
export async function renderQrLabels(form,request){
 const data=new FormData(form),button=form.querySelector('button'),host=document.querySelector('[data-verification-qr-labels]');
 button.disabled=true;
 try{
  const result=await request('/routes/'+encodeURIComponent(data.get('routeId'))+'/qr-codes');
  host.innerHTML='<h3>'+escape(result.routeName)+'</h3>'+result.codes.map(c=>'<figure style="margin:12px 0;break-inside:avoid"><img width="220" height="220" style="max-width:100%;height:auto;background:#fff" alt="QR Code do ponto '+(c.index+1)+'" src="data:image/svg+xml;charset=utf-8,'+encodeURIComponent(c.svg)+'"><figcaption><strong>'+(c.index+1)+'. '+escape(c.name)+'</strong><br>'+escape(c.address)+'</figcaption></figure>').join('');
 }finally{button.disabled=false;}
}
