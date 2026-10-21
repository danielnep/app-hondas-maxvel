/** Despacho compacto por etapas. O backend continua sendo a autoridade da operação. */
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export function createDispatchWizard({dialog,showDialog,getWorkers,request,refresh,redraw,notify}){
 const names=['Profissional','Destino','Orientações','Revisão'];
 function open(){
  const workers=getWorkers().filter(w=>w.role==='ronda'&&w.active);
  const options=workers.map(w=>'<option value="'+escape(w.id)+'">'+escape(w.name)+'</option>').join('');
  showDialog('<section class="rp-dispatch-wizard" aria-label="Solicitar início de ronda">'+
   '<header class="rp-dispatch-head"><div class="rp-dispatch-kicker"><span>GRUPO MAXVEL</span><span>OPERAÇÃO DE CAMPO</span></div>'+
   '<h2>Solicitar início de ronda</h2><p>Envie a solicitação em quatro passos. O vigia inicia após recebê-la.</p></header>'+
   '<nav class="rp-dispatch-steps" aria-label="Etapas do despacho">'+names.map((n,i)=>'<span data-dispatch-progress="'+(i+1)+'" '+(i===0?'aria-current="step"':'')+'><b>'+String(i+1).padStart(2,'0')+'</b><small>'+n+'</small></span>').join('')+'</nav>'+
   '<form id="live-dispatch-form" class="rp-dispatch-form" data-step="1" novalidate>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="1"><span class="rp-dispatch-counter">01 / 04 · EQUIPE</span><h3>Quem fará a ronda?</h3>'+
   '<label for="rp-dispatch-worker">Vigia responsável<select id="rp-dispatch-worker" name="workerId" required><option value="">Selecione o profissional</option>'+options+'</select></label>'+
   '<p>O vigia receberá a solicitação na operação de Ronda.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="2" hidden><span class="rp-dispatch-counter">02 / 04 · DESTINO</span><h3>Onde será a ronda?</h3>'+
   '<label for="rp-dispatch-address">Local ou endereço<input id="rp-dispatch-address" name="address" required minlength="5" maxlength="350" autocomplete="street-address" placeholder="Rua, número, bairro ou referência"></label>'+
   '<p>Identifique o local para que o vigia encontre o destino.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="3" hidden><span class="rp-dispatch-counter">03 / 04 · INSTRUÇÕES</span><h3>O que precisa verificar?</h3>'+
   '<label for="rp-dispatch-reason">Motivo e orientações<textarea id="rp-dispatch-reason" name="reason" required minlength="10" maxlength="1000" rows="3" placeholder="Descreva os itens a verificar e o motivo da solicitação"></textarea></label>'+
   '<p>Instruções objetivas deixam o atendimento mais rápido.</p></section>'+
   '<section class="rp-dispatch-stage" data-dispatch-stage="4" hidden><span class="rp-dispatch-counter">04 / 04 · CONFERÊNCIA</span><h3>Revise a solicitação</h3>'+
   '<dl class="rp-dispatch-review"><div><dt>Vigia</dt><dd data-dispatch-summary="worker"></dd></div><div><dt>Destino</dt><dd data-dispatch-summary="address"></dd></div><div><dt>Instruções</dt><dd data-dispatch-summary="reason"></dd></div></dl></section>'+
   '<p class="rp-dispatch-error" role="alert" hidden></p>'+
   '<footer class="rp-dispatch-actions"><button type="button" class="rp-dispatch-back" data-action="dispatch-back" hidden>Voltar</button>'+
   '<button type="button" class="rp-dispatch-next" data-action="dispatch-next" '+(!workers.length?'disabled':'')+'>Continuar <span aria-hidden="true">→</span></button>'+
   '<button type="submit" class="rp-dispatch-submit" hidden>Solicitar ronda <span aria-hidden="true">✓</span></button></footer></form></section>',false,'rp-dispatch-dialog');
  if(!workers.length){const error=dialog.querySelector('.rp-dispatch-error');error.textContent='Cadastre um vigia ativo antes de solicitar a ronda.';error.hidden=false;}
 }
 function step(next){
  const form=dialog.querySelector('#live-dispatch-form');if(!form)return;
  const current=Number(form.dataset.step)||1;
  if(next>current){
   const control=form.querySelector('[data-dispatch-stage="'+current+'"] select,[data-dispatch-stage="'+current+'"] input,[data-dispatch-stage="'+current+'"] textarea');
   if(control&&!control.checkValidity()){control.setAttribute('aria-invalid','true');control.reportValidity();control.focus();return;}
   control?.removeAttribute('aria-invalid');
  }
  const n=Math.max(1,Math.min(4,next));form.dataset.step=String(n);
  for(const panel of form.querySelectorAll('[data-dispatch-stage]'))panel.hidden=Number(panel.dataset.dispatchStage)!==n;
  for(const item of dialog.querySelectorAll('[data-dispatch-progress]')){
   const value=Number(item.dataset.dispatchProgress);item.removeAttribute('aria-current');
   if(value===n)item.setAttribute('aria-current','step');
   item.classList.toggle('is-complete',value<n);
  }
  form.querySelector('[data-action="dispatch-back"]').hidden=n===1;
  form.querySelector('[data-action="dispatch-next"]').hidden=n===4;
  form.querySelector('[type="submit"]').hidden=n!==4;
  if(n===4){
   const worker=form.querySelector('[name="workerId"]');
   const payload=new FormData(form);
   for(const [key,value] of [['worker',worker.selectedOptions[0]?.textContent],['address',payload.get('address')],['reason',payload.get('reason')]]){
    const node=form.querySelector('[data-dispatch-summary="'+key+'"]');if(node)node.textContent=String(value||'');
   }
  }
  form.querySelector('[data-dispatch-stage="'+n+'"] :is(select,input,textarea,h3)')?.focus({preventScroll:true});
 }
 async function submit(form){
  if(form.id!=='live-dispatch-form')return false;
  if(form.dataset.step!=='4')return true;
  for(const [index,key] of [[1,'workerId'],[2,'address'],[3,'reason']]){
   const field=form.elements.namedItem(key);
   if(!field?.checkValidity()){step(index);field.reportValidity();return true;}
  }
  const button=form.querySelector('[type="submit"]');if(button.disabled)return true;
  button.disabled=true;button.textContent='Enviando…';
  const data=Object.fromEntries(new FormData(form));
  try{
   await request('/dispatches',{method:'POST',data:{...data,kind:'ronda'}});
   dialog.close();await refresh();redraw();notify('Solicitação de ronda enviada ao vigia.');
  }catch(error){
   button.disabled=false;button.textContent='Solicitar ronda ✓';
   const message=form.querySelector('.rp-dispatch-error');message.textContent=error.message||'Não foi possível despachar.';message.hidden=false;notify(message.textContent);
  }
  return true;
 }
 return {open,step,submit};
}
