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
/** Use o mesmo fluxo de atribuição no modo de demonstração e na operação real.
 * A implementação local grava avisos e atribui o roteiro ao perfil correto.
 */
export async function routeRequest(path,options,api){
 return api(path,options);
}
