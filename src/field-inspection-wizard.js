/** Checklist de campo: verificações em etapas e sem afirmar conformidade para itens não inspecionados. */
export const INSPECTION_STAGES=[
 {id:'acessos',title:'Acessos e perímetro',items:['Portões de acesso','Portas e fechaduras','Entradas secundárias','Muros, cercas e grades','Áreas externas']},
 {id:'estrutura',title:'Estrutura e instalações',items:['Estrutura externa','Cobertura e telhados','Janelas e vidros','Portas técnicas','Áreas comuns']},
 {id:'equipamentos',title:'Equipamentos de segurança',items:['Câmeras de vigilância','Sensores e alarmes','Iluminação de segurança','Interfones e controles','Equipamentos instalados']},
 {id:'sinalizacao',title:'Condições gerais',items:['Sinalização e saídas','Áreas de circulação','Pontos de risco','Ambientes solicitados pelo COI','Outros locais verificados']}
];
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function emptyInspectionDraft(id){return {id,step:0,items:{},locations:{},issues:{},issueNotes:{},observation:''}}
export function stepCount(){return INSPECTION_STAGES.length+1}
export function updateInspectionDraft(draft,form){
 const next={...draft,items:{...draft.items},locations:{...draft.locations},issues:{...draft.issues},issueNotes:{...draft.issueNotes}};
 if(!form)return next;
 for(const stage of INSPECTION_STAGES){
  if(!form.querySelector('[data-stage="'+stage.id+'"]'))continue;
  next.items[stage.id]=[...form.querySelectorAll('input[name="check-'+stage.id+'"]:checked')].map(e=>e.value);
  next.locations[stage.id]=String(form.querySelector('[name="location-'+stage.id+'"]')?.value||'').slice(0,160);
  next.issues[stage.id]=!!form.querySelector('[name="issue-'+stage.id+'"]')?.checked;
  next.issueNotes[stage.id]=String(form.querySelector('[name="issue-note-'+stage.id+'"]')?.value||'').slice(0,650);
 }
 if(form.querySelector('[name="observation"]'))next.observation=String(form.querySelector('[name="observation"]').value||'').slice(0,1000);
 return next;
}
export function inspectionProblems(draft,{final=false}={}){
 const problems=[];
 for(const stage of INSPECTION_STAGES){
  if((draft.issues?.[stage.id])&&!String(draft.issueNotes?.[stage.id]||'').trim())problems.push('Descreva a anormalidade em '+stage.title+'.');
 }
 if(final){
  const checked=INSPECTION_STAGES.flatMap(stage=>draft.items?.[stage.id]||[]);
  if(!checked.length)problems.push('Marque pelo menos uma verificação realizada.');
  if(String(draft.observation||'').trim().length<8)problems.push('Descreva o resultado da vistoria (mínimo de 8 caracteres).');
 }
 return problems;
}
export function inspectionPayload(draft){
 const verified={};const criteria={};
 for(const stage of INSPECTION_STAGES){
  const checked=draft.items?.[stage.id]||[];
  verified[stage.id]={checked,location:draft.locations?.[stage.id]||'',anomaly:!!draft.issues?.[stage.id],issueNotes:draft.issueNotes?.[stage.id]||''};
  criteria[stage.id]=checked.length?(!draft.issues?.[stage.id]):null;
 }
 return {criteria,verified,observation:String(draft.observation||'').trim()};
}
export function inspectionWizardHtml(draft,{demo=false}={}){
 const s=Math.max(0,Math.min(stepCount()-1,draft.step||0)),stage=INSPECTION_STAGES[s],
 evidence=s===INSPECTION_STAGES.length;
 const progress=INSPECTION_STAGES.map((v,i)=>'<span class="'+(i<=s?'done':'')+'"></span>').join('')+'<span class="'+(evidence?'done':'')+'"></span>';
 const fields=stage?'<section data-stage="'+stage.id+'" class="rp-field-wizard-stage"><h3>'+esc(stage.title)+'</h3><p>Marque apenas o que foi efetivamente conferido.</p><div class="rp-field-verification-grid">'+stage.items.map((item,i)=>'<label class="rp-field-verification"><input type="checkbox" name="check-'+stage.id+'" value="'+esc(item)+'" '+((draft.items?.[stage.id]||[]).includes(item)?'checked':'')+'><span>'+esc(item)+'</span></label>').join('')+'</div><label>Local, área ou observação desta etapa<input type="text" name="location-'+stage.id+'" maxlength="160" placeholder="Ex.: portão lateral, doca 2" value="'+esc(draft.locations?.[stage.id]||'')+'"></label><label class="rp-field-issue-toggle"><input type="checkbox" name="issue-'+stage.id+'" '+(draft.issues?.[stage.id]?'checked':'')+'> Identifiquei uma anormalidade</label><label>Detalhes da anormalidade, se houver<textarea name="issue-note-'+stage.id+'" maxlength="650" rows="2" placeholder="Descreva o que encontrou">'+esc(draft.issueNotes?.[stage.id]||'')+'</textarea></label></section>':
 '<section class="rp-field-wizard-stage"><h3>Relatório e evidências</h3><p>Revise o atendimento antes de enviar ao COI.</p><label>Relatório final<textarea name="observation" minlength="8" maxlength="1000" rows="3" placeholder="Descreva os locais e o que foi verificado">'+esc(draft.observation||'')+'</textarea></label>'+
 (demo?'<label>Selfie da chegada<input type="file" name="selfie" accept="image/*" capture="user" required></label><label>Fotos do local, múltiplas<input type="file" name="localPhoto" accept="image/*" multiple required></label>':
 '<button type="button" class="rp-inspection-selfie" data-evidence-kind="selfie">Capturar selfie <span>Câmera frontal</span></button><label>Selecionar fotos do local<input type="file" accept="image/*" multiple data-inspection-photo-upload></label><p data-evidence-attachments></p>')+
 '<label><input type="checkbox" name="confirmation" required> Confirmo que realizei as verificações marcadas presencialmente.</label></section>';
 return '<div class="rp-field-wizard" data-wizard-step="'+s+'"><div class="rp-field-wizard-progress" aria-label="Etapa '+(s+1)+' de '+stepCount()+'">'+progress+'</div><small>ETAPA '+(s+1)+' DE '+stepCount()+'</small>'+fields+
 '<p class="rp-field-wizard-error" role="alert" data-wizard-error hidden></p><div class="rp-field-wizard-controls">'+
 '<button type="button" data-wizard-back '+(!s?'disabled':'')+'>← Voltar</button>'+
 (evidence?'<button type="submit" class="rp-field-wizard-forward">Concluir vistoria e enviar ao COI</button>':'<button type="button" data-wizard-next class="rp-field-wizard-forward">Avançar →</button>')+'</div></div>';
}
