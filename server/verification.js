import QRCode from 'qrcode';
import {verificationSettings,VERIFICATION_MODES,pointQrValue} from '../src/verification-policy.js';
export function createVerification(db,{body,serialize,resp,audit,now,operations}){
 db.exec('CREATE TABLE IF NOT EXISTS operational_config(key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 db.exec('CREATE TABLE IF NOT EXISTS qr_verifications(id TEXT PRIMARY KEY,user_id TEXT NOT NULL,round_id TEXT NOT NULL,route_id TEXT NOT NULL,point_index INTEGER NOT NULL,verified_at INTEGER NOT NULL,UNIQUE(user_id,round_id,point_index))');
 const settings=()=>verificationSettings(serialize(db.prepare("SELECT value FROM operational_config WHERE key='verification_settings'").get()?.value)||{});
 const manager=u=>['admin','master'].includes(u.role);
 const reviewer=u=>['admin','master','coi','operador'].includes(u.role);
 return async(req,res,user)=>{
  const path=new URL(req.url,'http://local').pathname;
  if(path==='/api/operational-settings'){
   if(req.method==='GET'){resp(res,200,{settings:settings()});return true;}
   if(req.method!=='PUT'){resp(res,405,{error:'Método não permitido'});return true;}
   if(!manager(user)){resp(res,403,{error:'Somente a Administração configura a verificação dos pontos.'});return true;}
   const data=serialize((await body(req,10000)).toString())||{};
   if(!VERIFICATION_MODES.includes(data.verificationMode)||!Number.isInteger(data.dwellSeconds)||data.dwellSeconds<5||data.dwellSeconds>120){resp(res,422,{error:'Escolha GPS, QR ou GPS + QR e permanência entre 5 e 120 segundos.'});return true;}
   const value={verificationMode:data.verificationMode,dwellSeconds:data.dwellSeconds,updatedAt:now()};
   db.prepare("INSERT INTO operational_config(key,value) VALUES('verification_settings',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").run(JSON.stringify(value));
   audit(user,'verification.settings','verification_settings');resp(res,200,{settings:value});return true;
  }
  const labels=path.match(/^\/api\/routes\/([0-9a-f-]{36})\/qr-codes$/i);
  if(labels&&req.method==='GET'){
   if(!reviewer(user)||!manager(user)&&!operations.allows(user,'rondas')){resp(res,403,{error:'Somente a central autorizada pode gerar etiquetas.'});return true;}
   const route=db.prepare('SELECT id,name,points FROM planned_routes WHERE id=?').get(labels[1]);
   if(!route){resp(res,404,{error:'Rota não encontrada.'});return true;}
   const points=serialize(route.points)||[],codes=[];
   for(let i=0;i<points.length;i++){
    const point=points[i],value=pointQrValue(route.id,point);
    codes.push({index:i,name:point.name,address:point.address||'',value,svg:await QRCode.toString(value,{type:'svg',errorCorrectionLevel:'M',margin:4,width:260})});
   }
   resp(res,200,{routeId:route.id,routeName:route.name,codes});return true;
  }
  if(path==='/api/qr/verify'&&req.method==='POST'){
   if(user.role!=='ronda'){resp(res,403,{error:'A leitura deve ser registrada pela conta do agente de ronda.'});return true;}
   const data=serialize((await body(req,10000)).toString())||{};
   if(!/^[0-9a-f-]{36}$/i.test(data.id||'')||!/^[0-9a-f-]{36}$/i.test(data.roundId||'')||!Number.isInteger(data.pointIndex)||typeof data.code!=='string'||data.code.length>250){resp(res,422,{error:'Registro de QR inválido.'});return true;}
   const route=db.prepare('SELECT id,points FROM planned_routes WHERE id=? AND user_id=?').get(String(data.routeId||''),user.id);
   if(!route){resp(res,403,{error:'Rota não atribuída a este agente.'});return true;}
   const points=serialize(route.points)||[],point=points[data.pointIndex];
   if(!point||data.code.trim()!==pointQrValue(route.id,point)){resp(res,422,{error:'QR Code não corresponde ao ponto desta rota.'});return true;}
   const existing=db.prepare('SELECT * FROM qr_verifications WHERE user_id=? AND round_id=? AND point_index=?').get(user.id,data.roundId,data.pointIndex);
   if(existing){if(existing.route_id!==route.id){resp(res,409,{error:'Esta ronda já tem registro de outra rota.'});return true;}resp(res,200,{verified:true,id:existing.id,verifiedAt:existing.verified_at,duplicate:true});return true;}
   if(data.pointIndex>0&&!db.prepare('SELECT id FROM qr_verifications WHERE user_id=? AND round_id=? AND route_id=? AND point_index=?').get(user.id,data.roundId,route.id,data.pointIndex-1)){resp(res,409,{error:'Leia primeiro o QR Code do ponto anterior.'});return true;}
   const at=now();
   db.prepare('INSERT INTO qr_verifications(id,user_id,round_id,route_id,point_index,verified_at) VALUES(?,?,?,?,?,?)').run(data.id,user.id,data.roundId,route.id,data.pointIndex,at);
   audit(user,'qr.verify',data.id);resp(res,201,{verified:true,id:data.id,verifiedAt:at});return true;
  }
  return false;
 };
}
