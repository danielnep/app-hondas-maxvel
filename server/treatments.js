import {EVENT_TYPES,isPending,primaryRole,administrativeRole} from '../src/treatment-policy.js';
import {validateConclusion} from '../src/conclusion-validation.js';
const LEASE_MS=120000;
const uuid=value=>typeof value==='string'&&/^[a-f0-9-]{36}$/i.test(value);
export function createTreatments(db,{now,id,resp,body,serialize,audit,operations}){
 const columns=new Set(db.prepare('PRAGMA table_info(events)').all().map(c=>c.name));
 for(const [key,type] of [['version','INTEGER NOT NULL DEFAULT 0'],['treatment_owner_id','TEXT'],['treatment_session','TEXT'],['treatment_lease_until','INTEGER']])
  if(!columns.has(key))db.exec(`ALTER TABLE events ADD COLUMN ${key} ${type}`);
 if(!db.prepare('PRAGMA table_info(event_treatments)').all().some(c=>c.name==='submission_id'))db.exec('ALTER TABLE event_treatments ADD COLUMN submission_id TEXT');
 db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_treatment_submission ON event_treatments(submission_id) WHERE submission_id IS NOT NULL');
 const read=key=>db.prepare('SELECT * FROM events WHERE id=?').get(key);
 const history=key=>db.prepare('SELECT t.*,u.name concluded_by,u.role author_role FROM event_treatments t JOIN users u ON u.id=t.author_id WHERE event_id=? ORDER BY created_at DESC,t.id DESC').all(key);
 function decorate(event,user){
  if(!event)return null;
  const coiHistory=db.prepare("SELECT 1 FROM event_treatments t JOIN users u ON u.id=t.author_id WHERE t.event_id=? AND u.role IN ('coi','operador') LIMIT 1").get(event.id);
  const owner=event.treatment_owner_id?db.prepare('SELECT name FROM users WHERE id=?').get(event.treatment_owner_id):null;
  const active=event.treatment_lease_until>now();
  const eligible=isPending(event)&&(primaryRole(user.role)||administrativeRole(user.role)&&(!coiHistory||event.status==='encaminhada'));
  const {treatment_session,...safe}=event;
  return {...safe,details:typeof event.details==='string'?serialize(event.details):event.details,
   position:event.lat==null?null:{lat:event.lat,lng:event.lng,accuracy:event.accuracy},
   coi_treated:!!coiHistory,can_treat:eligible&&(!active||event.treatment_owner_id===user.id),
   treatment_owner:active?owner?.name||'Outro profissional':null,treatment_locked:active,
   reporter_name:db.prepare('SELECT name FROM users WHERE id=?').get(event.user_id)?.name||'Equipe de campo'};
 }
 function summary(user){
  if(!operations.allows(user,'ocorrencias'))return {total:0,categories:[]};
  const categories=db.prepare("SELECT kind,COUNT(*) total,SUM(CASE WHEN status<>'resolvida' THEN 1 ELSE 0 END) pending FROM events GROUP BY kind").all();
  return {total:categories.reduce((n,c)=>n+c.pending,0),categories:categories.map(c=>({...c,label:EVENT_TYPES[c.kind]?.label||c.kind}))};
 }
 function permitted(user,event,session){
  if(!isPending(event))return 'Este registro já foi concluído. Consulte o histórico.';
  const item=decorate(event,user);
  if(!item.can_treat)return item.treatment_locked?'Tratativa em atendimento por '+item.treatment_owner+'.':'A Administração acompanha a tratativa do COI; registros encaminhados podem ser assumidos.';
  if(event.treatment_lease_until>now()&&event.treatment_session!==session)return 'Registro reservado em outra sessão. Aguarde a liberação.';
  return null;
 }
 function canRespond(user,event,session){
  if(!isPending(event))return false;
  // Respostas usam a mesma autorização da tratativa. Campo segue regras de visibilidade próprias.
  return !permitted(user,event,session);
 }
 async function handle(req,res,user,path,method){
  const reviewer=primaryRole(user.role)||administrativeRole(user.role);
  if(!reviewer)return false;
  if(path==='/api/treatment-summary'&&method==='GET'){resp(res,200,summary(user));return true;}
  if(path==='/api/treatment-records'&&method==='GET'){
   if(!operations.allows(user,'ocorrencias')){resp(res,403,{error:'Tratativas desabilitadas'});return true;}
   const url=new URL(req.url,'http://local'),kind=url.searchParams.get('kind')||'incident',offset=Math.max(0,Number(url.searchParams.get('offset'))||0);
   const state=url.searchParams.get('state');
    const condition=state==='completed'?" AND status='resolvida'":state==='pending'?" AND (status IS NULL OR status!='resolvida')":'';
    const rows=db.prepare("SELECT * FROM events WHERE kind=?"+condition+" ORDER BY occurred_at DESC,id DESC LIMIT 51 OFFSET ?").all(kind,offset);
   resp(res,200,{events:rows.slice(0,50).map(e=>decorate(e,user)),hasMore:rows.length>50,nextOffset:offset+50});return true;
  }
  const detail=path.match(/^\/api\/events\/([a-z0-9-]+)$/i);
  if(detail&&detail[1]!=='media'&&method==='GET'){
   if(!operations.allows(user,'ocorrencias')){resp(res,403,{error:'Registros desabilitados'});return true;}
   const event=read(detail[1]);resp(res,event?200:404,event?{event:decorate(event,user),treatments:history(event.id)}:{error:'Registro não encontrado'});return true;
  }
  const match=path.match(/^\/api\/events\/([a-z0-9-]+)\/(claim|release|review)$/i);
  if(!match||method!=='POST')return false;
  if(!operations.allows(user,'ocorrencias')){resp(res,403,{error:'Tratamento desabilitado pelo administrador'});return true;}
  const data=serialize((await body(req)).toString())||{},action=match[2],session=data.claimSession;
  if(action!=='review'&&!uuid(session)){resp(res,422,{error:'Identificador de sessão inválido'});return true;}
  const validation=action==='review'?validateConclusion(data.conclusion??data.note):null;
  if(action==='review'&&(!['aberta','em_analise','resolvida','encaminhada'].includes(data.status)||!validation.ok||data.requestId!=null&&!uuid(data.requestId))){resp(res,422,{error:validation.reason||'Dados de tratativa inválidos'});return true;}
  let response,status=200,changed=false;
  db.exec('BEGIN IMMEDIATE');
  try{
   const event=read(match[1]);
   if(!event){status=404;response={error:'Registro não encontrado'};}
   else if(action==='release'){
    const result=db.prepare('UPDATE events SET treatment_owner_id=NULL,treatment_session=NULL,treatment_lease_until=NULL WHERE id=? AND treatment_owner_id=? AND treatment_session=?').run(event.id,user.id,session);
    changed=!!result.changes;response={ok:true};
   }else{
    const duplicate=action==='review'&&data.requestId?db.prepare('SELECT * FROM event_treatments WHERE submission_id=?').get(data.requestId):null;
    const conflict=permitted(user,event,session);
    if(duplicate){
     if(duplicate.event_id===event.id&&duplicate.author_id===user.id&&duplicate.conclusion===validation.value&&duplicate.to_status===data.status)response={ok:true,already:true,status:duplicate.to_status};
     else{status=409;response={error:'Identificador de envio já utilizado'};}
    }else if(action==='review'&&event.kind==='alert'&&data.acknowledged!==true){status=422;response={error:'Confirme a conferência do alerta e informe a resposta ao profissional.'};}
    else if(conflict){status=409;response={error:conflict,event:decorate(event,user)};}
    else if((data.version!=null&&data.version!==event.version)||(action==='review'&&data.version==null&&event.version>0)){status=409;response={error:'O registro foi atualizado em outra sessão. Atualize antes de continuar.',event:decorate(event,user)};}
    else if(action==='claim'){
     db.prepare('UPDATE events SET treatment_owner_id=?,treatment_session=?,treatment_lease_until=? WHERE id=?').run(user.id,session,now()+LEASE_MS,event.id);
     response={ok:true,event:decorate(read(event.id),user)};changed=true;
    }else{
     const at=now(),conclusion=validation.value;
     db.prepare('UPDATE events SET status=?,reviewer_id=?,reviewed_at=?,version=version+1,treatment_owner_id=NULL,treatment_session=NULL,treatment_lease_until=NULL WHERE id=?')
      .run(data.status,user.id,at,event.id);
     db.prepare('INSERT INTO event_treatments(id,event_id,author_id,from_status,to_status,conclusion,created_at,submission_id) VALUES(?,?,?,?,?,?,?,?)')
      .run(id(),event.id,user.id,event.status,data.status,conclusion,at,data.requestId||null);
     db.prepare('INSERT INTO messages(id,event_id,author_id,audience,body,created_at) VALUES(?,?,?,?,?,?)').run(id(),event.id,user.id,'general','Resposta do COI ('+data.status+'): '+conclusion,at);
     audit(user,'event.review.'+data.status,event.id);
     operations.notifyReview(user,event,data.status,conclusion);
     response={ok:true,status:data.status,treatedAt:at,event:decorate(read(event.id),user)};changed=true;
    }
   }
   db.exec('COMMIT');
  }catch(error){db.exec('ROLLBACK');throw error;}
  if(changed)operations.broadcast();
  resp(res,status,response);return true;
 }
 return {handle,decorate,summary,history,canRespond};
}
