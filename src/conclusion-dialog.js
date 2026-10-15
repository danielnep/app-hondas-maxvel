import {validateConclusion} from './conclusion-validation.js';
/**
 * Full-viewport audited conclusion confirmation for any role and screen size.
 * The same validator runs again on the server before persistence.
 */
export function openConclusionDialog({title='Concluir análise',eventLabel='',action='resolvida',onConfirm}){
 const pane=document.createElement('section');
 pane.className='conclusion-overlay';
 pane.setAttribute('role','dialog');pane.setAttribute('aria-modal','true');
 pane.setAttribute('aria-label','Conclusão obrigatória');
 pane.innerHTML='<div class="conclusion-frost"></div><form class="conclusion-dialog" novalidate>'+
  '<span class="conclusion-eyebrow">RONDAS PRO · REGISTRO DE TRATAMENTO</span>'+
  '<h2></h2><p class="conclusion-subtitle"></p>'+
  '<label>Digite suas conclusões para finalizar<textarea required maxlength="4000" minlength="24" rows="5" placeholder="Ex.: Verifiquei o relato, conferi o horário e as evidências. A equipe foi orientada e a providência adotada foi..."></textarea></label>'+
  '<p class="conclusion-feedback" role="status" aria-live="polite">Descreva os fatos verificados e as providências adotadas.</p>'+
  '<div class="conclusion-buttons"><button type="button" data-cancel>Cancelar</button><button class="conclusion-primary" type="submit" disabled>Finalizar</button></div>'+
  '<small>Suas conclusões serão registradas com autor, data e hora, ajudando nas análises e auditorias posteriores.</small></form>';
 const form=pane.querySelector('form'),area=pane.querySelector('textarea'),button=pane.querySelector('[type=submit]'),feedback=pane.querySelector('.conclusion-feedback');
 pane.querySelector('h2').textContent=title;
 pane.querySelector('.conclusion-subtitle').textContent=eventLabel;
 let busy=false;
 const close=()=>{if(!busy)pane.remove()};
 const update=()=>{
  const result=validateConclusion(area.value);
  button.disabled=busy||!result.ok;
  feedback.textContent=area.value.trim()?result.reason:'Digite uma conclusão fundamentada para habilitar a finalização.';
  feedback.dataset.valid=String(result.ok);
 };
 pane.querySelector('[data-cancel]').addEventListener('click',close);
 pane.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close()}});
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const result=validateConclusion(area.value);
  if(!result.ok){update();return}
  busy=true;button.disabled=true;button.textContent='Registrando…';
  try{
   await onConfirm({action,conclusion:result.value});
   pane.remove();
  }catch(error){
   busy=false;button.textContent='Finalizar';feedback.textContent=error.message||'Não foi possível registrar.';
   update();feedback.textContent=error.message||'Não foi possível registrar. Seu texto foi preservado.';
  }
 });
 area.addEventListener('input',update);
 // A confirmação pertence à camada modal do registro aberto.
 (document.querySelector('#central-event-dialog[open]')||document.body).append(pane);area.focus();
 return {close,element:pane};
}