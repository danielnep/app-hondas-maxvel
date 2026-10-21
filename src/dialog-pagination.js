/** Ordinary dialogs keep one reading order and one scroll surface.
 * Guided flows own their steps; viewport height must never split a form.
 */
export function installDialogPagination(dialog){
 if(!dialog?.open||dialog.querySelector('.round-wizard,.ux06-sheet')||dialog.classList.contains('guide-dialog')||dialog.classList.contains('role-picker-dialog')||dialog.classList.contains('rp-dispatch-dialog'))return;
 dialog.classList.add('rp-flow-dialog');
 dialog._flowController?.abort();
 const controller=new AbortController();dialog._flowController=controller;
 const viewport=window.visualViewport;
 const resize=()=>{
  dialog.style.setProperty('--dialog-available-height',Math.floor(viewport?.height||window.innerHeight)+'px');
 };
 resize();
 viewport?.addEventListener('resize',resize,{signal:controller.signal});
 dialog.addEventListener('focusin',event=>{
  if(!event.target.matches?.('input,select,textarea'))return;
  requestAnimationFrame(()=>event.target.scrollIntoView({block:'nearest',inline:'nearest'}));
 },{signal:controller.signal});
 dialog.addEventListener('invalid',event=>{
  event.preventDefault();
  requestAnimationFrame(()=>dialog.querySelector('[aria-invalid="true"]')?.focus());
  event.target.setAttribute('aria-invalid','true');
  const field=event.target.closest('label')||event.target.parentElement;
  let hint=field.querySelector('.rp-field-error');
  if(!hint){hint=document.createElement('small');hint.className='rp-field-error';hint.id='field-error-'+crypto.randomUUID();hint.setAttribute('role','alert');field.append(hint);}
  hint.textContent=event.target.validity.tooShort?'Preencha pelo menos '+event.target.minLength+' caracteres.':event.target.validity.valueMissing?'Preencha este campo para continuar.':event.target.validationMessage;
  event.target.setAttribute('aria-errormessage',hint.id);
 },{capture:true,signal:controller.signal});
 dialog.addEventListener('input',event=>{
  if(event.target.validity?.valid){event.target.removeAttribute('aria-invalid');event.target.removeAttribute('aria-errormessage');event.target.closest('label')?.querySelector('.rp-field-error')?.remove();}
 },{signal:controller.signal});
 dialog.addEventListener('close',()=>controller.abort(),{once:true,signal:controller.signal});
}
