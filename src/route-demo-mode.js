/** Dados de cenário, isolados no armazenamento local do modo de testes.
 * A operação real não cria estes usuários e não usa este atalho.
 */
import {isPagesTestMode,PAGES_TEST_ACCOUNTS} from './pages-test-api.js';
export const DEMO_THREE=Object.freeze([
 {name:'Lucas Ferreira',username:'vigia-demo-lucas'},
 {name:'Ana Beatriz',username:'vigia-demo-ana'},
 {name:'Rafael Costa',username:'vigia-demo-rafael'}
]);
const base='ronda-pro-pages-test-v2:';
export function seedDemoThree(){
 if(!isPagesTestMode())return;
 const worker=PAGES_TEST_ACCOUNTS.find(x=>x.role==='ronda');
 if(!worker)return;
 try{
  const original=JSON.parse(localStorage.getItem(base+'extra-users')||'[]');
  if(!Array.isArray(original))return;
  let changed=false;
  const rows=[...original];
  for(const sample of DEMO_THREE){
   if(rows.some(x=>x.username===sample.username))continue;
   rows.push({...sample,role:'ronda',email:sample.username+'@rondapro.local',password:worker.password,site:'Grupo Maxvel',demo:true});
   changed=true;
  }
  if(changed)localStorage.setItem(base+'extra-users',JSON.stringify(rows));
 }catch{}
}
export function exampleVigia(user){return isPagesTestMode()&&DEMO_THREE.some(x=>x.username===user?.username)}
export function testRouteUsers(users){return isPagesTestMode()?users.filter(x=>exampleVigia(x)):users.filter(x=>x.role==='ronda'&&x.active!==0)}
export async function routeRequest(path,options,api,role){
 if(!isPagesTestMode()||path!=='/routes'||options?.method!=='POST'||role!=='coi')return api(path,options);
 const d=options.data,watch=DEMO_THREE.find(x=>'pages-'+x.username===d?.userId);
 if(!watch||!Array.isArray(d.points)||d.points.length<2||d.points.length>30)throw Error('Selecione um dos vigias de demonstração e dois ou mais endereços.');
 const key=base+'routes';
 const routes=JSON.parse(localStorage.getItem(key)||'[]');
 if(!Array.isArray(routes))throw Error('Dados de teste indisponíveis.');
 const id=typeof crypto.randomUUID==='function'?crypto.randomUUID():'demo-'+Date.now();
 routes.push({...d,id,workerName:watch.name,site:'Grupo Maxvel',createdAt:Date.now(),updatedAt:Date.now()});
 localStorage.setItem(key,JSON.stringify(routes));
 return {id};
}