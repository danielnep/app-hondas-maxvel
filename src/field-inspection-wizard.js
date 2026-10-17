/** Checklist de campo: verificações em etapas e sem afirmar conformidade para itens não inspecionados. */
export const INSPECTION_STAGES=[
 {id:'acessos',title:'Acessos e perímetro',items:['Portões de acesso','Portas e fechaduras','Entradas secundárias','Muros, cercas e grades','Áreas externas']},
 {id:'estrutura',title:'Estrutura e instalações',items:['Estrutura externa','Cobertura e telhados','Janelas e vidros','Portas técnicas','Áreas comuns']},
 {id:'equipamentos',title:'Equipamentos de segurança',items:['Câmeras de vigilância','Sensores e alarmes','Iluminação de segurança','Interfones e controles','Equipamentos instalados']},
 {id:'sinalizacao',title:'Condições gerais',items:['Sinalização e saídas','Áreas de circulação','Pontos de risco','Ambientes solicitados pelo COI','Outros locais verificados']}
];
const CAMERA_ICON='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></svg>';
const SELFIE_ICON='<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="12" cy="10" r="3"/><path d="M8 18c1-2 7-2 8 0"/></svg>';
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
 (demo?
 '<div class="rp-inspection-evidence" aria-label="Evidências da vistoria"><div class="rp-inspection-capture-actions">'+
 '<button type="button" class="rp-capture-button" data-demo-capture="selfie">'+SELFIE_ICON+'<span><strong>Selfie</strong><small>Câmera frontal</small></span></button>'+
 '<button type="button" class="rp-capture-button" data-demo-capture="photo">'+CAMERA_ICON+'<span><strong>Foto do local</strong><small>Câmera traseira</small></span></button></div>'+
 '<input type="file" name="selfie" accept="image/*" data-demo-captured="selfie" hidden style="display:none" tabindex="-1">'+
 '<input type="file" name="localPhoto" accept="image/*" multiple data-demo-captured="photo" hidden style="display:none" tabindex="-1">'+
 '<div class="rp-capture-preview" data-demo-capture-preview aria-live="polite">Nenhuma foto capturada.</div></div>':
 '<div class="rp-inspection-evidence" aria-label="Evidências da vistoria"><div class="rp-inspection-capture-actions">'+
 '<button type="button" class="rp-capture-button rp-inspection-selfie" data-evidence-kind="selfie">'+SELFIE_ICON+'<span><strong>Selfie</strong><small>Câmera frontal</small></span></button>'+
 '<button type="button" class="rp-capture-button" data-evidence-kind="photo">'+CAMERA_ICON+'<span><strong>Foto do local</strong><small>Câmera traseira</small></span></button></div>'+
 '<p class="rp-capture-preview" data-evidence-attachments aria-live="polite">Nenhuma foto capturada.</p></div>')+
 '<label><input type="checkbox" name="confirmation" required> Confirmo que realizei as verificações marcadas presencialmente.</label></section>';
 return '<div class="rp-field-wizard" data-wizard-step="'+s+'"><div class="rp-field-wizard-progress" aria-label="Etapa '+(s+1)+' de '+stepCount()+'">'+progress+'</div><small>ETAPA '+(s+1)+' DE '+stepCount()+'</small>'+fields+
 '<p class="rp-field-wizard-error" role="alert" data-wizard-error hidden></p><div class="rp-field-wizard-controls">'+
 '<button type="button" data-wizard-back '+(!s?'disabled':'')+'>← Voltar</button>'+
 (evidence?'<button type="submit" class="rp-field-wizard-forward">Concluir vistoria e enviar ao COI</button>':'<button type="button" data-wizard-next class="rp-field-wizard-forward">Avançar →</button>')+'</div></div>';
}
