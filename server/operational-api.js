import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {dirname,resolve,join} from 'node:path';
import {randomBytes,scryptSync,timingSafeEqual,createHash,randomUUID} from 'node:crypto';
import {addTrackSample} from '../src/field-intelligence.js';
import {validateConclusion} from '../src/conclusion-validation.js';
import {createOpsCenter} from './ops-center.js';
import {createInternalChat} from './internal-chat.js';
import {createActivityHistory} from './activity-history.js';
import {createTreatments} from './treatments.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const now=()=>Date.now(),id=()=>randomUUID();
const roles=['ronda','operador','admin','master','coi','cliente','vistoriador'];
const manager=u=>['admin','master'].includes(u.role);
const reviewer=u=>['operador','admin','master','coi'].includes(u.role);
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
 if(!file||!email||!pass||pass.length<(process.env.RONDA_PRO_PILOT_PASSWORD?10:12))return null;
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
  'CREATE TABLE IF NOT EXISTS audit(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,action TEXT NOT NULL,subject_id TEXT,at INTEGER NOT NULL)',
  'CREATE TABLE IF NOT EXISTS planned_routes(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,site TEXT NOT NULL,name TEXT NOT NULL,points TEXT NOT NULL,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,created_by TEXT NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id))',
  'CREATE INDEX IF NOT EXISTS idx_planned_routes_user ON planned_routes(user_id,updated_at)',
  'CREATE TABLE IF NOT EXISTS event_treatments(id TEXT PRIMARY KEY,event_id TEXT NOT NULL,author_id TEXT NOT NULL,from_status TEXT NOT NULL,to_status TEXT NOT NULL,conclusion TEXT NOT NULL,created_at INTEGER NOT NULL,FOREIGN KEY(event_id) REFERENCES events(id))',
  'CREATE INDEX IF NOT EXISTS idx_treatment_event ON event_treatments(event_id,created_at)'
 ];for(const statement of ddl)db.exec(statement);
 // Migrações aditivas: nunca substituir nem apagar evidências e registros anteriores.
 if(!db.prepare('PRAGMA table_info(media)').all().some(x=>x.name==='evidence_view'))db.exec("ALTER TABLE media ADD COLUMN evidence_view TEXT NOT NULL DEFAULT ''");
 if(!db.prepare('PRAGMA table_info(planned_routes)').all().some(x=>x.name==='planned_start'))db.exec('ALTER TABLE planned_routes ADD COLUMN planned_start INTEGER');
 if(!db.prepare('PRAGMA table_info(planned_routes)').all().some(x=>x.name==='route_schedule'))db.exec("ALTER TABLE planned_routes ADD COLUMN route_schedule TEXT NOT NULL DEFAULT '{}'");
 if(!db.prepare('PRAGMA table_info(users)').all().some(x=>x.name==='phone'))db.exec("ALTER TABLE users ADD COLUMN phone TEXT NOT NULL DEFAULT ''");
 if(!db.prepare('PRAGMA table_info(users)').all().some(x=>x.name==='username'))db.exec("ALTER TABLE users ADD COLUMN username TEXT");
 db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username COLLATE NOCASE) WHERE username IS NOT NULL");
 // Migrações aditivas: vínculos de unidade para segregação segura do acesso cliente.
 if(!db.prepare('PRAGMA table_info(users)').all().some(x=>x.name==='site'))db.exec("ALTER TABLE users ADD COLUMN site TEXT NOT NULL DEFAULT ''");
 if(!db.prepare('PRAGMA table_info(events)').all().some(x=>x.name==='site'))db.exec("ALTER TABLE events ADD COLUMN site TEXT NOT NULL DEFAULT ''");
 db.exec('CREATE INDEX IF NOT EXISTS idx_events_site_time ON events(site,occurred_at)');
 db.exec('CREATE TABLE IF NOT EXISTS app_state(user_id TEXT PRIMARY KEY,data TEXT NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(user_id) REFERENCES users(id))');
 if(!db.prepare("PRAGMA table_info(recipients)").all().some(x=>x.name==='group_name'))db.exec('ALTER TABLE recipients ADD COLUMN group_name TEXT NOT NULL DEFAULT "operations"');
 if(!db.prepare("SELECT id FROM users WHERE role='master' LIMIT 1").get()){
  const salt=randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users(id,email,name,role,salt,password_hash,description,created_at) VALUES(?,?,?,?,?,?,?,?)')
   .run(id(),email,'Master','master',salt,authHash(pass,salt),'Conta principal',now());
 }
 // Contas iniciais configuradas no ambiente privado da VPS; nunca credenciais no codigo.
 if(process.env.RONDA_PRO_INITIAL_ACCOUNTS){
  let seeds=[];try{seeds=JSON.parse(process.env.RONDA_PRO_INITIAL_ACCOUNTS)}catch{throw new Error('RONDA_PRO_INITIAL_ACCOUNTS invalido')}
  if(!Array.isArray(seeds))throw new Error('Contas iniciais invalidas');
  for(const a of seeds){
   const username=clean(a.username).toLowerCase(),email=clean(a.email).toLowerCase(),password=process.env.RONDA_PRO_PILOT_PASSWORD||a.password,role=a.role;
   if(!/^[a-z0-9._-]{3,40}$/.test(username)||!email.includes('@')||!['admin','coi','ronda','vistoriador'].includes(role)||typeof password!=='string'||password.length<(process.env.RONDA_PRO_PILOT_PASSWORD?10:12))throw new Error('Conta inicial invalida');
   if(db.prepare('SELECT id FROM users WHERE username=? COLLATE NOCASE OR email=?').get(username,email))continue;
   const salt=randomBytes(16).toString('hex');
   db.prepare('INSERT INTO users(id,email,username,name,role,salt,password_hash,description,phone,site,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
    .run(id(),email,username,clean(a.name)||role,role,salt,authHash(password,salt),'',clean(a.phone),'Grupo Maxvel',now());
  }
 }
 // Senha compartilhada autorizada exclusivamente para o piloto: migração única e atômica por revisão.
 // Nunca colocar a senha no repositório ou reprocessar no reinício sem mudar a revisão.
 const pilotPassword=process.env.RONDA_PRO_PILOT_PASSWORD,pilotRevision=clean(process.env.RONDA_PRO_PILOT_PASSWORD_REVISION);
 if(pilotPassword){
  if(typeof pilotPassword!=='string'||pilotPassword.length<10||!pilotRevision)throw new Error('Configuracao da senha do piloto invalida');
  db.exec('CREATE TABLE IF NOT EXISTS operational_config(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
  const previous=db.prepare("SELECT value FROM operational_config WHERE key='pilot_password_revision'").get();
  if(previous?.value!==pilotRevision){
   db.exec('BEGIN IMMEDIATE');
   try{
    const update=db.prepare('UPDATE users SET salt=?,password_hash=? WHERE id=?');
    for(const u of db.prepare('SELECT id FROM users').all()){
     const salt=randomBytes(16).toString('hex');
     update.run(salt,authHash(pilotPassword,salt),u.id);
    }
    db.prepare('DELETE FROM tokens').run();
    db.prepare("INSERT INTO operational_config(key,value) VALUES('pilot_password_revision',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(pilotRevision);
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error}
  }
 }
 const insert=db.prepare('INSERT OR IGNORE INTO templates(id,title,trigger,priority,enabled,cooldown_min) VALUES(?,?,?,?,?,?)');
 for(const row of presets)insert.run(...row);
 const defaultGroups={incident:['supervisor'],irregularity:['supervisor'],support:['operations','supervisor'],gps_unreliable:['operations'],gps_disabled:['operations'],patrol_interrupted:['supervisor'],patrol_late:['supervisor'],checkpoint_pending:['supervisor'],patrol_completed:['supervisor']};
 const seedRecipients=db.prepare("UPDATE templates SET recipients=? WHERE id=? AND recipients='[]'");
 for(const [k,v] of Object.entries(defaultGroups))seedRecipients.run(JSON.stringify(v),k);
 return db;
}

export function aggregateOperationalRounds(events=[]){
 const groups=new Map();
 for(const e of events){
  if(!e.round_id)continue;
  if(!groups.has(e.round_id))groups.set(e.round_id,{id:e.round_id,userId:e.user_id,site:e.site||'',
   start:null,end:null,routeId:null,incomplete:false,interrupted:false,deviations:0,gpsIssues:0,gpsTrace:[],km:0,gpsSamples:0,rejectedGps:0,alerts:0,panics:0,incidents:0,checkpoints:0,lastBattery:null,lastFix:null,lastFixAt:null,started:0});
  const r=groups.get(e.round_id);
  if(e.kind==='patrol_start'){r.start=e.occurred_at;r.started++;r.routeId=serialize(e.details)?.routeId||null;}
  if(e.kind==='patrol_end')r.end=e.occurred_at;
  if(e.kind==='patrol_interrupted')r.interrupted=true;
  if(e.kind==='patrol_incomplete')r.incomplete=true;
  if(e.kind==='route_deviation')r.deviations++;
  if(e.kind==='gps_issue')r.gpsIssues++;
  if(e.kind==='gps'&&Number.isFinite(e.lat)&&Number.isFinite(e.lng)){
   r.gpsSamples++;
   const measurement={lat:e.lat,lng:e.lng,at:e.occurred_at,accuracy:e.accuracy};
   const accepted=addTrackSample(r.gpsTrace,measurement);
   r.gpsTrace=accepted.track;r.km+=accepted.distanceM/1000;
   if(accepted.accepted){r.lastFix={lat:e.lat,lng:e.lng,accuracy:e.accuracy};r.lastFixAt=e.occurred_at;}
   if(!accepted.accepted)r.rejectedGps++;
  }
  if(e.kind==='panic')r.panics++;
  if(e.kind==='incident')r.incidents++;
  if(e.kind==='alert')r.alerts++;
  if(e.kind==='checkpoint')r.checkpoints++;
  if(e.battery!=null)r.lastBattery=e.battery;
 }
 return [...groups.values()].map(r=>({
  id:r.id,userId:r.userId,site:r.site,routeId:r.routeId,start:r.start,end:r.end,track:r.gpsTrace.slice(-1200),
  status:r.incomplete?'incompleta':r.interrupted?'interrompida':r.end?'concluida':r.start?'em_andamento':'sem_inicio',
  routeStatus:r.deviations?'Percurso a verificar':r.gpsIssues?'GPS com falha técnica':!r.gpsSamples?'Sem dados GPS':'Sem desvio registrado',
  minutes:r.start?Math.max(0,Math.round(((r.end||Date.now())-r.start)/60000)):null,
  km:Math.round(r.km*100)/100,gpsSamples:r.gpsSamples,rejectedGps:r.rejectedGps,
  alerts:r.alerts,panics:r.panics,incidents:r.incidents,checkpoints:r.checkpoints,
  lastBattery:r.lastBattery,lastFix:r.lastFix,lastFixAt:r.lastFixAt,quality:r.gpsSamples?'Estimativa só com GPS confiável':'Sem dados suficientes'
 })).sort((a,b)=>(b.start||0)-(a.start||0));
}
export function createOperationalApi(){
 let db=null;try{db=initialize()}catch(e){console.error('SQLite:',e.message);}
 const audit=(u,action,subject)=>db.prepare('INSERT INTO audit(id,user_id,action,subject_id,at) VALUES(?,?,?,?,?)').run(id(),u.id,action,subject,now());
 const userFrom=req=>{
  const match=String(req.headers.authorization||'').match(/^Bearer ([0-9a-f]{64})$/i);if(!match)return null;
  return db.prepare('SELECT u.id,u.name,u.email,u.username,u.role,u.active,u.site,u.phone FROM tokens t JOIN users u ON u.id=t.user_id WHERE t.token_hash=? AND t.expires_at>?').get(hash(match[1]),now())||null;
 };
 const event=id=>db.prepare('SELECT * FROM events WHERE id=?').get(id);
 const visible=(u,e)=>u.role==='cliente'?Boolean(u.site&&e.site===u.site&&['inspection','checkpoint','patrol_start','patrol_end'].includes(e.kind)):['ronda','vistoriador'].includes(u.role)?e.user_id===u.id:true;
 const criteriaKeys=['acessos','estrutura','equipamentos','sinalizacao'];
 const operations=db?createOpsCenter(db,{now,id,audit,resp,body,serialize,aggregateOperationalRounds}):null;
 const chat=db?createInternalChat(db,{now,id,audit,resp,body,serialize}):null;
 const activity=db?createActivityHistory(db,{resp,serialize,aggregateOperationalRounds,visible,operations}):null;
 const treatmentService=db?createTreatments(db,{now,id,audit,resp,body,serialize,operations}):null;
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
  if(!db){resp(res,503,{error:'API operacional não configurada: defina banco persistente e credenciais Master no servidor de hospedagem'});return true;}
  const u=new URL(req.url,'http://local'),p=u.pathname,m=req.method,origin=req.headers.origin;
  if(origin&&!['https://'+req.headers.host,'http://'+req.headers.host].includes(origin)){resp(res,403,{error:'Origem inválida'});return true;}
  try{
   if(p==='/api/login'&&m==='POST'){
    const d=serialize((await body(req)).toString())||{},email=clean(d.email).toLowerCase();
    const row=db.prepare('SELECT * FROM users WHERE (email=? OR username=? COLLATE NOCASE) AND active=1').get(email,email);
    const candidate=typeof d.password==='string'&&row?authHash(d.password,row.salt):null;
    if(!candidate||!timingSafeEqual(Buffer.from(candidate,'hex'),Buffer.from(row.password_hash,'hex'))){resp(res,401,{error:'Credenciais inválidas'});return true;}
    const token=randomBytes(32).toString('hex');db.prepare('INSERT INTO tokens(token_hash,user_id,expires_at) VALUES(?,?,?)').run(hash(token),row.id,now()+28800000);
    audit(row,'login',row.id);resp(res,200,{token,user:{id:row.id,name:row.name,role:row.role,site:row.site||''},expiresIn:28800});return true;
   }
   const a=userFrom(req);
   if(!a||!a.active){resp(res,401,{error:'Entre com uma conta operacional'});return true;}
   if(p==='/api/me'&&m==='GET'){resp(res,200,{user:a});return true;}
   if(p==='/api/app-state'&&m==='GET'){
    const record=db.prepare('SELECT data,updated_at FROM app_state WHERE user_id=?').get(a.id);
    resp(res,200,{state:record?serialize(record.data):null,updatedAt:record?.updated_at||null});return true;
   }
   if(p==='/api/app-state'&&m==='PUT'){
    const data=serialize((await body(req,2e6)).toString());
    if(!data||typeof data!=='object'||Array.isArray(data)||!Array.isArray(data.sessions)||!Array.isArray(data.programs)||data.sessions.length>500||data.programs.length>500){resp(res,422,{error:'Dados operacionais invalidos'});return true;}
    // O estado local de cada usuario so pode ser lido por ele. Eventos e chat compartilhados usam suas APIs autenticadas.
    const payload=JSON.stringify({sessions:data.sessions,programs:data.programs,selectedWatcherId:clean(data.selectedWatcherId).slice(0,100),operationalSettings:data.operationalSettings||{}});
    db.prepare('INSERT INTO app_state(user_id,data,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at').run(a.id,payload,now());
    resp(res,200,{stored:true});return true;
   }
   if(p==='/api/profile'&&m==='PUT'){const d=serialize((await body(req)).toString())||{};if(typeof d.phone!=='string'||d.phone.length>35){resp(res,422,{error:'Telefone inválido'});return true;}db.prepare('UPDATE users SET phone=? WHERE id=?').run(clean(d.phone),a.id);resp(res,200,{ok:true});return true;}
   if(p==='/api/logout'&&m==='POST'){if(['ronda','vistoriador'].includes(a.role))operations.endShift(a);db.prepare('DELETE FROM tokens WHERE token_hash=?').run(hash(req.headers.authorization.slice(7)));resp(res,200,{ok:true});return true;}
   if(await chat.handle(req,res,a,p,m))return true;
   if(await activity.handle(req,res,a,p,m))return true;
   if(await treatmentService.handle(req,res,a,p,m))return true;
   if(await operations.handle(req,res,a,p,m))return true;
   if(p==='/api/users'&&m==='GET'&&(manager(a)||reviewer(a)&&operations.allows(a,'rondas'))){resp(res,200,{users:db.prepare('SELECT id,email,username,name,role,description,site,phone,created_at,active FROM users ORDER BY created_at DESC').all()});return true;}
   if(p==='/api/users'&&m==='POST'&&manager(a)){
    const d=serialize((await body(req)).toString())||{},name=clean(d.name),email=clean(d.email).toLowerCase(),username=clean(d.username).toLowerCase()||null,phone=clean(d.phone),site=clean(d.site).slice(0,100),newPassword=d.password;
    if(!roles.includes(d.role)||(d.role==='master'&&a.role!=='master')||!email.includes('@')||name.length<2||(username&&!/^[a-z0-9._-]{3,40}$/.test(username))||typeof newPassword!=='string'||newPassword.length<12||phone.length>35){resp(res,422,{error:'Informe nome, e-mail, telefone, usuario e uma senha válida'});return true;}
    if(clean(d.phone).length>35){resp(res,422,{error:'Telefone inválido'});return true;}
    if(db.prepare('SELECT id FROM users WHERE email=? OR username=? COLLATE NOCASE').get(email,username)){resp(res,409,{error:'E-mail ou usuario ja cadastrado'});return true;}
    const salt=randomBytes(16).toString('hex'),uid=id();
    db.prepare('INSERT INTO users(id,email,username,name,role,salt,password_hash,description,created_at,site,phone) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(uid,email,username,name,d.role,salt,authHash(newPassword,salt),'',now(),site||'Grupo Maxvel',phone);

    audit(a,'user.create',uid);resp(res,201,{id:uid});return true;
   }
   if(p==='/api/routes'&&m==='GET'){
    if(reviewer(a)&&!operations.allows(a,'rondas')){resp(res,403,{error:'Módulo Rondas desabilitado pelo administrador'});return true;}
    if(a.role==='vistoriador'){resp(res,200,{routes:[]});return true;}
    const sql='SELECT r.*,u.name worker_name FROM planned_routes r JOIN users u ON u.id=r.user_id ';
    const rows=a.role==='ronda'?db.prepare(sql+'WHERE r.user_id=? ORDER BY r.updated_at DESC').all(a.id):
     a.role==='cliente'?a.site?db.prepare(sql+'WHERE r.site=? ORDER BY r.updated_at DESC').all(a.site):[]:
     reviewer(a)?db.prepare(sql+'ORDER BY r.updated_at DESC LIMIT 1000').all():[];
    resp(res,200,{routes:rows.map(r=>({id:r.id,userId:r.user_id,workerName:r.worker_name,site:r.site,name:r.name,points:serialize(r.points)||[],plannedStart:r.planned_start||null,schedule:serialize(r.route_schedule)||null,createdAt:r.created_at,updatedAt:r.updated_at}))});return true;
   }
   const routeMatch=p.match(/^\/api\/routes\/([0-9a-f-]{36})$/i);
   if((p==='/api/routes'&&m==='POST')||(routeMatch&&m==='PUT')){
    if(!(manager(a)||reviewer(a)&&operations.allows(a,'rondas'))){resp(res,403,{error:'Somente COI ou Administração configura rotas'});return true;}
    const d=serialize((await body(req)).toString())||{};
    const user=db.prepare("SELECT id,site FROM users WHERE id=? AND role='ronda' AND active=1").get(clean(d.userId));
    const title=clean(d.name).slice(0,120);
    const points=d.points;
    const plannedStart=d.plannedStart==null||d.plannedStart===''?null:Number(d.plannedStart);
     const existingRoute=routeMatch?db.prepare('SELECT * FROM planned_routes WHERE id=?').get(routeMatch[1]):null;
     if(routeMatch&&!existingRoute){resp(res,404,{error:'Rota não encontrada'});return true;}
     const explicitSchedule=d.schedule&&typeof d.schedule==='object'&&!Array.isArray(d.schedule);
     const rawSchedule=explicitSchedule?d.schedule:routeMatch?(serialize(existingRoute.route_schedule)||{}):{};
     const kind=['routine','specific'].includes(rawSchedule.kind)?rawSchedule.kind:'routine';
     const recurrence=['once','daily','alternate','weekly'].includes(rawSchedule.recurrence)?rawSchedule.recurrence:'once';
     const hour=typeof rawSchedule.hour==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(rawSchedule.hour)?rawSchedule.hour:'08:00';
     const startDate=typeof rawSchedule.startDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(rawSchedule.startDate)?rawSchedule.startDate:'';
     const weekdays=Array.isArray(rawSchedule.weekdays)?[...new Set(rawSchedule.weekdays.filter(x=>Number.isInteger(x)&&x>=0&&x<=6))]:[];
     if(explicitSchedule&&(((recurrence==='once'||recurrence==='alternate')&&!startDate)||(recurrence==='weekly'&&!weekdays.length))){
      resp(res,422,{error:'Informe uma data de referência ou os dias da semana para o agendamento'});return true;
     }
     const schedule={kind,recurrence,hour,startDate,weekdays};
    if(plannedStart!==null&&(!Number.isInteger(plannedStart)||plannedStart<1577836800000||plannedStart>4102444800000)){
     resp(res,422,{error:'Horário de início programado inválido'});return true;
    }
    if(!user||!user.site||title.length<3||!Array.isArray(points)||points.length<2||points.length>30||
      !points.every(p=>p&&typeof p==='object'&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180&&clean(p.name).length>0&&clean(p.name).length<=100)){
      resp(res,422,{error:'Selecione um vigia com posto e informe nome e 2 a 30 pontos válidos'});return true;
    }
    const safe=points.map(p=>({name:clean(p.name).slice(0,100),address:clean(p.address).slice(0,250),lat:p.lat,lng:p.lng}));
    if(routeMatch){
     const scheduleJson=explicitSchedule?JSON.stringify(schedule):existingRoute.route_schedule;
     db.prepare('UPDATE planned_routes SET user_id=?,site=?,name=?,points=?,planned_start=?,route_schedule=?,updated_at=? WHERE id=?')
      .run(user.id,user.site,title,JSON.stringify(safe),plannedStart,scheduleJson,now(),existingRoute.id);
     audit(a,'route.update',existingRoute.id);resp(res,200,{id:existingRoute.id,updated:true});return true;
    }
    const rid=id();
    db.prepare('INSERT INTO planned_routes(id,user_id,site,name,points,planned_start,route_schedule,created_at,updated_at,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)')
     .run(rid,user.id,user.site,title,JSON.stringify(safe),plannedStart,explicitSchedule?JSON.stringify(schedule):'{}',now(),now(),a.id);
    audit(a,'route.create',rid);resp(res,201,{id:rid,created:true});return true;
   }
   if(p==='/api/events'&&m==='POST'){
    if(a.role==='cliente'){resp(res,403,{error:'Perfil cliente tem acesso somente de leitura'});return true;}
    const d=serialize((await body(req)).toString())||{},position=d.position??null,battery=d.battery??null,
    templateKey=d.kind==='gps_issue'?'gps_unreliable':d.kind==='patrol_end'?'patrol_completed':null,
    inspection=d.kind==='inspection'?d.details?.criteria:null,
    dispatchId=d.kind==='inspection'?clean(d.details?.dispatchId):'',
    inspectionAssignment=dispatchId?db.prepare("SELECT * FROM dispatches WHERE id=? AND worker_id=? AND kind='vistoria' AND started_at IS NOT NULL AND completed_at IS NULL").get(dispatchId,a.id):null;
    if(d.kind==='inspection'&&(a.role!=='vistoriador'||(!a.site&&!inspectionAssignment)||!inspection||typeof inspection!=='object'||Array.isArray(inspection)||Object.keys(inspection).length!==criteriaKeys.length||!criteriaKeys.every(key=>typeof inspection[key]==='boolean'))){
     resp(res,422,{error:'Vistoria inválida: avalie todos os quatro critérios com um local cadastrado'});return true;
    }
    if(dispatchId&&!inspectionAssignment){resp(res,422,{error:'Vistoria exige despacho válido iniciado e atribuído ao profissional'});return true;}
    const validCriteria=d.kind==='inspection'?Object.fromEntries(criteriaKeys.map(key=>[key,inspection[key]])):null;
    const details=JSON.stringify(validCriteria?{criteria:validCriteria,qualityPercent:Math.round(100*criteriaKeys.filter(key=>validCriteria[key]).length/criteriaKeys.length),...(inspectionAssignment?{dispatchId,destinationId:inspectionAssignment.destination_id}: {})}:
     {...((d.details&&typeof d.details==='object'&&!Array.isArray(d.details))?d.details:{}),...(templateKey?{templateId:templateKey}:{})});
    if(!['panic','gps','battery','checkpoint','incident','message','alert','patrol_start','patrol_end','patrol_incomplete','patrol_interrupted','media','gps_issue','route_deviation','inspection'].includes(d.kind)||!Number.isFinite(d.occurredAt)||Math.abs(now()-d.occurredAt)>30*86400000||clean(d.description).length>2000||details.length>10000||battery!=null&&(!Number.isFinite(battery)||battery<0||battery>100)||position&&(!Number.isFinite(position.lat)||!Number.isFinite(position.lng)||Math.abs(position.lat)>90||Math.abs(position.lng)>180)){
     resp(res,422,{error:'Evento inválido'});return true;
    }
    if(d.kind==='patrol_start'&&d.details?.routeId){
     const valid=db.prepare('SELECT id FROM planned_routes WHERE id=? AND user_id=?').get(clean(d.details.routeId),a.id);
     if(!valid){resp(res,403,{error:'Rota não atribuída a este vigia'});return true;}
    }
    const eid=/^[0-9a-z-]{8,80}$/i.test(d.id||'')?d.id:id();
    const existing=event(eid);
    if(existing){resp(res,existing.user_id===a.id?200:409,{id:eid,duplicate:true});return true;}
    db.prepare('INSERT INTO events(id,user_id,kind,round_id,occurred_at,received_at,lat,lng,accuracy,battery,description,details,site) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(eid,a.id,d.kind,clean(d.roundId)||null,d.occurredAt,now(),position?.lat??null,position?.lng??null,position?.accuracy??null,battery,clean(d.description),details,inspectionAssignment?.site||a.site||'');
    audit(a,'event.create',eid);
    operations.notifyEvent(a,event(eid));
    if(['alert','gps_issue','patrol_end'].includes(d.kind)){
     const key=d.kind==='alert'?clean(d.details?.templateId):d.kind==='gps_issue'?'gps_unreliable':'patrol_completed';
     const template=db.prepare('SELECT * FROM templates WHERE id=? AND enabled=1').get(key);
     if(template){
      const recent=db.prepare("SELECT e.occurred_at FROM email_jobs j JOIN events e ON e.id=j.event_id WHERE e.user_id=? AND e.id<>? AND (e.kind='alert' OR e.kind='gps_issue' OR e.kind='patrol_end') AND json_extract(e.details,'$.templateId')=? ORDER BY e.occurred_at DESC LIMIT 1")
        .get(a.id,eid,key);
      if(!recent||now()-recent.occurred_at>=template.cooldown_min*60000)void notifyEmail(event(eid),template);
     }
    }
    resp(res,201,{id:eid,stored:true});return true;
   }
   if(p==='/api/events'&&m==='GET'){
    if(reviewer(a)&&!operations.allows(a,'ocorrencias')){resp(res,403,{error:'Ocorrências desabilitadas pelo administrador'});return true;}
    const limit=Math.min(500,Math.max(1,Number(u.searchParams.get('limit'))||100));
    const rows=['ronda','vistoriador'].includes(a.role)?db.prepare('SELECT * FROM events WHERE user_id=? ORDER BY occurred_at DESC LIMIT ?').all(a.id,limit):
     a.role==='cliente'?(a.site?db.prepare("SELECT * FROM events WHERE site=? AND kind IN ('patrol_start','patrol_end','checkpoint','patrol_incomplete','patrol_interrupted','inspection') ORDER BY occurred_at DESC LIMIT ?").all(a.site,limit):[]):
     db.prepare('SELECT * FROM events ORDER BY occurred_at DESC LIMIT ?').all(limit);
    resp(res,200,{events:rows.map(x=>reviewer(a)?treatmentService.decorate(x,a):({...x,treatment_session:undefined,details:serialize(x.details),position:x.lat==null?null:{lat:x.lat,lng:x.lng,accuracy:x.accuracy}}))});return true;
   }
   const messages=p.match(/^\/api\/events\/([0-9a-z-]+)\/messages$/i);
   if(messages){
    if(a.role==='cliente'){resp(res,403,{error:'Conversa operacional não disponível no Portal do Cliente'});return true;}
    if(reviewer(a)&&!operations.allows(a,'ocorrencias')){resp(res,403,{error:'Mensagens de ocorrências desabilitadas'});return true;}
    const ev=event(messages[1]);if(!ev||!visible(a,ev)){resp(res,404,{error:'Evento não encontrado'});return true;}
    if(m==='GET'&&reviewer(a)&&!operations.allows(a,'ocorrencias')){resp(res,403,{error:'Ocorrências desabilitadas'});return true;}
    if(m==='GET'){const rows=reviewer(a)?db.prepare('SELECT m.*,u.name author FROM messages m JOIN users u ON u.id=m.author_id WHERE m.event_id=? ORDER BY created_at').all(ev.id):db.prepare("SELECT m.*,u.name author FROM messages m JOIN users u ON u.id=m.author_id WHERE m.event_id=? AND audience='general' ORDER BY created_at").all(ev.id);resp(res,200,{messages:rows});return true;}
    if(m==='POST'){
     if(ev.status==='resolvida'){resp(res,409,{error:'Registro resolvido: somente consulta.'});return true;}
     if(a.role==='cliente'){resp(res,403,{error:'Perfil cliente somente consulta registros'});return true;}
     const d=serialize((await body(req)).toString())||{},b=clean(d.body),audience=d.audience||'general';
     if(b.length<1||b.length>4000||!['general','system'].includes(audience)||audience==='system'&&!reviewer(a)){resp(res,422,{error:'Mensagem inválida'});return true;}
     if(reviewer(a)&&!treatmentService.canRespond(a,event(ev.id),d.claimSession)){resp(res,409,{error:'Tratativa concluída, reservada em outra sessão ou sem permissão para resposta.'});return true;}
     if(event(ev.id).status==='resolvida'){resp(res,409,{error:'Registro resolvido: somente consulta.'});return true;}
     const mid=id();db.prepare('INSERT INTO messages(id,event_id,author_id,audience,body,created_at) VALUES(?,?,?,?,?,?)').run(mid,ev.id,a.id,audience,b,now());
     audit(a,'message.create',ev.id);
    operations.notifyMessage(a,ev,audience,b);
    resp(res,201,{id:mid});return true;
    }
   }
   if(p==='/api/event-treatments'&&m==='GET'&&reviewer(a)&&operations.allows(a,'ocorrencias')){
    const limit=Math.min(2000,Math.max(1,Number(u.searchParams.get('limit'))||500));
    const rows=db.prepare('SELECT t.*,reviewer.name concluded_by,reviewer.role author_role,worker.name reporter_name,e.kind,e.description,e.occurred_at,e.site,e.user_id FROM event_treatments t JOIN events e ON e.id=t.event_id JOIN users reviewer ON reviewer.id=t.author_id JOIN users worker ON worker.id=e.user_id ORDER BY t.created_at DESC LIMIT ?').all(limit);
    resp(res,200,{treatments:rows});return true;
   }
   if(p==='/api/templates'&&m==='GET'){
    if(reviewer(a)&&!operations.allows(a,'alertas')){resp(res,403,{error:'Modelos de alerta desabilitados'});return true;}
    const rows=reviewer(a)?db.prepare('SELECT * FROM templates').all():db.prepare("SELECT id,title,trigger,priority,enabled,cooldown_min FROM templates WHERE enabled=1 AND trigger='manual'").all();resp(res,200,{templates:rows});return true;}
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
   if(p==='/api/email-jobs'&&m==='GET'&&reviewer(a)&&operations.allows(a,'alertas')){
    const jobs=db.prepare('SELECT j.event_id,j.status,j.last_error,j.at,e.user_id,e.kind,e.description FROM email_jobs j JOIN events e ON e.id=j.event_id ORDER BY j.at DESC LIMIT 300').all();
    resp(res,200,{jobs});return true;
   }
   if(p==='/api/email-jobs/retry'&&m==='POST'&&manager(a)){
    const d=serialize((await body(req)).toString())||{},ev=event(clean(d.eventId));
    if(!ev){resp(res,404,{error:'Alerta não encontrado'});return true;}
    const detail=serialize(ev.details)||{},templateId=ev.kind==='alert'?detail.templateId:ev.kind==='gps_issue'?'gps_unreliable':ev.kind==='patrol_end'?'patrol_completed':null;
    const template=templateId&&db.prepare('SELECT * FROM templates WHERE id=? AND enabled=1').get(templateId);
    if(!template){resp(res,422,{error:'Modelo não habilitado ou evento não notificável'});return true;}
    await notifyEmail(ev,template);
    audit(a,'email.retry',ev.id);resp(res,200,{status:db.prepare('SELECT status FROM email_jobs WHERE event_id=?').get(ev.id)?.status});return true;
   }
   if(p==='/api/rounds'&&m==='GET'){
    if(reviewer(a)&&!operations.allows(a,'rondas')){resp(res,403,{error:'Consulta de rondas desabilitada'});return true;}
    // Vigias consultam EXCLUSIVAMENTE suas próprias rondas. Operadores e adm têm acesso às rondas da operação.
    const query='SELECT round_id,user_id,site,kind,occurred_at,lat,lng,accuracy,battery,details FROM events WHERE round_id IS NOT NULL ';
    const rows=['ronda','vistoriador'].includes(a.role)
      ?db.prepare(query+'AND user_id=? ORDER BY occurred_at').all(a.id)
      :a.role==='cliente'?(a.site?db.prepare(query+'AND site=? ORDER BY occurred_at').all(a.site):[])
      :db.prepare(query+'ORDER BY occurred_at').all();
    resp(res,200,{rounds:aggregateOperationalRounds(rows),scope:a.role==='cliente'?'site':(['ronda','vistoriador'].includes(a.role)?'own':'operational'),updatedAt:now()});return true;
   }
   if(p==='/api/my-summary'&&m==='GET'&&a.role!=='cliente'){
    const mine=db.prepare('SELECT kind,COUNT(*) count FROM events WHERE user_id=? GROUP BY kind').all(a.id);
    const items=db.prepare('SELECT round_id,user_id,site,kind,occurred_at,lat,lng,accuracy,battery,details FROM events WHERE user_id=? AND round_id IS NOT NULL ORDER BY occurred_at').all(a.id);
    const rounds=aggregateOperationalRounds(items);
    resp(res,200,{rounds,metrics:mine,totalKm:Math.round(rounds.reduce((n,r)=>n+r.km,0)*100)/100,
      totalMinutes:rounds.reduce((n,r)=>n+(r.minutes||0),0),updatedAt:now(),scope:'own'});return true;
   }
   if(p==='/api/dashboard'&&m==='GET'&&reviewer(a)&&operations.allows(a,'mapa')){
    const rounds=aggregateOperationalRounds(db.prepare('SELECT round_id,user_id,site,kind,occurred_at,lat,lng,accuracy,battery,details FROM events WHERE round_id IS NOT NULL ORDER BY occurred_at').all());
    resp(res,200,{source:'sqlite',metrics:db.prepare('SELECT kind,COUNT(*) count FROM events GROUP BY kind').all(),team:db.prepare("SELECT u.id,u.name,u.description,COUNT(e.id) events,SUM(CASE WHEN e.kind='panic' THEN 1 ELSE 0 END) panics FROM users u LEFT JOIN events e ON e.user_id=u.id WHERE u.role='ronda' GROUP BY u.id").all(),rounds,updatedAt:now()});return true;
   }
   if(p==='/api/media'&&m==='POST'){
    if(reviewer(a)&&!operations.allows(a,'ocorrencias')){resp(res,403,{error:'Evidências desabilitadas'});return true;}
    if(a.role==='cliente'){resp(res,403,{error:'Perfil cliente não envia evidências'});return true;}
    const eid=clean(req.headers['x-ronda-event-id']),ev=event(eid);
    if(!ev||!visible(a,ev)){resp(res,404,{error:'Evento não encontrado'});return true;}
    if(ev.status==='resolvida'){resp(res,409,{error:'Registro resolvido: somente consulta.'});return true;}
    const mime=clean(req.headers['content-type']).split(';')[0];
    const types=['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/webm','audio/mp4','audio/ogg'];
    if(!types.includes(mime)){resp(res,415,{error:'Formato não autorizado'});return true;}
    const requestedMediaId=clean(req.headers['x-ronda-media-id']);
    if(requestedMediaId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedMediaId)){
     resp(res,422,{error:'Identificador da mídia inválido'});return true;
    }
    if(requestedMediaId){
     const existing=db.prepare('SELECT id,event_id,author_id FROM media WHERE id=?').get(requestedMediaId);
     if(existing){
      if(existing.event_id!==eid||existing.author_id!==a.id){resp(res,409,{error:'Identificador da mídia já utilizado'});return true;}
      resp(res,200,{id:existing.id,alreadyUploaded:true});return true;
     }
    }
    const evidenceView=clean(req.headers['x-media-view']).toLowerCase();
    if(evidenceView&&(!['front','back','left','right','selfie'].includes(evidenceView)||!mime.startsWith('image/'))){
     resp(res,422,{error:'Identificação da foto inválida'});return true;
    }
    const bytes=await body(req,25*1024*1024);
    if(event(eid).status==='resolvida'){resp(res,409,{error:'Registro resolvido: somente consulta.'});return true;}
    if(reviewer(a)&&!treatmentService.canRespond(a,event(eid),req.headers['x-treatment-session'])){resp(res,409,{error:'Assuma uma tratativa pendente antes de anexar evidências.'});return true;}
    const magic=bytes.subarray(0,12);
    const correct=(mime==='image/jpeg'&&magic[0]===255&&magic[1]===216)
      ||(mime==='image/png'&&magic.subarray(1,4).toString()==='PNG')
      ||(mime==='image/webp'&&magic.subarray(8,12).toString()==='WEBP')
      ||(mime==='video/mp4'&&magic.subarray(4,8).toString()==='ftyp')
      ||(['video/webm','audio/webm'].includes(mime)&&magic.subarray(0,4).equals(Buffer.from([26,69,223,163])))
      ||(mime==='audio/mp4'&&magic.subarray(4,8).toString()==='ftyp')
      ||(mime==='audio/ogg'&&magic.subarray(0,4).toString()==='OggS');
    if(!correct){resp(res,415,{error:'Conteúdo do arquivo incompatível'});return true;}
    const mediaId=requestedMediaId||id(),folder=resolve(dirname(process.env.RONDA_PRO_DB_PATH),'media');
    mkdirSync(folder,{recursive:true});writeFileSync(join(folder,mediaId),bytes,{flag:'wx',mode:0o600});
    const captured=Number(req.headers['x-captured-at']);
    const geoLat=Number(req.headers['x-media-lat']),geoLng=Number(req.headers['x-media-lng']);
    const batteryRaw=req.headers['x-media-battery'],battery=Number(batteryRaw);
    const hasGeo=req.headers['x-media-lat']!==undefined&&req.headers['x-media-lng']!==undefined
      &&Number.isFinite(geoLat)&&Number.isFinite(geoLng)&&Math.abs(geoLat)<=90&&Math.abs(geoLng)<=180;
    const hasBattery=batteryRaw!==undefined&&Number.isFinite(battery)&&battery>=0&&battery<=100;
    db.prepare('INSERT INTO media(id,event_id,author_id,mimetype,filename,captured_at,latitude,longitude,battery,evidence_view,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?)')
     .run(mediaId,eid,a.id,mime,mediaId,Number.isFinite(captured)&&captured>0?captured:now(),
       hasGeo?geoLat:null,hasGeo?geoLng:null,hasBattery?battery:null,evidenceView,now());
    audit(a,'media.upload',eid);operations.notifyMessage(a,ev,'system','Nova evidência anexada ao registro');resp(res,201,{id:mediaId});return true;
   }
   const mediaPath=p.match(/^\/api\/media\/([0-9a-f-]+)$/i);
   if(mediaPath&&m==='GET'){
    if(reviewer(a)&&!operations.allows(a,'ocorrencias')){resp(res,403,{error:'Evidências desabilitadas'});return true;}
    const item=db.prepare('SELECT * FROM media WHERE id=?').get(mediaPath[1]),ev=item&&event(item.event_id);
    if(!ev||!visible(a,ev)){resp(res,404,{error:'Mídia não encontrada'});return true;}
    const bytes=readFileSync(join(resolve(dirname(process.env.RONDA_PRO_DB_PATH),'media'),item.filename));
    res.writeHead(200,{'Content-Type':item.mimetype,'Content-Disposition':'inline','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(bytes);return true;
   }
   if(p==='/api/events/media'&&m==='GET'){
    if(reviewer(a)&&!operations.allows(a,'ocorrencias')){resp(res,403,{error:'Evidências desabilitadas'});return true;}
    const eid=clean(u.searchParams.get('eventId')),ev=event(eid);
    if(!ev||!visible(a,ev)){resp(res,404,{error:'Evento não encontrado'});return true;}
    resp(res,200,{media:db.prepare('SELECT id,mimetype,captured_at,latitude,longitude,battery,evidence_view FROM media WHERE event_id=? ORDER BY created_at').all(eid)});return true;
   }
   if(p==='/api/export'&&m==='GET'&&reviewer(a)&&operations.allows(a,'relatorios')){
    const events=db.prepare('SELECT * FROM events ORDER BY occurred_at DESC LIMIT 50000').all(),messages=db.prepare('SELECT m.*,u.name author FROM messages m JOIN users u ON u.id=m.author_id ORDER BY m.created_at DESC LIMIT 50000').all();
    audit(a,'export',null);resp(res,200,{source:'sqlite',at:now(),events,messages,rondas:aggregateOperationalRounds(events),limit:50000});return true;
   }
   resp(res,404,{error:'Endpoint não encontrado ou acesso não autorizado'});return true;
  }catch(e){console.error('Erro operacional:',e.message);resp(res,e.status||500,{error:e.status>=400&&e.status<500?e.message:'Falha no processamento'});return true;}
 };
}
