/* Maxvel: sectors and capability policy are enforced by the server, not just by switches. */
const MODULES=['mapa','rondas','despachos','ocorrencias','alertas','relatorios','equipe','vistorias'];
const clean=value=>String(value??'').trim();
export const SECTOR_MODULES=Object.freeze([...MODULES]);
export function createSectorManagement(db,{id,now,audit,resp,body,serialize}){
 db.exec('CREATE TABLE IF NOT EXISTS maxvel_sectors(id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE COLLATE NOCASE,address TEXT NOT NULL DEFAULT "",address_confirmed INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL)');
 db.exec('CREATE TABLE IF NOT EXISTS maxvel_sector_capabilities(sector_id TEXT NOT NULL,module TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(sector_id,module),FOREIGN KEY(sector_id) REFERENCES maxvel_sectors(id))');
 db.exec('CREATE TABLE IF NOT EXISTS maxvel_sector_members(sector_id TEXT NOT NULL,user_id TEXT NOT NULL,PRIMARY KEY(sector_id,user_id),FOREIGN KEY(sector_id) REFERENCES maxvel_sectors(id),FOREIGN KEY(user_id) REFERENCES users(id))');
 db.exec('CREATE TABLE IF NOT EXISTS maxvel_onboarding(user_id TEXT NOT NULL,version TEXT NOT NULL,seen_at INTEGER NOT NULL,PRIMARY KEY(user_id,version),FOREIGN KEY(user_id) REFERENCES users(id))');
 const manage=user=>['master','admin'].includes(user.role);
 const read=user=>manage(user)||['coi','operador'].includes(user.role);
 const modulesOf=sector=>Object.fromEntries(db.prepare('SELECT module,enabled FROM maxvel_sector_capabilities WHERE sector_id=? ORDER BY module').all(sector).map(x=>[x.module,!!x.enabled]));
 const membersOf=sector=>db.prepare('SELECT u.id,u.name,u.role FROM users u JOIN maxvel_sector_members sm ON sm.user_id=u.id WHERE sm.sector_id=? ORDER BY u.name').all(sector);
 const list=()=>db.prepare('SELECT id,name,address,address_confirmed,active,created_at,updated_at FROM maxvel_sectors ORDER BY active DESC,name COLLATE NOCASE').all().map(s=>({...s,address_confirmed:!!s.address_confirmed,active:!!s.active,capabilities:modulesOf(s.id),members:membersOf(s.id)}));
 const own=user=>db.prepare('SELECT s.id,s.name,s.active,c.module,c.enabled FROM maxvel_sector_members sm JOIN maxvel_sectors s ON s.id=sm.sector_id JOIN maxvel_sector_capabilities c ON c.sector_id=s.id WHERE sm.user_id=?').all(user.id);
 const allows=(user,module)=>{
  if(manage(user)||!MODULES.includes(module))return true;
  const rows=own(user);
  // Legacy users have no sector assignment: preserve their existing role grants.
  if(!db.prepare('SELECT 1 FROM maxvel_sector_members WHERE user_id=?').get(user.id))return true;
  // Any explicit assignment restricts a module to at least one active,
  // enabled sector. It never expands permissions granted by the user role.
  return rows.some(row=>row.module===module&&row.active===1&&row.enabled===1);
 };
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{fn();db.exec('COMMIT');}catch(error){db.exec('ROLLBACK');throw error;}};
 const ref=/^\/api\/sectors\/([0-9a-f-]{36})$/i;
 const link=/^\/api\/sectors\/([0-9a-f-]{36})\/members$/i;
 async function handle(req,res,user,path,method){
  if(path==='/api/onboarding'&&(method==='GET'||method==='PUT')){
   const version='2.2.5-beta';
   if(method==='PUT')db.prepare('INSERT INTO maxvel_onboarding(user_id,version,seen_at) VALUES(?,?,?) ON CONFLICT(user_id,version) DO UPDATE SET seen_at=excluded.seen_at').run(user.id,version,now());
   resp(res,200,{version,seen:!!db.prepare('SELECT 1 FROM maxvel_onboarding WHERE user_id=? AND version=?').get(user.id,version)});return true;
  }
  if(path==='/api/sectors'&&method==='GET'){
   if(!read(user)){resp(res,403,{error:'Somente a gestão e a central consultam setores.'});return true;}
   resp(res,200,{sectors:list(),modules:MODULES});return true;
  }
  if(path==='/api/sectors/mine'&&method==='GET'){
   resp(res,200,{assignments:own(user),restricted:own(user).length>0});return true;
  }
  if(path==='/api/sectors'&&method==='POST'){
   if(!manage(user)){resp(res,403,{error:'Apenas Administração ou Master cadastra setores.'});return true;}
   const data=serialize((await body(req,6000)).toString())||{};
   const name=clean(data.name),address=clean(data.address);
   if(name.length<2||name.length>80||address.length>180||typeof data.addressConfirmed!=='boolean'){resp(res,422,{error:'Informe nome válido e confirme se o endereço foi verificado.'});return true;}
   if(db.prepare('SELECT id FROM maxvel_sectors WHERE name=? COLLATE NOCASE').get(name)){resp(res,409,{error:'Já existe um setor com este nome.'});return true;}
   const sectorId=id(),at=now();
   db.exec('BEGIN IMMEDIATE');
   try{
    db.prepare('INSERT INTO maxvel_sectors(id,name,address,address_confirmed,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(sectorId,name,address,data.addressConfirmed?1:0,at,at);
    for(const module of MODULES)db.prepare('INSERT INTO maxvel_sector_capabilities(sector_id,module,enabled) VALUES(?,?,1)').run(sectorId,module);
    audit(user,'sector.create',sectorId);
    db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   resp(res,201,{id:sectorId,created:true});return true;
  }
  const match=path.match(ref);
  if(match&&(method==='PUT'||method==='DELETE')){
   if(!manage(user)){resp(res,403,{error:'Somente a gestão pode modificar setores.'});return true;}
   const sector=db.prepare('SELECT id,active FROM maxvel_sectors WHERE id=?').get(match[1]);
   if(!sector){resp(res,404,{error:'Setor não encontrado.'});return true;}
   if(method==='DELETE'){
    transaction(()=>{db.prepare('UPDATE maxvel_sectors SET active=0,updated_at=? WHERE id=?').run(now(),sector.id);
    audit(user,'sector.deactivate',sector.id);});
    resp(res,200,{ok:true,active:false});return true;
   }
   const data=serialize((await body(req,6000)).toString())||{};
   const name=clean(data.name),address=clean(data.address);
   if(name.length<2||name.length>80||address.length>180||typeof data.active!=='boolean'||typeof data.addressConfirmed!=='boolean'||!data.capabilities||typeof data.capabilities!=='object'||Array.isArray(data.capabilities)||Object.keys(data.capabilities).some(m=>!MODULES.includes(m))||Object.values(data.capabilities).some(v=>typeof v!=='boolean')){
    resp(res,422,{error:'Dados de setor e capacidades inválidos.'});return true;
   }
   if(db.prepare('SELECT id FROM maxvel_sectors WHERE name=? COLLATE NOCASE AND id<>?').get(name,sector.id)){resp(res,409,{error:'Já existe outro setor com esse nome.'});return true;}
   db.exec('BEGIN IMMEDIATE');
   try{
    db.prepare('UPDATE maxvel_sectors SET name=?,address=?,address_confirmed=?,active=?,updated_at=? WHERE id=?').run(name,address,data.addressConfirmed?1:0,data.active?1:0,now(),sector.id);
    const query=db.prepare('INSERT INTO maxvel_sector_capabilities(sector_id,module,enabled) VALUES(?,?,?) ON CONFLICT(sector_id,module) DO UPDATE SET enabled=excluded.enabled');
    for(const [module,enabled] of Object.entries(data.capabilities))query.run(sector.id,module,enabled?1:0);
    audit(user,'sector.update',sector.id);db.exec('COMMIT');
   }catch(error){db.exec('ROLLBACK');throw error;}
   resp(res,200,{ok:true});return true;
  }
  const member=path.match(link);
  if(member&&method==='PUT'){
   if(!manage(user)){resp(res,403,{error:'Somente a gestão vincula colaboradores.'});return true;}
   const sector=db.prepare('SELECT id,active FROM maxvel_sectors WHERE id=?').get(member[1]);
   if(!sector||!sector.active){resp(res,409,{error:'Reative o setor antes de vincular colaboradores.'});return true;}
   const data=serialize((await body(req,3000)).toString())||{};
   const userId=clean(data.userId),worker=db.prepare('SELECT id,role FROM users WHERE id=? AND active=1').get(userId);
   if(!worker||!['ronda','vistoriador','coi','operador','cliente'].includes(worker.role)||typeof data.enabled!=='boolean'){resp(res,422,{error:'Selecione um colaborador ativo e uma operação válida.'});return true;}
   transaction(()=>{if(data.enabled)db.prepare('INSERT OR IGNORE INTO maxvel_sector_members(sector_id,user_id) VALUES(?,?)').run(sector.id,userId);
   else db.prepare('DELETE FROM maxvel_sector_members WHERE sector_id=? AND user_id=?').run(sector.id,userId);
   audit(user,data.enabled?'sector.member.add':'sector.member.remove',sector.id);});
   resp(res,200,{ok:true});return true;
  }
  return false;
 }
 return {handle,allows,list};
}
