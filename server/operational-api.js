import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual,createHash,randomUUID} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
const now=()=>Date.now(),id=()=>randomUUID();
const roles=['ronda','operador','admin','master'];
const manager=u=>['admin','master'].includes(u.role);
const reviewer=u=>['operador','admin','master'].includes(u.role);
const authHash=(password,salt)=>scryptSync(password,salt,64).toString('hex');
const resp=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
const serialize=(raw)=>{try{return JSON.parse(raw)}catch{return null}};
const clean=x=>String(x??'').trim();
async function body(req,max=1e6){let n=0;const a=[];for await(const x of req){n+=x.length;if(n>max)throw Object.assign(new Error('Tamanho excedido'),{status:413});a.push(x)}return Buffer.concat(a);}
const presets=[
 ['incident','Ocorrência operacional','manual','high',1,0],
 ['irregularity','Irregularidade','manual','medium',1,0],
 ['support','Solicitação de apoio','manual','high',1,0],
 ['gps_unreliable','GPS com baixa precisão','automatic','medium',1,30],
 ['gps_disabled','GPS desativado','automatic','high',1,20],
 ['patrol_interrupted','Ronda interrompida','automatic','high',1,10],
 ['patrol_late','Atraso na ronda','automatic','medium',1,30],
 ['checkpoint_pending','Ponto não concluído','automatic','medium',1,30],
 ['patrol_completed','Ronda concluída','automatic','low',0,0]
];
function initialize(){
 const file=process.env.RONDA_PRO_DB_PATH,email=clean(process.env.RONDA_PRO_MASTER_EMAIL).toLowerCase(),pass=process.env.RONDA_PRO_MASTER_PASSWORD;
 if(!file||!email||!pass||pass.length<12)return null;
 const path=resolve(file);mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
 const ddl=[
  'CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT NOT NULL UNIQUE,name TEXT NOT NULL,role TEXT NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL,description TEXT NOT NULL DEFAULT "",created_at INTEGER NOT NULL,active INTEGER NOT NULL DEFAULT 1)',
  'CREATE TABLE IF NOT EXISTS tokens(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL,expires_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id))',
  'CREATE TABLE IF NOT EXISTS events(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,kind TEXT NOT NULL,round_id TEXT,occurred_at INTEGER NOT NULL,received_at INTEGER NOT NULL,lat REAL,lng REAL,accuracy REAL,battery REAL,description TEXT NOT NULL,details TEXT NOT NULL DEFAULT "{}",status TEXT NOT NULL DEFAULT "aberta",reviewer_id TEXT,reviewed_at INTEGER,FOREIGN KEY(user_id) REFERENCES users(id))',
  'CREATE INDEX IF NOT EXISTS idx_event_user ON events(user_id,occurred_at)',
  'CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,author_id TEXT NOT NULL,audience TEXT NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL,FOREIGN KEY(event_id) REFERENCES events(id),FOREIGN KEY(author_id) REFERENCES users(id))',
  'CREATE INDEX IF NOT EXISTS idx_messages_event ON messages(event_id,created_at)',
  'CREATE TABLE IF NOT EXISTS media(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,author_id TEXT NOT NULL,mimetype TEXT NOT NULL,filename TEXT NOT NULL,captured_at INTEGER NOT NULL,latitude REAL,longitude REAL,battery REAL,created_at INTEGER NOT NULL,FOREIGN KEY(event_id) REFERENCES events(id))',
  'CREATE TABLE IF NOT EXISTS templates(id TEXT PRIMARY KEY,title TEXT NOT NULL,trigger TEXT NOT NULL,priority TEXT NOT NULL,enabled INTEGER NOT NULL,cooldown_min INTEGER NOT NULL,recipients TEXT NOT NULL DEFAULT "[]",subject TEXT NOT NULL DEFAULT "",message TEXT NOT NULL DEFAULT "")',
  'CREATE TABLE IF NOT EXISTS recipients(email TEXT PRIMARY KEY,enabled INTEGER NOT NULL DEFAULT 1,group_name TEXT NOT NULL DEFAULT "operations")',
  'CREATE TABLE IF NOT EXISTS email_jobs(event_id TEXT PRIMARY KEY,status TEXT NOT NULL,last_error TEXT,at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,action TEXT NOT NULL,subject_id TEXT,at INTEGER NOT NULL)'
 ];for(const statement of ddl)db.exec(statement);
 if(!db.prepare("PRAGMA table_info(recipients)").all().some(x=>x.name==='group_name'))db.exec('ALTER TABLE recipients ADD COLUMN group_name TEXT NOT NULL DEFAULT "operations"');
 if(!db.prepare("SELECT id FROM users WHERE role='master' LIMIT 1").get()){
  const salt=randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users(id,email,name,role,salt,password_hash,description,created_at) VALUES(?,?,?,?,?,?,?,?)')
   .run(id(),email,'Master','master',salt,authHash(pass,salt),'Conta principal',now());
 }
 const insert=db.prepare('INSERT OR IGNORE INTO templates(id,title,trigger,priority,enabled,cooldown_min) VALUES(?,?,?,?,?,?)');
 for(const row of presets)insert.run(...row);
 const defaultGroups={incident:['supervisor'],irregularity:['supervisor'],support:['operations','supervisor'],gps_unreliable:['operations'],gps_disabled:['operations'],patrol_interrupted:['supervisor'],patrol_late:['supervisor'],checkpoint_pending:['supervisor'],patrol_completed:['supervisor']};
 const seedRecipients=db.prepare("UPDATE templates SET recipients=? WHERE id=? AND recipients='[]'");
 for(const [k,v] of Object.entries(defaultGroups))seedRecipients.run(JSON.stringify(v),k);
 return db;
}
export function createOperationalApi(){
 let db=null;try{db=initialize()}catch(e){console.error('SQLite:',e.message);}
 const audit=(u,action,subject)=>db.prepare('INSERT INTO audit(id,user_id,action,subject_id,at) VALUES(?,?,?,?,?)').run(id(),u.id,action,subject,now());
 const userFrom=req=>{
  const match=String(req.headers.authorization||'').match(/^Bearer ([0-9a-f]{64})$/i);if(!match)return null;
  return db.prepare('SELECT u.id,u.name,u.email,u.role,u.active FROM tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>?').get(hash(match[1]),now())||null;
 };
 const event=id=>db.prepare('SELECT * FROM events WHERE id=?').get(id);
 const visible=(u,e)=>u.role!=='ronda'||e.user_id===u.id;
 async function notifyEmail(record,template){
  const targetGroups=serialize(template.recipients)||[];
  const emails=db.prepare('SELECT email,group_name FROM recipients WHERE enabled=1').all().filter(x=>!targetGroups.length||targetGroups.includes(x.group_name)).map(x=>x.email);
  let status='unconfigured',error=null;
  if(emails.length&&process.env.RESEND_API_KEY&&process.env.RONDA_PRO_EMAIL_FROM){
   try{
    const payload={from:process.env.RONDA_PRO_EMAIL_FROM,to:emails,subject:template.subject||'[Rondas Pro] '+template.title,
     text:[template.message||template.title,record.description,new Date(record.occurred_at).toISOString(),
       record.lat==null?'GPS indisponível':record.lat+', '+record.lng,
       record.battery==null?'Bateria não informada':'Bateria '+record.battery+'%'].join('\n')};
    const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':record.id},body:JSON.stringify(payload),signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw new Error('HTTP '+r.status);status='accepted';
   }catch(e){status='failed';error=e.message;}
  }
  db.prepare('INSERT OR REPLACE INTO email_jobs(event_id,status,last_error,at) VALUES(?,?,?,?)').run(record.id,status,error,now());
 }
 return async(req,res)=>{
  if(!new URL(req.url,'http://local').pathname.startsWith('/api/'))return false;
  if(!db){resp(res,503,{error:'API operacional desativada: configurar banco persistente e conta Master no Railway'});return true;}
  const u=new URL(req.url,'http://local'),p=u.pathname,m=req.method,origin=req.headers.origin;
  if(origin&&!['https://'+req.headers.host,'http://'+req.headers.host].includes(origin)){resp(res,403,{error:'Origem inválida'});return true;}
  try{
   if(p==='/api/login'&&m==='POST'){
    const d=serialize((await body(req)).toString())||{},email=clean(d.email).toLowerCase();
    const row=db.prepare('SELECT * FROM users WHERE email=? AND active=1').get(email);
    const candidate=typeof d.password==='string'&&row?authHash(d.password,row.salt):null;
    if(!candidate||!timingSafeEqual(Buffer.from(candidate,'hex'),Buffer.from(row.password_hash,'hex'))){resp(res,401,{error:'Credenciais inválidas'});return true;}
    const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO tokens(token_hash,user_id,expires_at) VALUES(?,?,?)').run(hash(token),row.id,now()+28800000);
    audit(row,'login',row.id);resp(res,200,{token,user:{id:row.id,name:row.name,role:row.role},expiresIn:28800});return true;
   }
   const a=userFrom(req);
   if(!a||!a.active){resp(res,401,{error:'Entre com uma conta operacional'});return true;}
   if(p==='/api/me'&&m==='GET'){resp(res,200,{user:a});return true;}
   if(p==='/api/logout'&&m==='POST'){db.prepare('DELETE FROM tokens WHERE token_hash=?').run(hash(req.headers.authorization.slice(7)));resp(res,200,{ok:true});return true;}
   if(p==='/api/users'&&m==='GET'&&reviewer(a)){resp(res,200,{users:db.prepare('SELECT id,email,name,role,description,created_at,active FROM users').all()});return true;}
   if(p==='/api/users'&&m==='POST'&&manager(a)){
    const d=serialize((await body(req)).toString())||{},name=clean(d.name),email=clean(d.email).toLowerCase(),description=clean(d.description);
    if(!roles.includes(d.role)||d.role==='master'&&a.role!=='master'||!email.includes('@')||name.length<2||typeof d.password!=='string'||d.password.length<12||d.role==='ronda'&&description.length<10){resp(res,422,{error:'Cadastro inválido; vigia exige descrição da supervisão'});return true;}
    const salt=randomBytes(16).toString('hex'),uid=id();
    db.prepare('INSERT INTO users(id,email,name,role,salt,password_hash,description,created_at) VALUES(?,?,?,?,?,?,?,?)').run(uid,email,name,d.role,salt,authHash(d.password,salt),description,now());
    audit(a,'user.create',uid);resp(res,201,{id:uid});return true;
   }
   if(p==='/api/events'&&m==='POST'){
    const d=serialize((await body(req)).toString())||{},position=d.position??null,battery=d.battery??null,details=JSON.stringify(d.details??{});
    if(!['panic','gps','battery','checkpoint','incident','alert','patrol_start','patrol_end','media','gps_issue','route_deviation'].includes(d.kind)||!Number.isFinite(d.occurredAt)||Math.abs(now()-d.occurredAt)>30*86400000||clean(d.description).length>2000||details.length>10000||battery!=null&&(!Number.isFinite(battery)||battery<0||battery>100)||position&&(!Number.isFinite(position.lat)||!Number.isFinite(position.lng)||Math.abs(position.lat)>90||Math.abs(position.lng)>180)){
     resp(res,422,{error:'Evento inválido'});return true;
    }
    const eid=/^[0-9a-z-]{8,80}$/i.test(d.id||'')?d.id:id();
    const existing=event(eid);
    if(existing){resp(res,existing.user_id===a.id?200:409,{id:eid,duplicate:true});return true;}
    db.prepare('INSERT INTO events(id,user_id,kind,round_id,occurred_at,received_at,lat,lng,accuracy,battery,description,details) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(eid,a.id,d.kind,clean(d.roundId)||null,d.occurredAt,now(),position?.lat??null,position?.lng??null,position?.accuracy??null,battery,clean(d.description),details);
    audit(a,'event.create',eid);
    if(d.kind==='alert'){
     const template=db.prepare('SELECT * FROM templates WHERE id=? AND enabled=1').get(clean(d.details?.templateId));
     if(template)void notifyEmail(event(eid),template);
    }
    resp(res,201,{id:eid,stored:true});return true;
   }
   if(p==='/api/events'&&m==='GET'){
    const limit=Math.min(500,Math.max(1,Number(u.searchParams.get('limit'))||100));
    const rows=a.role==='ronda'?db.prepare('SELECT * FROM events WHERE user_id=? ORDER BY occurred_at DESC LIMIT ?').all(a.id,limit):db.prepare('SELECT * FROM events ORDER BY occurred_at DESC LIMIT ?').all(limit);
    resp(res,200,{events:rows.map(x=>({...x,details:serialize(x.details),position:x.lat==null?null:{lat:x.lat,lng:x.lng,accuracy:x.accuracy}}))});return true;
   }
   const messages=p.match(/^\/api\/events\/([0-9a-z-]+)\/messages$/i);
   if(messages){
    const ev=event(messages[1]);if(!ev||!visible(a,ev)){resp(res,404,{error:'Evento não encontrado'});return true;}
    if(m==='GET'){const rows=reviewer(a)?db.prepare('SELECT m.*,u.name author FROM messages m JOIN users u ON u.id=m.author_id WHERE m.event_id=? ORDER BY created_at').all(ev.id):db.prepare("SELECT m.*,u.name author FROM messages m JOIN users u ON u.id=m.author_id WHERE m.event_id=? AND audience='general' ORDER BY created_at").all(ev.id);resp(res,200,{messages:rows});return true;}
    if(m==='POST'){
     const d=serialize((await body(req)).toString())||{},b=clean(d.body),audience=d.audience||'general';
     if(b.length<1||b.length>4000||!['general','system'].includes(audience)||audience==='system'&&!reviewer(a)){resp(res,422,{error:'Mensagem inválida'});return true;}
     const mid=id();db.prepare('INSERT INTO messages(id,event_id,author_id,audience,body,created_at) VALUES(?,?,?,?,?,?)').run(mid,ev.id,a.id,audience,b,now());
     audit(a,'message.create',ev.id);resp(res,201,{id:mid});return true;
    }
   }
   const review=p.match(/^\/api\/events\/([0-9a-z-]+)\/review$/i);
   if(review&&m==='POST'&&reviewer(a)){
    const ev=event(review[1]),d=serialize((await body(req)).toString())||{};
    if(!ev){resp(res,404,{error:'Não encontrado'});return true;}
    if(!['aberta','em_analise','resolvida'].includes(d.status)||d.status==='resolvida'&&clean(d.note).length<10){resp(res,422,{error:'Estado ou justificativa inválidos'});return true;}
    db.prepare('UPDATE events SET status=?,reviewer_id=?,reviewed_at=? WHERE id=?').run(d.status,a.id,now(),ev.id);
    if(clean(d.note))db.prepare('INSERT INTO messages(id,event_id,author_id,audience,body,created_at) VALUES(?,?,?,?,?,?)').run(id(),ev.id,a.id,'system',clean(d.note).slice(0,4000),now());
    audit(a,'event.review',ev.id);resp(res,200,{ok:true});return true;
   }
   if(p==='/api/templates'&&m==='GET'){const rows=reviewer(a)?db.prepare('SELECT * FROM templates').all():db.prepare("SELECT id,title,trigger,priority,enabled,cooldown_min FROM templates WHERE enabled=1 AND trigger='manual'").all();resp(res,200,{templates:rows});return true;}
   if(p==='/api/templates'&&m==='POST'&&manager(a)){
    const d=serialize((await body(req)).toString())||{},tid=clean(d.id)||id();
    if(!/^[\w-]{3,70}$/.test(tid)||clean(d.title).length<3||!['manual','automatic'].includes(d.trigger)||!['low','medium','high'].includes(d.priority)||!Number.isInteger(d.cooldownMin)||d.cooldownMin<0||d.cooldownMin>10080||!Array.isArray(d.recipients)){resp(res,422,{error:'Modelo inválido'});return true;}
    db.prepare('INSERT INTO templates(id,title,trigger,priority,enabled,cooldown_min,recipients,subject,message) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,trigger=excluded.trigger,priority=excluded.priority,enabled=excluded.enabled,cooldown_min=excluded.cooldown_min,recipients=excluded.recipients,subject=excluded.subject,message=excluded.message')
     .run(tid,clean(d.title).slice(0,120),d.trigger,d.priority,d.enabled?1:0,d.cooldownMin,JSON.stringify(d.recipients).slice(0,3000),clean(d.subject).slice(0,160),clean(d.message).slice(0,1000));
    audit(a,'template.save',tid);resp(res,200,{id:tid});return true;
   }
   if(p==='/api/recipients'&&m==='GET'&&manager(a)){resp(res,200,{recipients:db.prepare('SELECT * FROM recipients').all()});return true;}
   if(p==='/api/recipients'&&m==='POST'&&manager(a)){
    const d=serialize((await body(req)).toString())||{},email=clean(d.email).toLowerCase(),group=clean(d.groupName)||'operations';
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['supervisor','operations','management','master'].includes(group)){resp(res,422,{error:'E-mail ou grupo inválido'});return true;}
    db.prepare('INSERT INTO recipients(email,enabled,group_name) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET enabled=excluded.enabled,group_name=excluded.group_name').run(email,d.enabled===false?0:1,group);
    audit(a,'recipient.save',email);resp(res,200,{ok:true});return true;
   }
   if(p==='/api/dashboard'&&m==='GET'&&reviewer(a)){
    resp(res,200,{source:'sqlite',metrics:db.prepare('SELECT kind,COUNT(*) count FROM events GROUP BY kind').all(),team:db.prepare("SELECT u.id,u.name,u.description,COUNT(e.id) events,SUM(CASE WHEN e.kind='panic' THEN 1 ELSE 0 END) panics FROM users u LEFT JOIN events e ON e.user_id=u.id WHERE u.role='ronda' GROUP BY u.id").all(),updatedAt:now()});return true;
   }
   if(p==='/api/media'&&m==='POST'){
    const eid=clean(req.headers['x-ronda-event-id']),ev=event(eid);
    if(!ev||!visible(a,ev)){resp(res,404,{error:'Evento não encontrado'});return true;}
    const mime=clean(req.headers['content-type']).split(';')[0];
    const types=['image/jpeg','image/png','image/webp','video/mp4','video/webm'];
    if(!types.includes(mime)){resp(res,415,{error:'Formato não autorizado'});return true;}
    const bytes=await body(req,25*1024*1024);
    const magic=bytes.subarray(0,12);
    const correct=(mime==='image/jpeg'&&magic[0]===255&&magic[1]===216)
      ||(mime==='image/png'&&magic.subarray(1,4).toString()==='PNG')
      ||(mime==='image/webp'&&magic.subarray(8,12).toString()==='WEBP')
      ||(mime==='video/mp4'&&magic.subarray(4,8).toString()==='ftyp')
      ||(mime==='video/webm'&&magic.subarray(0,4).equals(Buffer.from([26,69,223,163])));
    if(!correct){resp(res,415,{error:'Conteúdo do arquivo incompatível'});return true;}
    const mediaId=id(),folder=resolve(dirname(process.env.RONDA_PRO_DB_PATH),'media');
    mkdirSync(folder,{recursive:true});writeFileSync(join(folder,mediaId),bytes,{flag:'wx',mode:0o600});
    const captured=Number(req.headers['x-captured-at']);
    db.prepare('INSERT INTO media(id,event_id,author_id,mimetype,filename,captured_at,latitude,longitude,battery,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
     .run(mediaId,eid,a.id,mime,mediaId,Number.isFinite(captured)&&captured>0?captured:now(),ev.lat,ev.lng,ev.battery,now());
    audit(a,'media.upload',eid);resp(res,201,{id:mediaId});return true;
   }
   const mediaPath=p.match(/^\/api\/media\/([0-9a-f-]+)$/i);
   if(mediaPath&&m==='GET'){
    const item=db.prepare('SELECT * FROM media WHERE id=?').get(mediaPath[1]),ev=item&&event(item.event_id);
    if(!ev||!visible(a,ev)){resp(res,404,{error:'Mídia não encontrada'});return true;}
    const bytes=readFileSync(join(resolve(dirname(process.env.RONDA_PRO_DB_PATH),'media'),item.filename));
    res.writeHead(200,{'Content-Type':item.mimetype,'Content-Disposition':'inline','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(bytes);return true;
   }
   if(p==='/api/events/media'&&m==='GET'){
    const eid=clean(u.searchParams.get('eventId')),ev=event(eid);
    if(!ev||!visible(a,ev)){resp(res,404,{error:'Evento não encontrado'});return true;}
    resp(res,200,{media:db.prepare('SELECT id,mimetype,captured_at,latitude,longitude,battery FROM media WHERE event_id=? ORDER BY created_at').all(eid)});return true;
   }
   if(p==='/api/export'&&m==='GET'&&manager(a)){
    const events=db.prepare('SELECT * FROM events ORDER BY occurred_at DESC LIMIT 50000').all(),messages=db.prepare('SELECT m.*,u.name author FROM messages m JOIN users u ON u.id=m.author_id ORDER BY m.created_at DESC LIMIT 50000').all();
    audit(a,'export',null);resp(res,200,{source:'sqlite',at:now(),events,messages,limit:50000});return true;
   }
   resp(res,404,{error:'Endpoint não encontrado ou acesso não autorizado'});return true;
  }catch(e){console.error('Erro operacional:',e.message);resp(res,e.status||500,{error:e.status===413?'Limite de tamanho excedido':'Falha no processamento'});return true;}
 };
}
