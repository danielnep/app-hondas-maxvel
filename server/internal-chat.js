// Chat privado: participação, entrega e leitura são verificadas no servidor.
const clean=x=>String(x??'').trim();
const fail=(status,message)=>{throw Object.assign(new Error(message),{status})};
export function createInternalChat(db,{now,id,audit,resp,body,serialize}){
 db.exec(`
 CREATE TABLE IF NOT EXISTS chat_conversations(id TEXT PRIMARY KEY,title TEXT NOT NULL DEFAULT '',is_group INTEGER NOT NULL DEFAULT 0,created_by TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS chat_members(conversation_id TEXT NOT NULL,user_id TEXT NOT NULL,typing_until INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(conversation_id,user_id));
 CREATE TABLE IF NOT EXISTS chat_messages(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL,author_id TEXT NOT NULL,body TEXT NOT NULL,kind TEXT NOT NULL DEFAULT 'text',reply_id TEXT,created_at INTEGER NOT NULL,deleted_at INTEGER,metadata TEXT NOT NULL DEFAULT '{}');
 CREATE INDEX IF NOT EXISTS idx_chat_timeline ON chat_messages(conversation_id,created_at,id);
 CREATE TABLE IF NOT EXISTS chat_receipts(message_id TEXT NOT NULL,user_id TEXT NOT NULL,delivered_at INTEGER,read_at INTEGER,hidden_at INTEGER,PRIMARY KEY(message_id,user_id));
 CREATE INDEX IF NOT EXISTS idx_chat_unread ON chat_receipts(user_id,read_at);
 CREATE TABLE IF NOT EXISTS chat_attachments(id TEXT PRIMARY KEY,message_id TEXT NOT NULL,mimetype TEXT NOT NULL,filename TEXT NOT NULL,bytes BLOB NOT NULL);
 CREATE TABLE IF NOT EXISTS chat_reactions(message_id TEXT NOT NULL,user_id TEXT NOT NULL,emoji TEXT NOT NULL,PRIMARY KEY(message_id,user_id));
 CREATE TABLE IF NOT EXISTS chat_signals(id TEXT PRIMARY KEY,conversation_id TEXT NOT NULL,author_id TEXT NOT NULL,recipient_id TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL);
 `);
 const member=(cid,uid)=>!!db.prepare('SELECT 1 FROM chat_members WHERE conversation_id=? AND user_id=?').get(cid,uid);
 const requireMember=(cid,u)=>{if(!member(cid,u.id))fail(404,'Conversa não encontrada')};
 const contact=(u,v)=>u.id!==v.id&&v.active&&(u.role!=='cliente'&&v.role!=='cliente'||!!u.site&&u.site===v.site&&(['admin','master','coi','operador'].includes(u.role)||['admin','master','coi','operador'].includes(v.role)));
 const getMessage=(mid,u)=>{const m=db.prepare('SELECT * FROM chat_messages WHERE id=?').get(mid);if(!m)fail(404,'Mensagem não encontrada');requireMember(m.conversation_id,u);return m};
 const message=(m,u)=>{
  const mine=db.prepare('SELECT * FROM chat_receipts WHERE message_id=? AND user_id=?').get(m.id,u.id);
  if(mine?.hidden_at)return null;
  const receipts=db.prepare('SELECT r.user_id,u.name,r.delivered_at,r.read_at FROM chat_receipts r JOIN users u ON u.id=r.user_id WHERE message_id=? AND r.user_id<>?').all(m.id,m.author_id);
  const state=receipts.length&&receipts.every(x=>x.read_at)?'visualizada':receipts.length&&receipts.every(x=>x.delivered_at)?'recebida':'enviada';
  const reply=m.reply_id?db.prepare('SELECT m.id,m.body,m.deleted_at,u.name author FROM chat_messages m JOIN users u ON u.id=m.author_id WHERE m.id=? AND m.conversation_id=?').get(m.reply_id,m.conversation_id):null;
  return {...m,read_at:mine?.read_at||null,body:m.deleted_at?'Mensagem excluída':m.body,metadata:m.deleted_at?{}:serialize(m.metadata),author:db.prepare('SELECT name FROM users WHERE id=?').get(m.author_id)?.name,state,receipts:m.author_id===u.id?receipts:[],canDelete:m.author_id===u.id&&!m.deleted_at&&!receipts.some(x=>x.read_at),reply:reply?{...reply,body:reply.deleted_at?'Mensagem excluída':reply.body}:null,
   attachments:m.deleted_at?[]:db.prepare('SELECT id,mimetype,filename FROM chat_attachments WHERE message_id=?').all(m.id),reactions:m.deleted_at?[]:db.prepare('SELECT user_id,emoji FROM chat_reactions WHERE message_id=?').all(m.id)};
 };
 return {async handle(req,res,u,p,method){
  if(!p.startsWith('/api/chat'))return false;
  const url=new URL(req.url,'http://local'),parts=p.slice('/api/chat'.length).split('/').filter(Boolean);
  const data=async()=>serialize((await body(req,23e6)).toString())||{};
  if(parts[0]==='signals'&&method==='GET'){resp(res,200,{signals:db.prepare('SELECT s.* FROM chat_signals s JOIN chat_members m ON m.conversation_id=s.conversation_id AND m.user_id=? WHERE s.recipient_id=? AND s.created_at>? ORDER BY s.created_at,s.id').all(u.id,u.id,Math.max(Number(url.searchParams.get('since'))||0,now()-120000)).map(s=>({...s,body:serialize(s.body)}))});return true;}
  if(parts[0]==='config'&&method==='GET'){let iceServers=[];try{iceServers=JSON.parse(process.env.RONDA_PRO_ICE_SERVERS||'[]')}catch{}resp(res,200,{iceServers});return true;}
  if(parts[0]==='deliveries'){
   if(method==='GET'){const rows=db.prepare('SELECT m.* FROM chat_receipts r JOIN chat_messages m ON m.id=r.message_id JOIN chat_members c ON c.conversation_id=m.conversation_id AND c.user_id=r.user_id WHERE r.user_id=? AND r.delivered_at IS NULL AND r.hidden_at IS NULL AND m.deleted_at IS NULL ORDER BY m.created_at,m.id LIMIT 100').all(u.id);resp(res,200,{messages:rows.map(m=>message(m,u))});return true;}
   if(method==='POST'){const d=await data();if(!Array.isArray(d.ids)||d.ids.length>100)fail(422,'Lista de entrega inválida');for(const mid of d.ids)getMessage(mid,u);for(const mid of d.ids)db.prepare('UPDATE chat_receipts SET delivered_at=COALESCE(delivered_at,?) WHERE message_id=? AND user_id=? AND hidden_at IS NULL').run(now(),mid,u.id);resp(res,200,{ok:true});return true;}
  }
  if(parts[0]==='contacts'&&method==='GET'){
   resp(res,200,{contacts:db.prepare('SELECT id,name,role,site,active FROM users WHERE active=1 ORDER BY name').all().filter(v=>contact(u,v)).map(({active,...v})=>v)});return true;
  }
  if(parts[0]==='conversations'&&!parts[1]){
   if(method==='POST'){
    const d=await data(),ids=[...new Set([u.id,...(Array.isArray(d.members)?d.members:[])])];
    if(ids.length<2||ids.length>50)fail(422,'Selecione de 1 a 49 contatos');
    for(const uid of ids.filter(x=>x!==u.id)){const v=db.prepare('SELECT * FROM users WHERE id=?').get(uid);if(!v||!contact(u,v))fail(403,'Contato não autorizado')}
    const group=ids.length>2||!!d.isGroup,title=clean(d.title).slice(0,100);
    if(group&&!title)fail(422,'Informe o nome do grupo');
    if(!group){const found=db.prepare('SELECT c.id FROM chat_conversations c JOIN chat_members a ON a.conversation_id=c.id JOIN chat_members b ON b.conversation_id=c.id WHERE c.is_group=0 AND a.user_id=? AND b.user_id=?').get(u.id,ids.find(x=>x!==u.id));if(found){resp(res,200,found);return true}}
    const cid=id();db.exec('BEGIN IMMEDIATE');try{
     db.prepare('INSERT INTO chat_conversations(id,title,is_group,created_by,created_at) VALUES(?,?,?,?,?)').run(cid,title,group?1:0,u.id,now());
     for(const uid of ids)db.prepare('INSERT INTO chat_members(conversation_id,user_id) VALUES(?,?)').run(cid,uid);
     audit(u,'chat.create',cid);db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e}resp(res,201,{id:cid});return true;
   }
   if(method==='GET'){
    const list=db.prepare('SELECT c.* FROM chat_conversations c JOIN chat_members m ON m.conversation_id=c.id WHERE m.user_id=?').all(u.id).map(c=>{
     const members=db.prepare('SELECT u.id,u.name,u.role,m.typing_until FROM chat_members m JOIN users u ON u.id=m.user_id WHERE m.conversation_id=?').all(c.id);
     const last=db.prepare('SELECT m.* FROM chat_messages m LEFT JOIN chat_receipts r ON r.message_id=m.id AND r.user_id=? WHERE m.conversation_id=? AND r.hidden_at IS NULL ORDER BY m.created_at DESC,m.id DESC LIMIT 1').get(u.id,c.id);
     const unread=db.prepare('SELECT COUNT(*) n FROM chat_receipts r JOIN chat_messages m ON m.id=r.message_id WHERE r.user_id=? AND r.read_at IS NULL AND r.hidden_at IS NULL AND m.author_id<>? AND m.deleted_at IS NULL AND m.conversation_id=?').get(u.id,u.id,c.id).n;
     return {...c,title:c.is_group?c.title:members.find(v=>v.id!==u.id)?.name||'Conversa',members,last:last?message(last,u):null,unread,updated_at:last?.created_at||c.created_at};
    }).sort((a,b)=>b.updated_at-a.updated_at||b.id.localeCompare(a.id));
    resp(res,200,{conversations:list,unread:list.reduce((n,c)=>n+c.unread,0)});return true;
   }
  }
  if(parts[0]==='conversations'&&parts[1]){
   const cid=parts[1];requireMember(cid,u);
   if(parts[2]==='message-states'&&method==='POST'){
    const d=await data();if(!Array.isArray(d.ids)||d.ids.length>100)fail(422,'Lista de mensagens inválida');
    const list=[];for(const mid of d.ids){const msg=getMessage(mid,u);if(msg.conversation_id!==cid)fail(422,'Mensagem fora da conversa');const value=message(msg,u);if(value)list.push(value)}
    resp(res,200,{messages:list});return true;
   }
   if(parts[2]==='typing'&&method==='POST'){db.prepare('UPDATE chat_members SET typing_until=? WHERE conversation_id=? AND user_id=?').run(now()+6000,cid,u.id);resp(res,200,{ok:true});return true}
   if(parts[2]==='messages'){
    if(method==='GET'){
     const before=Number(url.searchParams.get('before'))||Number.MAX_SAFE_INTEGER,beforeId=url.searchParams.get('beforeId')||'~',q=clean(url.searchParams.get('q')).slice(0,200);
     const rows=db.prepare('SELECT m.* FROM chat_messages m LEFT JOIN chat_receipts r ON r.message_id=m.id AND r.user_id=? WHERE m.conversation_id=? AND (m.created_at<? OR (m.created_at=? AND m.id<?)) AND r.hidden_at IS NULL AND (?=\'\' OR (m.deleted_at IS NULL AND instr(lower(m.body),lower(?))>0)) ORDER BY m.created_at DESC,m.id DESC LIMIT 51').all(u.id,cid,before,before,beforeId,q,q);
     const items=rows.slice(0,50);
     for(const m of items)if(m.author_id!==u.id)db.prepare('UPDATE chat_receipts SET delivered_at=COALESCE(delivered_at,?) WHERE message_id=? AND user_id=?').run(now(),m.id,u.id);
     resp(res,200,{messages:items.reverse().map(m=>message(m,u)),hasMore:rows.length>50});return true;
    }
    if(method==='POST'){
     const d=await data(),text=clean(d.body),kind=d.kind||'text',attachments=Array.isArray(d.attachments)?d.attachments:[];
     if(text.length>4000||attachments.length>4||!['text','image','video','audio','document','location'].includes(kind)||(!text&&!attachments.length&&kind!=='location'))fail(422,'Mensagem inválida');
     if(d.replyId&&!db.prepare('SELECT id FROM chat_messages WHERE id=? AND conversation_id=?').get(d.replyId,cid))fail(422,'Resposta fora da conversa');
     if(kind==='location'&&(!Number.isFinite(d.location?.lat)||!Number.isFinite(d.location?.lng)||Math.abs(d.location.lat)>90||Math.abs(d.location.lng)>180))fail(422,'Localização inválida');
     const files=attachments.map(f=>{
      if(!/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm)|audio\/(webm|ogg|mp4|mpeg)|application\/(pdf|octet-stream|zip|vnd\.[a-zA-Z0-9.+-]+)|text\/plain)$/.test(f.mimetype||''))fail(422,'Formato de anexo não permitido');
      if(typeof f.data!=='string'||! /^[A-Za-z0-9+/]*={0,2}$/.test(f.data))fail(422,'Anexo inválido');
      const bytes=Buffer.from(f.data,'base64');if(!bytes.length||bytes.length>15e6)fail(413,'Anexo deve ter até 15 MB');
      return {bytes,mimetype:f.mimetype,filename:clean(f.filename).replace(/[\r\n"\\/]/g,'_').slice(0,150)||'anexo'};
     });if(files.reduce((n,f)=>n+f.bytes.length,0)>15e6)fail(413,'Total de anexos deve ter até 15 MB');
     // A chave gerada pelo dispositivo permite reenvio sem duplicar a mensagem.
     const mid=/^[a-f0-9-]{36}$/i.test(d.id||'')?d.id:id(),old=db.prepare('SELECT * FROM chat_messages WHERE id=?').get(mid);
     if(old){if(old.author_id!==u.id||old.conversation_id!==cid)fail(409,'Chave de mensagem já utilizada');resp(res,200,{message:message(old,u)});return true}
     const at=now();db.exec('BEGIN IMMEDIATE');try{
      db.prepare('INSERT INTO chat_messages(id,conversation_id,author_id,body,kind,reply_id,created_at,metadata) VALUES(?,?,?,?,?,?,?,?)').run(mid,cid,u.id,text,kind,d.replyId||null,at,JSON.stringify(kind==='location'?d.location:{}));
      for(const v of db.prepare('SELECT user_id FROM chat_members WHERE conversation_id=?').all(cid))db.prepare('INSERT INTO chat_receipts(message_id,user_id,delivered_at,read_at) VALUES(?,?,?,?)').run(mid,v.user_id,v.user_id===u.id?at:null,v.user_id===u.id?at:null);
      for(const f of files)db.prepare('INSERT INTO chat_attachments(id,message_id,mimetype,filename,bytes) VALUES(?,?,?,?,?)').run(id(),mid,f.mimetype,f.filename,f.bytes);
      audit(u,'chat.send',mid);db.exec('COMMIT');
     }catch(e){db.exec('ROLLBACK');throw e}resp(res,201,{message:message(db.prepare('SELECT * FROM chat_messages WHERE id=?').get(mid),u)});return true;
    }
   }
   if(parts[2]==='read'&&method==='POST'){
    const d=await data();if(!Array.isArray(d.ids)||d.ids.length>100)fail(422,'Lista de leitura inválida');
    for(const mid of d.ids){const msg=getMessage(mid,u);if(msg.conversation_id!==cid)fail(422,'Mensagem fora da conversa')}
    db.exec('BEGIN IMMEDIATE');try{for(const mid of d.ids)db.prepare('UPDATE chat_receipts SET delivered_at=COALESCE(delivered_at,?),read_at=COALESCE(read_at,?) WHERE message_id=? AND user_id=? AND hidden_at IS NULL').run(now(),now(),mid,u.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
    resp(res,200,{ok:true});return true;
   }
   if(parts[2]==='signals'){
    if(method==='GET'){resp(res,200,{signals:db.prepare('SELECT * FROM chat_signals WHERE conversation_id=? AND recipient_id=? AND created_at>? ORDER BY created_at,id').all(cid,u.id,Math.max(Number(url.searchParams.get('since'))||0,now()-120000)).map(s=>({...s,body:serialize(s.body)}))});return true}
    if(method==='POST'){const d=await data();if(!member(cid,d.recipientId)||d.recipientId===u.id||!['offer','answer','ice','hangup'].includes(d.signal?.type)||JSON.stringify(d.signal).length>20000)fail(422,'Sinal inválido');db.prepare('INSERT INTO chat_signals VALUES(?,?,?,?,?,?)').run(id(),cid,u.id,d.recipientId,JSON.stringify(d.signal),now());resp(res,201,{ok:true});return true}
   }
  }
  if(parts[0]==='messages'&&parts[1]){
   const msg=getMessage(parts[1],u);
   if(parts[2]==='reaction'&&method==='POST'){if(msg.deleted_at)fail(409,'Mensagem excluída');const d=await data(),emoji=clean(d.emoji);if(emoji.length>16)fail(422,'Reação inválida');if(emoji)db.prepare('INSERT OR REPLACE INTO chat_reactions VALUES(?,?,?)').run(msg.id,u.id,emoji);else db.prepare('DELETE FROM chat_reactions WHERE message_id=? AND user_id=?').run(msg.id,u.id);resp(res,200,{ok:true});return true}
   if(method==='DELETE'){
    const all=url.searchParams.get('scope')==='all';
    db.exec('BEGIN IMMEDIATE');try{
     if(all){if(msg.author_id!==u.id)fail(403,'Somente o autor pode excluir para todos');if(db.prepare('SELECT 1 FROM chat_receipts WHERE message_id=? AND user_id<>? AND read_at IS NOT NULL').get(msg.id,u.id))fail(409,'Mensagem já visualizada: exclusão para todos indisponível');db.prepare("UPDATE chat_messages SET deleted_at=COALESCE(deleted_at,?),body='',metadata='{}' WHERE id=?").run(now(),msg.id);db.prepare('DELETE FROM chat_attachments WHERE message_id=?').run(msg.id);db.prepare('DELETE FROM chat_reactions WHERE message_id=?').run(msg.id);}
     else db.prepare('UPDATE chat_receipts SET hidden_at=? WHERE message_id=? AND user_id=?').run(now(),msg.id,u.id);
     audit(u,all?'chat.delete_all':'chat.delete_self',msg.id);db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e}resp(res,200,{ok:true});return true;
   }
  }
  if(parts[0]==='attachments'&&parts[1]&&method==='GET'){
   const f=db.prepare('SELECT a.*,m.conversation_id,m.deleted_at FROM chat_attachments a JOIN chat_messages m ON m.id=a.message_id WHERE a.id=?').get(parts[1]);
   if(!f)fail(404,'Anexo não encontrado');requireMember(f.conversation_id,u);
   if(f.deleted_at||db.prepare('SELECT hidden_at FROM chat_receipts WHERE message_id=? AND user_id=?').get(f.message_id,u.id)?.hidden_at)fail(404,'Anexo não encontrado');
   res.writeHead(200,{'Content-Type':f.mimetype,'Content-Disposition':'attachment; filename="'+f.filename.replace(/[^\x20-\x7E]/g,'_')+'"','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(Buffer.from(f.bytes));return true;
  }
  fail(404,'Recurso de chat não encontrado');
 }};
}
