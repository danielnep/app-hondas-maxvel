/** Gestão administrativa compacta. Nenhuma credencial é criada no frontend sem envio explícito. */
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const VEHICLES=[['a_pe','A pé'],['moto','Motocicleta'],['carro','Carro'],['bicicleta','Bicicleta'],['outro','Outro']];
const GROUPS={
 coi:[['rondas','Acompanhar rondas'],['despachos','Solicitar rondas e vistorias'],['ocorrencias','Tratar ocorrências'],['mensagens','Mensagens internas']],
 ronda:[['rondas','Executar rondas'],['mensagens','Chat com a equipe'],['ocorrencias','Alertas e ocorrências'],['vistoria','Atender vistorias autorizadas']]
};
export function createSettingsManager({showDialog,dialog,api,getUsers,refresh,render,notify}){
 const landing=()=>'<section class="rp-config-hub">'+
 '<button type="button" class="rp-config-choice" data-action="admin-add-user"><span class="rp-config-symbol">+</span><span><strong>Adicionar novo usuário</strong><small>Identidade, função, contato e veículo em etapas</small></span><span aria-hidden="true">→</span></button>'+
 '<button type="button" class="rp-config-choice" data-action="admin-permissions"><span class="rp-config-symbol">✓</span><span><strong>Permissões</strong><small>Definir acessos do COI e da Ronda</small></span><span aria-hidden="true">→</span></button>'+
 '<button type="button" class="rp-config-choice" data-action="admin-points-open"><span class="rp-config-symbol">⌖</span><span><strong>Pontos cadastrados</strong><small>Salvar destinos geográficos para as rondas</small></span><span aria-hidden="true">→</span></button>'+ 
 '</section><section class="rp-config-roster"><h2>Equipe cadastrada</h2><div class="team-list">'+
 getUsers().map(u=>'<div class="team-row"><div><strong>'+safe(u.name)+'</strong><small>'+safe(u.role==='ronda'?'Ronda / Vistoriador':u.role==='coi'?'COI':u.role)+
 (u.vehicleType?' · '+safe(VEHICLES.find(v=>v[0]===u.vehicleType)?.[1]||u.vehicleType):'')+'</small></div><small>'+safe(u.email||u.username)+'</small></div>').join('')+
 '</div></section>';
 function userDialog(){
  const html='<section class="rp-admin-wizard"><header><small>ADMINISTRAÇÃO · CADASTRO</small><h2>Adicionar usuário</h2><p>Preencha uma etapa por vez.</p></header>'+
  '<nav class="rp-admin-progress" aria-label="Cadastro em quatro etapas">'+['Identidade','Contato','Operação','Revisão'].map((x,i)=>'<span data-user-progress="'+i+'"'+(!i?' aria-current="step"':'')+'><b>'+(i+1)+'</b><small>'+x+'</small></span>').join('')+'</nav>'+
  '<form id="live-create-user-form" class="rp-admin-form" data-user-step="0" novalidate>'+
  '<div data-user-stage="0"><h3>Quem é o profissional?</h3><label>Função<select name="role" required><option value="ronda">Ronda / Vistoriador</option><option value="coi">COI</option></select></label><label>Nome completo<input name="name" required minlength="2" maxlength="100" autocomplete="name"></label></div>'+
  '<div data-user-stage="1" hidden><h3>Dados para contato</h3><label>E-mail<input name="email" type="email" required maxlength="150" autocomplete="email"></label><label>Telefone<input name="phone" type="tel" maxlength="35" autocomplete="tel" placeholder="(37) 99999-9999"></label><label>Nome de usuário (opcional)<input name="username" minlength="3" maxlength="40" autocomplete="off"></label></div>'+
  '<div data-user-stage="2" hidden><h3>Deslocamento e acesso</h3><label data-vehicle-field>Tipo de veículo<select name="vehicleType" required>'+VEHICLES.map(([value,label])=>'<option value="'+value+'">'+label+'</option>').join('')+'</select></label><label data-vehicle-field>Placa ou identificação (opcional)<input name="vehiclePlate" maxlength="12" placeholder="Identificação do veículo"></label><label>Senha inicial<input name="password" type="password" required minlength="12" maxlength="128" autocomplete="new-password"><small>Mínimo de 12 caracteres</small></label></div>'+
  '<div data-user-stage="3" hidden><h3>Revisar e cadastrar</h3><dl class="rp-admin-summary"><div><dt>Profissional</dt><dd data-review="name"></dd></div><div><dt>Função</dt><dd data-review="role"></dd></div><div><dt>E-mail</dt><dd data-review="email"></dd></div><div><dt>Deslocamento</dt><dd data-review="vehicleType"></dd></div></dl></div>'+
  '<p role="alert" class="rp-admin-feedback" hidden></p><footer><button type="button" data-action="admin-user-back" hidden>Voltar</button><button type="button" data-action="admin-user-next">Próximo →</button><button type="submit" hidden>Cadastrar usuário</button></footer></form></section>';
  showDialog(html,false,'rp-admin-user-dialog');
  toggleVehicle();
 }
 function toggleVehicle(){
  const form=dialog.querySelector('#live-create-user-form');if(!form)return;
  const isField=form.elements.role.value==='ronda';
  for(const el of form.querySelectorAll('[data-vehicle-field]'))el.hidden=!isField;
  form.elements.vehicleType.disabled=!isField;
  form.elements.vehiclePlate.disabled=!isField;
 }
 function userStep(change){
  const form=dialog.querySelector('#live-create-user-form');if(!form)return;
  const current=Number(form.dataset.userStep);
  if(change>0)for(const control of form.querySelector('[data-user-stage="'+current+'"]').querySelectorAll('input,select')){
   if(control.disabled)continue;
   if(!control.checkValidity()){control.reportValidity();control.focus();return;}
  }
  const n=Math.max(0,Math.min(3,current+change));form.dataset.userStep=n;
  for(const stage of form.querySelectorAll('[data-user-stage]'))stage.hidden=Number(stage.dataset.userStage)!==n;
  for(const step of dialog.querySelectorAll('[data-user-progress]')){
   step.removeAttribute('aria-current');if(Number(step.dataset.userProgress)===n)step.setAttribute('aria-current','step');
  }
  form.querySelector('[data-action="admin-user-back"]').hidden=n===0;
  form.querySelector('[data-action="admin-user-next"]').hidden=n===3;
  form.querySelector('[type="submit"]').hidden=n!==3;
  if(n===3){
   const f=new FormData(form);
   for(const key of ['name','role','email','vehicleType']){
    const node=form.querySelector('[data-review="'+key+'"]');
    const val=key==='role'?(f.get(key)==='ronda'?'Ronda / Vistoriador':'COI'):key==='vehicleType'?(VEHICLES.find(v=>v[0]===f.get(key))?.[1]||'Não se aplica'):f.get(key);
    node.textContent=String(val||'');
   }
  }
  form.querySelector('[data-user-stage="'+n+'"] input:not([disabled]),[data-user-stage="'+n+'"] select:not([disabled]),[data-user-stage="'+n+'"] h3')?.focus({preventScroll:true});
 }
 async function permissionsDialog(){
  showDialog('<section class="rp-admin-wizard"><header><small>ADMINISTRAÇÃO · ACESSOS</small><h2>Permissões por função</h2><p>Defina os recursos de cada perfil.</p></header>'+
   '<div class="rp-permission-roles" role="tablist"><button type="button" data-permission-role="coi" aria-selected="true">COI</button><button type="button" data-permission-role="ronda" aria-selected="false">Ronda / Vistoriador</button></div>'+
   '<form id="role-permissions-form"><input type="hidden" name="role" value="coi"><div class="rp-permission-options" role="group" aria-label="Permissões"></div><p class="rp-admin-feedback" role="alert" hidden></p><footer><button type="submit">Salvar permissões</button></footer></form></section>',false,'rp-admin-permissions-dialog');
  try{const r=await api('/role-permissions');dialog._permissions=r.permissions||{};showPerms('coi');}
  catch(e){const el=dialog.querySelector('.rp-admin-feedback');el.textContent=e.message;el.hidden=false;}
 }
 function showPerms(role){
  const f=dialog.querySelector('#role-permissions-form');if(!f)return;
  f.elements.role.value=role;
  for(const b of dialog.querySelectorAll('[data-permission-role]'))b.setAttribute('aria-selected',String(b.dataset.permissionRole===role));
  const settings=dialog._permissions?.[role]||{};
  f.querySelector('.rp-permission-options').innerHTML=(GROUPS[role]||[]).map(([key,label])=>
   '<label class="rp-permission-option"><span>'+safe(label)+'</span><input type="checkbox" name="'+key+'" '+(settings[key]!==false?'checked':'')+'></label>').join('')+
   '<small class="rp-permission-note">Ações de emergência e pânico permanecem disponíveis.</small>';
 }
 async function click(el){
  const a=el.dataset.action;
  if(a==='admin-add-user'){userDialog();return true;}
  if(a==='admin-permissions'){await permissionsDialog();return true;}
  if(a==='admin-user-next'){userStep(1);return true;}
  if(a==='admin-user-back'){userStep(-1);return true;}
  if(el.dataset.permissionRole){showPerms(el.dataset.permissionRole);return true;}
  return false;
 }
 async function submit(form){
  if(form.id==='live-create-user-form'){
   const f=new FormData(form);
   for(const input of form.querySelectorAll('input,select'))if(!input.disabled&&!input.checkValidity()){userStep(Number(input.closest('[data-user-stage]').dataset.userStage)-Number(form.dataset.userStep));input.reportValidity();return true;}
   const submit=form.querySelector('[type="submit"]');if(submit.disabled)return true;submit.disabled=true;
   try{await api('/users',{method:'POST',data:Object.fromEntries(f)});dialog.close();await refresh();render();notify('Profissional cadastrado.');}
   catch(e){const el=form.querySelector('.rp-admin-feedback');el.hidden=false;el.textContent=e.message;submit.disabled=false;}
   return true;
  }
  if(form.id==='role-permissions-form'){
   const role=form.elements.role.value,data=Object.fromEntries(GROUPS[role].map(([key])=>[key,form.elements.namedItem(key).checked]));
   const button=form.querySelector('[type="submit"]');button.disabled=true;
   try{await api('/role-permissions',{method:'PUT',data:{role,modules:data}});dialog._permissions={...dialog._permissions,[role]:data};notify('Permissões salvas.');}
   catch(e){const el=form.querySelector('.rp-admin-feedback');el.hidden=false;el.textContent=e.message;}
   finally{button.disabled=false;}return true;
  }
  return false;
 }
 function change(target){if(target.matches('#live-create-user-form [name="role"]')){toggleVehicle();return true;}return false;}
 return {landing,click,submit,change};
}
