const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stamp=t=>new Date(t).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const check=s=>s==='visualizada'?'✓✓ Visualizada':s==='recebida'?'✓✓ Recebida':'✓ Enviada';
export function createInternalChatUI({api,flash,navigate,getAccount}){
 let conversations=[],contacts=[],unread=0,active=null,rows=[],hasMore=false,reply=null,search='',busy=false,epoch=0,recording=null,audioStream=null,recorder=null,recorded=[],sending=null;
 let observer=null,urls=new Map(),drafts=new Map(),lastTyping=0;
 const mine=()=>getAccount()?.id;
 const conversation=()=>conversations.find(c=>c.id===active);
 const preview=(c)=>c.last?.deleted_at?'Mensagem excluída':c.last?.body||(c.last?.attachments?.length?'📎 Anexo':'Conversa iniciada');
 const convRows=list=>list.map(c=>'<button type="button" data-chat-open="'+esc(c.id)+'" class="chat-conversation '+(c.id===active?'is-selected':'')+'"><span class="chat-avatar">'+esc(c.title.slice(0,1))+'</span><span><strong>'+esc(c.title)+'</strong><small>'+esc(preview(c).slice(0,95))+'</small></span><span><small>'+stamp(c.updated_at)+'</small>'+(c.unread?'<b class="rp-unread-count">'+c.unread+'</b>':'')+'</span></button>').join('');
 function badge(){return '<details class="rp-header-popover" data-message-popover><summary class="rp-blue-button '+(unread?'has-unread':'')+'" aria-label="Mensagens: '+unread+' não lidas"><span aria-hidden="true">✉</span><span>Mensagens</span>'+(unread?'<b class="rp-unread-count">'+unread+'</b>':'')+'</summary><div class="rp-popover-list"><strong>Últimas conversas</strong>'+ (conversations.length?convRows(conversations.slice(0,5)):'<p class="empty">Nenhuma conversa iniciada.</p>')+'<button type="button" data-chat-page>Ver mais'+(conversations.slice(5).some(c=>c.unread)?'<b class="rp-unread-count">'+conversations.slice(5).reduce((n,c)=>n+c.unread,0)+'</b>':'')+'</button></div></details>'}
 function updateBadge(){for(const host of document.querySelectorAll('[data-chat-badge]')){const open=host.querySelector('details')?.open;host.innerHTML=badge();if(open)host.querySelector('details').open=true}}
 async function refresh(){
  if(!mine()||busy)return;busy=true;const user=mine(),v=epoch;
  try{const delivery=await api('/chat/deliveries');if(user!==mine()||v!==epoch)return;if(delivery.messages.length)await api('/chat/deliveries',{method:'POST',data:{ids:delivery.messages.map(m=>m.id)}});const result=await api('/chat/conversations');if(user!==mine()||v!==epoch)return;conversations=result.conversations;unread=result.unread;updateBadge();
   const list=document.querySelector('[data-chat-conversations]');if(list)list.innerHTML=convRows(conversations.filter(c=>c.title.toLocaleLowerCase().includes((document.querySelector('[data-chat-search]')?.value||'').toLocaleLowerCase())));
   const typing=document.querySelector('[data-chat-typing]');if(typing)typing.textContent=(conversation()?.members||[]).filter(m=>m.id!==mine()&&m.typing_until>Date.now()).map(m=>m.name+' digitando…').join(' · ');
   if(document.querySelector('[data-chat-thread]')&&active)await loadMessages(false);
  }finally{busy=false}
 }
 function messageHtml(m){
  const me=m.author_id===mine(),attachment=m.attachments.map(f=>'<div data-chat-file="'+esc(f.id)+'" data-mime="'+esc(f.mimetype)+'" data-filename="'+esc(f.filename)+'"><button type="button" data-chat-download="'+esc(f.id)+'">📎 '+esc(f.filename)+'</button></div>').join('');
  const location=m.kind==='location'&&!m.deleted_at&&Number.isFinite(m.metadata?.lat)&&Number.isFinite(m.metadata?.lng)?'<a target="_blank" rel="noopener noreferrer" href="https://www.openstreetmap.org/?mlat='+m.metadata.lat+'&mlon='+m.metadata.lng+'#map=17/'+m.metadata.lat+'/'+m.metadata.lng+'">📍 Abrir localização</a>':'';
  return '<article class="chat-bubble '+(me?'is-mine':'')+'" data-chat-message="'+esc(m.id)+'"><strong>'+esc(m.author)+'</strong>'+(m.reply?'<blockquote>'+esc(m.reply.author)+': '+esc(m.reply.body.slice(0,120))+'</blockquote>':'')+'<p>'+esc(m.body)+'</p>'+attachment+location+'<small>'+stamp(m.created_at)+(me?' · <span class="'+(m.state==='visualizada'?'chat-read':'')+'">'+check(m.state)+'</span>':'')+'</small>'+(m.reactions.length?'<p class="chat-reactions">'+m.reactions.map(r=>esc(r.emoji)).join(' ')+'</p>':'')+'<details class="chat-message-actions"><summary aria-label="Opções da mensagem">⋯</summary><div>'+(!m.deleted_at?'<button type="button" data-chat-reply="'+esc(m.id)+'">Responder</button><button type="button" data-chat-forward="'+esc(m.id)+'">Encaminhar</button><button type="button" data-chat-react="'+esc(m.id)+'">Reagir</button>':'')+(me?'<button type="button" data-chat-info="'+esc(m.id)+'">Entrega e leitura</button>':'')+'<button type="button" data-chat-delete="'+esc(m.id)+'">Excluir para mim</button>'+(m.canDelete?'<button type="button" data-chat-delete-all="'+esc(m.id)+'">Excluir para todos</button>':'')+'</div></details></article>';
 }
 function view(){return '<section class="chat-page"><header class="toolbar"><h1>Chat interno</h1><div class="row"><button type="button" data-chat-new>Nova conversa / grupo</button><button type="button" data-chat-profile>Meu telefone</button></div></header><div class="chat-workspace '+(active?'has-active':'')+'"><aside class="chat-sidebar"><label>Buscar conversas<input data-chat-search type="search" placeholder="Nome do contato ou grupo"></label><div data-chat-conversations>'+convRows(conversations)+'</div></aside><section class="chat-main">'+(active?'<header class="chat-thread-heading"><button type="button" data-chat-back aria-label="Voltar às conversas">←</button><div><h2>'+esc(conversation()?.title||'Conversa')+'</h2><small data-chat-typing></small></div>'+(!conversation()?.is_group?'<button type="button" data-chat-call="audio">☎ Áudio</button><button type="button" data-chat-call="video">▣ Vídeo</button>':'')+'</header><label class="chat-message-search">Buscar nesta conversa<input type="search" data-chat-message-search placeholder="Texto da mensagem" value="'+esc(search)+'"></label><button type="button" data-chat-older '+(!hasMore?'hidden':'')+'>Mensagens anteriores</button><div class="chat-thread" data-chat-thread tabindex="0" aria-label="Mensagens da conversa">'+rows.map(messageHtml).join('')+'</div><form data-chat-compose class="chat-composer"><div data-chat-reply-preview></div><label class="sr-only" for="chat-body">Mensagem</label><textarea id="chat-body" name="body" maxlength="4000" placeholder="Mensagem" rows="2">'+esc(drafts.get(active)||'')+'</textarea><div class="chat-compose-tools"><label class="chat-attach">📎 Anexar<input type="file" data-chat-attachment multiple accept="image/*,video/mp4,video/webm,audio/*,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip"></label><button type="button" data-chat-emoji>☺</button><button type="button" data-chat-location>📍</button><button type="button" data-chat-record>🎙 Gravar</button><button type="submit" class="primary">Enviar</button></div><small data-chat-files-label></small><small data-chat-send-state role="status"></small></form>':'<div class="empty">Selecione uma conversa ou inicie uma nova.</div>')+'</section></div></section>'}
 function revoke(){for(const v of urls.values())URL.revokeObjectURL(v);urls.clear()}
 function observe(){observer?.disconnect();if(!active||document.hidden||!document.hasFocus())return;
  const container=document.querySelector('[data-chat-thread]');if(!container)return;
  const cid=active;observer=new IntersectionObserver(entries=>{const ids=entries.filter(e=>e.isIntersecting).map(e=>e.target.dataset.chatMessage);if(!ids.length||document.hidden||cid!==active||!document.hasFocus())return;void api('/chat/conversations/'+cid+'/read',{method:'POST',data:{ids}}).then(refresh).catch(e=>flash(e.message));for(const e of entries)if(e.isIntersecting)observer.unobserve(e.target)},{root:container,threshold:.65});
  for(const el of container.querySelectorAll('[data-chat-message]')){const m=rows.find(m=>m.id===el.dataset.chatMessage);if(m&&m.author_id!==mine()&&!m.read_at)observer.observe(el)}
 }
 async function mount(){await attachments();observe();const el=document.querySelector('[data-chat-thread]');if(el)el.scrollTop=el.scrollHeight}
 async function attachments(){
  for(const el of document.querySelectorAll('[data-chat-file]')){
   const fid=el.dataset.chatFile,type=el.dataset.mime;if(!/^(image|audio|video)\//.test(type))continue;
   try{if(!urls.has(fid)){const blob=await api('/chat/attachments/'+fid);urls.set(fid,URL.createObjectURL(blob))}if(!el.isConnected)continue;const media=document.createElement(type.startsWith('image/')?'img':type.startsWith('audio/')?'audio':'video');media.src=urls.get(fid);if(media.tagName==='IMG'){media.alt=el.dataset.filename;media.loading='lazy'}else{media.controls=true;media.preload='metadata'}el.replaceChildren(media)}catch{if(el.isConnected)el.textContent='Anexo indisponível'}
  }
 }
 async function loadMessages(older=false){
  const cid=active;if(!cid)return;const oldest=older?rows[0]:null;
  const result=await api('/chat/conversations/'+cid+'/messages?'+new URLSearchParams({...(oldest?{before:oldest.created_at,beforeId:oldest.id}:{}),...(search?{q:search}:{})}));if(cid!==active)return;
  hasMore=result.hasMore;
  // Retain already loaded pages while refreshing the latest receipts.
  rows=older?[...result.messages,...rows]:[...rows.filter(m=>!result.messages.some(n=>n.id===m.id)&&result.messages[0]&&m.created_at<result.messages[0].created_at),...result.messages];
  if(!older&&rows.length>50){const old=rows.slice(0,-50),updated=[];for(let i=0;i<old.length;i+=100){const state=await api('/chat/conversations/'+cid+'/message-states',{method:'POST',data:{ids:old.slice(i,i+100).map(m=>m.id)}});updated.push(...state.messages)}if(cid!==active)return;rows=[...updated,...rows.slice(-50)];}
  const el=document.querySelector('[data-chat-thread]');if(!el)return;const bottom=el.scrollHeight-el.scrollTop-el.clientHeight<70,prevHeight=el.scrollHeight,prevScroll=el.scrollTop;
  const html=rows.map(messageHtml).join('');if(el.dataset.snapshot!==html){el.innerHTML=html;el.dataset.snapshot=html;await attachments();if(older)el.scrollTop=prevScroll+(el.scrollHeight-prevHeight);else if(bottom)el.scrollTop=el.scrollHeight;observe()}
  const more=document.querySelector('[data-chat-older]');if(more)more.hidden=!hasMore;
  const valid=new Set(rows.flatMap(m=>m.attachments.map(a=>a.id)));for(const [key,url] of urls)if(!valid.has(key)){URL.revokeObjectURL(url);urls.delete(key)}
 }
 async function open(cid){active=cid;rows=[];reply=null;search='';await loadMessages();navigate('chat');requestAnimationFrame(()=>void mount())}
 function modal(html){document.querySelector('#chat-dialog')?.remove();const d=document.createElement('dialog');d.id='chat-dialog';d.className='rp-record-dialog';d.innerHTML='<button type="button" data-chat-close class="chat-dialog-close" aria-label="Fechar">✕</button>'+html;document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d}
 const close=()=>document.querySelector('#chat-dialog')?.close();
 const fileData=f=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=reject;r.readAsDataURL(f)});
 async function send({body='',attachments=[],kind='text',location,id:mid=crypto.randomUUID(),replyId=reply?.id}={}){
  const cid=active;if(!cid)throw Error('Abra uma conversa');
  const payload={id:mid,body,kind,location,replyId,attachments:await Promise.all(attachments.map(async f=>({filename:f.name||'audio.webm',mimetype:(f.type||'application/octet-stream').split(';')[0],data:await fileData(f)})))};
  await api('/chat/conversations/'+cid+'/messages',{method:'POST',data:payload});reply=null;await refresh();
 }
 async function click(t){
  if(t.hasAttribute('data-chat-close')){close();return true}
  if(t.hasAttribute('data-chat-page')){navigate('chat');return true}
  if(t.dataset.chatOpen){await open(t.dataset.chatOpen);return true}
  if(t.hasAttribute('data-chat-back')){active=null;navigate('chat');return true}
  if(t.hasAttribute('data-chat-older')){await loadMessages(true);return true}
  if(t.hasAttribute('data-chat-new')){
   contacts=(await api('/chat/contacts')).contacts;modal('<h2>Nova conversa ou grupo</h2><form data-chat-create><label>Nome do grupo (ao selecionar vários contatos)<input name="title" maxlength="100"></label><div class="chat-contact-options">'+contacts.map(c=>'<label><input type="checkbox" name="members" value="'+esc(c.id)+'">'+esc(c.name)+' · '+esc(c.role)+'</label>').join('')+'</div><button type="submit" class="primary">Iniciar conversa</button></form>');return true;
  }
  if(t.hasAttribute('data-chat-profile')){modal('<h2>Telefone de contato</h2><p>Exibido à central ao abrir um acionamento de pânico.</p><form data-chat-profile-form><label>Telefone<input type="tel" name="phone" maxlength="35" value="'+esc(getAccount().phone||'')+'"></label><button class="primary">Salvar</button></form>');return true}
  if(t.dataset.chatReply){reply=rows.find(m=>m.id===t.dataset.chatReply);const p=document.querySelector('[data-chat-reply-preview]');p.innerHTML='<small>Respondendo: '+esc(reply.body.slice(0,100))+'</small><button type="button" data-chat-cancel-reply>✕</button>';document.querySelector('#chat-body')?.focus();return true}
  if(t.hasAttribute('data-chat-cancel-reply')){reply=null;document.querySelector('[data-chat-reply-preview]').replaceChildren();return true}
  if(t.dataset.chatDelete||t.dataset.chatDeleteAll){const mid=t.dataset.chatDelete||t.dataset.chatDeleteAll;await api('/chat/messages/'+mid+'?scope='+(t.dataset.chatDeleteAll?'all':'self'),{method:'DELETE'});rows=rows.filter(m=>m.id!==mid);await refresh();return true}
  if(t.dataset.chatInfo){const m=rows.find(m=>m.id===t.dataset.chatInfo);modal('<h2>Entrega e leitura</h2>'+m.receipts.map(r=>'<p><strong>'+esc(r.name)+'</strong><br>Recebida: '+(r.delivered_at?stamp(r.delivered_at):'Pendente')+'<br>Visualizada: '+(r.read_at?stamp(r.read_at):'Pendente')+'</p>').join(''));return true}
  if(t.dataset.chatReact){modal('<h2>Reagir</h2>'+['👍','✅','❤️','😂','😮','⚠️'].map(emoji=>'<button type="button" data-chat-reaction-message="'+esc(t.dataset.chatReact)+'" data-chat-reaction="'+emoji+'">'+emoji+'</button>').join(''));return true}
  if(t.dataset.chatReactionMessage){await api('/chat/messages/'+t.dataset.chatReactionMessage+'/reaction',{method:'POST',data:{emoji:t.dataset.chatReaction}});close();await refresh();return true}
  if(t.dataset.chatForward){const m=rows.find(m=>m.id===t.dataset.chatForward);modal('<h2>Encaminhar mensagem</h2>'+conversations.map(c=>'<button type="button" data-chat-forward-to="'+esc(c.id)+'" data-chat-forward-id="'+esc(m.id)+'">'+esc(c.title)+'</button>').join(''));return true}
  if(t.dataset.chatForwardTo){const m=rows.find(m=>m.id===t.dataset.chatForwardId);const attachments=await Promise.all(m.attachments.map(async f=>new File([await api('/chat/attachments/'+f.id)],f.filename,{type:f.mimetype})));await api('/chat/conversations/'+t.dataset.chatForwardTo+'/messages',{method:'POST',data:{body:m.body,kind:m.kind,location:m.metadata,attachments:await Promise.all(attachments.map(async f=>({filename:f.name,mimetype:f.type,data:await fileData(f)})))}});close();await refresh();flash('Mensagem encaminhada');return true}
  if(t.dataset.chatDownload){const blob=await api('/chat/attachments/'+t.dataset.chatDownload),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=rows.flatMap(m=>m.attachments).find(f=>f.id===t.dataset.chatDownload)?.filename||'anexo';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true}
  if(t.hasAttribute('data-chat-emoji')){const field=document.querySelector('#chat-body');field.setRangeText('😊',field.selectionStart,field.selectionEnd,'end');drafts.set(active,field.value);field.focus();return true}
  if(t.hasAttribute('data-chat-location')){await new Promise((resolve,reject)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>{void send({kind:'location',body:'Localização compartilhada',location:{lat:p.coords.latitude,lng:p.coords.longitude}}).then(resolve,reject)},reject,{timeout:12000,enableHighAccuracy:true}):reject(Error('GPS indisponível')));return true}
  if(t.hasAttribute('data-chat-record')){
   if(recorder&&recorder.state==='recording'){recorder.stop();t.textContent='🎙 Gravar';return true}
   if(!navigator.mediaDevices?.getUserMedia||!globalThis.MediaRecorder)throw Error('Gravação de áudio indisponível neste navegador');
   audioStream=await navigator.mediaDevices.getUserMedia({audio:true});recording=active;recorded=[];recorder=new MediaRecorder(audioStream);recorder.ondataavailable=e=>{if(e.data.size)recorded.push(e.data)};recorder.onstop=()=>{const blob=new Blob(recorded,{type:recorder.mimeType}),cid=recording;audioStream.getTracks().forEach(t=>t.stop());if(active===cid)void send({kind:'audio',attachments:[new File([blob],'mensagem-voz.webm',{type:blob.type})]}).catch(e=>flash(e.message));};recorder.start();t.textContent='⏹ Enviar áudio';return true;
  }
  return false;
 }
 async function submit(form){
  if(form.hasAttribute('data-chat-create')){const d=new FormData(form),members=d.getAll('members');const c=await api('/chat/conversations',{method:'POST',data:{members,title:d.get('title'),isGroup:members.length>1}});close();await refresh();await open(c.id);return true}
  if(form.hasAttribute('data-chat-profile-form')){const phone=new FormData(form).get('phone');await api('/profile',{method:'PUT',data:{phone}});getAccount().phone=phone;close();flash('Telefone salvo');return true}
  if(!form.hasAttribute('data-chat-compose'))return false;if(sending)return true;
  const body=form.elements.body.value,files=[...(form.querySelector('[data-chat-attachment]').files||[])];if(!body.trim()&&!files.length)return true;
  if(files.reduce((n,f)=>n+f.size,0)>15e6)throw Error('Total de anexos deve ter até 15 MB');
  const button=form.querySelector('[type=submit]'),status=form.querySelector('[data-chat-send-state]');button.disabled=true;status.textContent='Enviando…';
  const mid=form.dataset.pendingMessageId||crypto.randomUUID();form.dataset.pendingMessageId=mid;
  sending=send({body,attachments:files,kind:files.length?(files[0].type.startsWith('image/')?'image':files[0].type.startsWith('video/')?'video':files[0].type.startsWith('audio/')?'audio':'document'):'text',id:mid});
  try{await sending;form.reset();drafts.delete(active);delete form.dataset.pendingMessageId;form.querySelector('[data-chat-reply-preview]').replaceChildren();form.querySelector('[data-chat-files-label]').textContent='';status.textContent='Enviada';const el=document.querySelector('[data-chat-thread]');if(el)el.scrollTop=el.scrollHeight}
  catch(e){status.textContent='Falha no envio. Toque em Enviar para tentar novamente.';throw e}finally{sending=null;button.disabled=false}return true;
 }
 document.addEventListener('input',e=>{
  if(e.target.matches('[data-chat-search]')){const list=document.querySelector('[data-chat-conversations]');if(list)list.innerHTML=convRows(conversations.filter(c=>c.title.toLocaleLowerCase().includes(e.target.value.toLocaleLowerCase())))}
  if(e.target.matches('[data-chat-message-search]')){search=e.target.value;rows=[];clearTimeout(e.target._chatTimer);e.target._chatTimer=setTimeout(()=>void loadMessages().catch(e=>flash(e.message)),300)}
  if(e.target.id==='chat-body'){drafts.set(active,e.target.value);const form=e.target.closest('form');if(form&&!sending)delete form.dataset.pendingMessageId;if(Date.now()-lastTyping>3000){lastTyping=Date.now();void api('/chat/conversations/'+active+'/typing',{method:'POST',data:{}}).catch(()=>{})}}
 });
 document.addEventListener('change',e=>{if(e.target.matches('[data-chat-attachment]'))document.querySelector('[data-chat-files-label]').textContent=[...e.target.files].map(f=>f.name).join(' · ')});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)observer?.disconnect();else observe()});globalThis.addEventListener?.('focus',observe);
 function reset(){epoch++;conversations=[];contacts=[];active=null;rows=[];unread=0;drafts.clear();observer?.disconnect();revoke();if(recorder?.state==='recording'){recording=null;recorder.stop()}audioStream?.getTracks().forEach(t=>t.stop());document.querySelector('#chat-dialog')?.close();}
 return {badge,view,refresh,open,mount,click,submit,reset,active:()=>active,conversation};
}
