import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {dirname,join} from 'node:path';

const SEND_URL='https://api.resend.com/emails';
const RETRY_DELAYS_MS=[60_000,300_000,900_000,3_600_000];
const MAX_ATTEMPTS=RETRY_DELAYS_MS.length+1;
const inFlight=new Set();
let retryTimer=null;

function ensureSchema(db){
 db.exec("CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,email TEXT NOT NULL,kind TEXT NOT NULL,message TEXT NOT NULL,created_at INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'received')");
 const cols=new Set(db.prepare('PRAGMA table_info(requests)').all().map(c=>c.name));
 const additions=[
  ['organization',"TEXT NOT NULL DEFAULT ''"],
  ['notification_status',"TEXT NOT NULL DEFAULT 'pending'"],
  ['notification_provider_id','TEXT'],
  ['notification_attempts','INTEGER NOT NULL DEFAULT 0'],
  ['notification_last_error','TEXT'],
  ['notification_next_retry_at','INTEGER'],
  ['notification_updated_at','INTEGER']
 ];
 for(const [name,def] of additions){
  if(!cols.has(name))db.exec(`ALTER TABLE requests ADD COLUMN ${name} ${def}`);
 }
 db.exec("UPDATE requests SET notification_status='not_applicable' WHERE status='test_completed' AND notification_status='pending'");
}

function formatDateTime(ms){
 const d=new Date(Number(ms));
 const br=d.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'medium'});
 return `${br} (BRT) / ${d.toISOString()}`;
}

function buildDeletionEmail(row){
 const subject=`Ronda Pro — solicitação de exclusão — ${row.id}`;
 const text=[
  'Solicitação de exclusão de conta e dados — Ronda Pro',
  '',
  `Protocolo: ${row.id}`,
  `Data e hora: ${formatDateTime(row.created_at)}`,
  `E-mail do solicitante: ${row.email}`,
  `Organização informada: ${row.organization||'Não informada'}`,
  'Descrição do pedido:',
  row.message,
  '',
  `Estado do pedido: ${row.status} (aguardando verificação e atendimento manual; a conta não foi apagada automaticamente).`
 ].join('\n');
 return {subject,text};
}

export async function deliverDeletionNotification(db,requestId,{fetchImpl=fetch}={}){
 if(inFlight.has(requestId))return db.prepare('SELECT * FROM requests WHERE id=?').get(requestId);
 const row=db.prepare('SELECT * FROM requests WHERE id=?').get(requestId);
 if(!row)return null;
 if(row.kind!=='deletion'){
  if(row.notification_status==='pending'){
   db.prepare("UPDATE requests SET notification_status='not_required',notification_updated_at=? WHERE id=?").run(Date.now(),requestId);
  }
  return db.prepare('SELECT * FROM requests WHERE id=?').get(requestId);
 }
 // Never duplicate messages already accepted by the provider.
 if(row.notification_status==='accepted'||row.notification_provider_id){
  return row;
 }
 inFlight.add(requestId);
 const attempt=(Number(row.notification_attempts)||0)+1;
 const updatedAt=Date.now();
 const apiKey=(process.env.RESEND_API_KEY||'').trim();
 const from=(process.env.RESEND_FROM_EMAIL||process.env.EMAIL_FROM||process.env.RONDA_PRO_EMAIL_FROM||'').trim();
 const to=(process.env.RONDA_PRO_DELETION_NOTIFY_EMAIL||'').trim();
 try{
  if(!apiKey||!from||!to||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)){
   throw new Error('Configuração de envio de notificação ausente no servidor');
  }
  const {subject,text}=buildDeletionEmail(row);
  const response=await fetchImpl(SEND_URL,{
   method:'POST',
   headers:{
    Authorization:`Bearer ${apiKey}`,
    'Content-Type':'application/json',
    'Idempotency-Key':`ronda-pro-deletion-${row.id}`
   },
   body:JSON.stringify({from,to:[to],subject,text}),
   signal:AbortSignal.timeout(12000)
  });
  if(!response.ok){
   throw new Error(`Provedor retornou HTTP ${response.status}`);
  }
  const result=await response.json().catch(()=>({}));
  if(!result?.id){
   throw new Error('Provedor não retornou identificador de aceitação');
  }
  db.prepare(`UPDATE requests SET
   notification_status='accepted',
   notification_provider_id=?,
   notification_attempts=?,
   notification_last_error=NULL,
   notification_next_retry_at=NULL,
   notification_updated_at=?
   WHERE id=?`).run(String(result.id),attempt,updatedAt,requestId);
 }catch(err){
  const safeError=String(err?.message||'Falha no envio da notificação').slice(0,240);
  const canRetry=attempt<MAX_ATTEMPTS;
  const delayMs=canRetry?RETRY_DELAYS_MS[Math.min(attempt-1,RETRY_DELAYS_MS.length-1)]:null;
  const nextRetryAt=canRetry?updatedAt+delayMs:null;
  const nextStatus=canRetry?'retry_scheduled':'failed';
  db.prepare(`UPDATE requests SET
   notification_status=?,
   notification_attempts=?,
   notification_last_error=?,
   notification_next_retry_at=?,
   notification_updated_at=?
   WHERE id=? AND notification_provider_id IS NULL`).run(nextStatus,attempt,safeError,nextRetryAt,updatedAt,requestId);
  if(canRetry)scheduleRetryCheck(db,Math.min(delayMs,60_000),fetchImpl);
 }finally{
  inFlight.delete(requestId);
 }
 return db.prepare('SELECT * FROM requests WHERE id=?').get(requestId);
}

export async function processDueNotificationRetries(db,{fetchImpl=fetch}={}){
 const now=Date.now();
 const due=db.prepare(`SELECT id FROM requests
  WHERE kind='deletion'
  AND notification_status IN ('retry_scheduled','pending')
  AND notification_provider_id IS NULL
  AND (notification_next_retry_at IS NULL OR notification_next_retry_at<=?)
  AND notification_attempts<?
  ORDER BY created_at ASC LIMIT 10`).all(now,MAX_ATTEMPTS);
 for(const item of due){
  await deliverDeletionNotification(db,item.id,{fetchImpl});
 }
 const nextRow=db.prepare(`SELECT MIN(notification_next_retry_at) AS nextAt FROM requests
  WHERE kind='deletion' AND notification_status='retry_scheduled' AND notification_provider_id IS NULL`).get();
 if(nextRow?.nextAt){
  scheduleRetryCheck(db,Math.max(1000,Math.min(60_000,nextRow.nextAt-Date.now())),fetchImpl);
 }
}

function scheduleRetryCheck(db,delayMs=30_000,fetchImpl=fetch){
 if(retryTimer)return;
 retryTimer=setTimeout(async()=>{
  retryTimer=null;
  try{await processDueNotificationRetries(db,{fetchImpl});}catch{}
 },delayMs);
 if(typeof retryTimer.unref==='function')retryTimer.unref();
}

export function createPrivacyHandler({fetchImpl=fetch}={}){
 let db;const attempts=new Map();
 const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 const openDb=()=>{
  if(!db){
   db=new DatabaseSync(join(dirname(process.env.RONDA_PRO_DB_PATH),'privacy-requests.sqlite'));
   ensureSchema(db);
   scheduleRetryCheck(db,5_000,fetchImpl);
  }
  return db;
 };
 return async(req,res)=>{
  if(new URL(req.url,'http://local').pathname!=='/api/privacy-requests')return false;
  if(req.method!=='POST')return false;
  const origin=req.headers.origin;if(origin&&!['https://'+req.headers.host,'http://'+req.headers.host].includes(origin)){send(res,403,{error:'Origem inválida'});return true;}
  if(!process.env.RONDA_PRO_DB_PATH){send(res,503,{error:'Canal temporariamente indisponível.'});return true;}
  const ip=req.socket.remoteAddress||'unknown',now=Date.now();
  for(const [key,v] of attempts)if(now-v.at>3600000)attempts.delete(key);
  const counter=attempts.get(ip)||{at:now,count:0};if(counter.count>=30){send(res,429,{error:'Muitas solicitações. Tente novamente mais tarde.'});return true;}counter.count++;attempts.set(ip,counter);
  try{
   let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>8000){send(res,413,{error:'Texto muito longo.'});return true;}}
   const d=JSON.parse(raw);
   const email=String(d.email||'').trim().toLowerCase();
   const kind=String(d.kind||'').trim();
   const message=String(d.message||'').trim();
   const hasOrgField=Object.prototype.hasOwnProperty.call(d,'organization');
   const organization=hasOrgField?String(d.organization||'').trim():'Não informada separadamente';
   if(
    d.website||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
    email.length>254||
    !['access','correction','deletion','question'].includes(kind)||
    message.length<10||
    message.length>4000||
    (hasOrgField&&(organization.length<2||organization.length>160))
   ){
    send(res,422,{error:'Informe e-mail válido, organização vinculada (2 a 160 caracteres) e descrição de 10 a 4.000 caracteres.'});
    return true;
   }
   const database=openDb();
   const id=randomUUID();
   const initialNotificationStatus=kind==='deletion'?'pending':'not_required';
   database.prepare('INSERT INTO requests(id,email,organization,kind,message,created_at,status,notification_status,notification_attempts,notification_updated_at) VALUES(?,?,?,?,?,?,?,?,0,?)')
    .run(id,email,organization,kind,message,now,'received',initialNotificationStatus,now);
   const updated=kind==='deletion'?await deliverDeletionNotification(database,id,{fetchImpl}):database.prepare('SELECT * FROM requests WHERE id=?').get(id);
   const notificationStatus=updated?.notification_status||initialNotificationStatus;
   const responseMessage=notificationStatus==='accepted'
    ?'Solicitação registrada e notificação encaminhada ao responsável para verificação. Guarde o protocolo. A identidade será verificada antes de qualquer acesso ou exclusão de dados.'
    :'Solicitação registrada. Guarde o protocolo. A identidade será verificada antes de qualquer acesso ou exclusão de dados.';
   send(res,201,{
    id,
    status:updated?.status||'received',
    notificationStatus,
    notificationProviderId:updated?.notification_provider_id||null,
    message:responseMessage
   });
  }catch{send(res,400,{error:'Não foi possível registrar. Confira os campos e tente novamente.'});}
  return true;
 };
}

export function privacyRequests(){
 const db=new DatabaseSync(join(dirname(process.env.RONDA_PRO_DB_PATH),'privacy-requests.sqlite'));
 try{
  ensureSchema(db);
  return db.prepare('SELECT * FROM requests ORDER BY created_at DESC LIMIT 200').all();
 }finally{db.close();}
}
