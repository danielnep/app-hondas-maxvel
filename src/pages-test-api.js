/**
 * Ronda Pro, acesso descartavel de avaliacao no GitHub Pages e Railway.
 * Sem servidor: credenciais e registros deste teste sao PUBLICOS/locais ao navegador.
 * Nunca usar estas senhas para acesso real nem confiar em papeis locais como seguranca.
 */
export const isPagesTestMode = () => typeof location !== 'undefined' && ['danielnep.github.io','ronda-pro-production.up.railway.app'].includes(location.hostname);
export const PAGES_TEST_ACCOUNTS=Object.freeze([
 {name:'Administrador',username:'admin',email:'admin@rondapro.local',role:'admin',password:'Admin@Maxvel26!'},
 {name:'Operador COI',username:'coi',email:'coi@rondapro.local',role:'coi',password:'Coi@Maxvel26!'},
 {name:'Vigia',username:'vigia',email:'vigia@rondapro.local',role:'ronda',password:'Vigia@Maxvel26!'},
 {name:'Vistoriador',username:'vistoriador',email:'vistoriador@rondapro.local',role:'vistoriador',password:'Vistoria@Maxvel26!'}
]);
const PREFIX='ronda-pro-pages-test-v2:',TOKEN_KEY='rondaspro_api_token';
const read=(key,defaultValue)=>{try{return JSON.parse(localStorage.getItem(PREFIX+key))??defaultValue}catch{return defaultValue}};
const store=(key,data)=>localStorage.setItem(PREFIX+key,JSON.stringify(data));
const identity=a=>({id:'pages-'+a.username,name:a.name,username:a.username,email:a.email,role:a.role,active:1,site:'Grupo Maxvel'});
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
const allUsers=()=>[...PAGES_TEST_ACCOUNTS,...read('extra-users',[])];
const current=()=>{
 const token=sessionStorage.getItem(TOKEN_KEY);
 if(!token?.startsWith('pages-test:'))throw fail('Entre com uma conta de teste.',401);
 const a=allUsers().find(u=>u.username===token.slice(11));
 if(!a)throw fail('Sessão de teste inválida.',401);
 return a;
};
const newId=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'pages-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const own=(items,id)=>items.filter(item=>item.userId===id||item.user_id===id);
export async function pagesTestRequest(path,{method='GET',data}={}){
 const p=String(path||'').split('?')[0];
 if(p==='/login'&&method==='POST'){
  const input=String(data?.email??'').trim().toLowerCase();
  const a=allUsers().find(u=>(u.username===input||u.email===input)&&u.password===data?.password);
  if(!a)throw fail('Usuário ou senha incorretos.',401);
  return {token:'pages-test:'+a.username,user:identity(a),expiresIn:28800};
 }
 const a=current(),user=identity(a);
 if(p==='/me'&&method==='GET')return {user};
 if(p==='/logout'&&method==='POST'){sessionStorage.removeItem(TOKEN_KEY);return {ok:true};}
 if(p==='/app-state'){
  if(method==='GET')return {state:read('state:'+user.id,null)};
  if(method==='PUT'){
   if(!Array.isArray(data?.sessions)||!Array.isArray(data?.programs))throw fail('Estado operacional inválido.',422);
   store('state:'+user.id,{sessions:data.sessions,programs:data.programs,selectedWatcherId:data.selectedWatcherId||'',operationalSettings:data.operationalSettings||{}});
   return {stored:true};
  }
 }
 if(p==='/users'){
  if(method==='GET')return {users:allUsers().map(identity)};
  if(method==='POST'){
   if(a.role!=='admin')throw fail('Somente administrador cadastra.',403);
   const username=String(data?.username??'').trim().toLowerCase();
   const email=String(data?.email??'').trim().toLowerCase();
   if(!/^[a-z0-9._-]{3,40}$/.test(username)||!email.includes('@')||String(data?.password||'').length<12||!['coi','ronda','vistoriador','admin'].includes(data?.role)||String(data?.name||'').trim().length<2)throw fail('Informe nome, usuário, e-mail, perfil e senha com 12 caracteres.',422);
   if(allUsers().some(x=>x.username===username||x.email===email))throw fail('Usuário ou e-mail já cadastrado.',409);
   const users=read('extra-users',[]);
   users.push({name:String(data.name).trim(),email,username,password:data.password,role:data.role});
   store('extra-users',users);return {id:'pages-'+username};
  }
 }
 if(p==='/routes'){
  const rows=read('routes',[]);
  if(method==='GET')return {routes:a.role==='ronda'?own(rows,user.id):rows};
  if(method==='POST'){
   if(a.role!=='admin')throw fail('Somente administração cria rotas.',403);
   if(!data?.userId||!Array.isArray(data?.points)||data.points.length<2)throw fail('Informe responsável e dois pontos.',422);
   const entry={...data,id:newId(),createdAt:Date.now(),updatedAt:Date.now(),site:'Grupo Maxvel'};
   store('routes',[...rows,entry]);return {id:entry.id};
  }
 }
 if(p==='/dispatches'){
  const rows=read('dispatches',[]);
  if(method==='GET')return {dispatches:a.role==='vistoriador'?own(rows,user.id):rows};
  if(method==='POST'){
   if(!['admin','coi'].includes(a.role))throw fail('Sem permissão.',403);
   const item={...data,id:newId(),createdAt:Date.now(),status:'pending'};
   store('dispatches',[item,...rows]);return {id:item.id};
  }
 }
 const dispatch=p.match(/^\/dispatches\/([^/]+)\/(arrive|complete|start|cancel)$/);
 if(dispatch&&method==='POST'){
  const rows=read('dispatches',[]),item=rows.find(x=>x.id===dispatch[1]);
  if(!item)throw fail('Solicitação não encontrada.',404);
  item.status=dispatch[2]==='complete'?'completed':dispatch[2]==='cancel'?'cancelled':'in_progress';
  store('dispatches',rows);return {ok:true};
 }
 if(p==='/events'){
  const rows=read('events',[]);
  if(method==='GET')return {events:['ronda','vistoriador'].includes(a.role)?own(rows,user.id):rows};
  if(method==='POST'){
   const item={...data,id:newId(),user_id:user.id,userId:user.id,occurredAt:Date.now(),status:'aberta'};
   store('events',[item,...rows]);return {id:item.id,event:item};
  }
 }
 if((p==='/presence'||p==='/presence/off')&&method==='POST')return {ok:true};
 if(p==='/chat/contacts'&&method==='GET')return {contacts:allUsers().filter(x=>x.username!==a.username).map(identity)};
 if(p==='/chat/conversations'&&method==='GET')return {conversations:read('conversations',[]).filter(x=>x.members.includes(user.id))};
 if(p==='/chat/conversations'&&method==='POST'){
  if(!Array.isArray(data?.members)||!data.members.length)throw fail('Selecione um contato.',422);
  const entries=read('conversations',[]);
  const item={id:newId(),members:[user.id,...data.members],createdAt:Date.now()};
  store('conversations',[item,...entries]);return item;
 }
 const chat=p.match(/^\/chat\/conversations\/([^/]+)\/messages$/);
 if(chat){
  const conversation=read('conversations',[]).find(x=>x.id===chat[1]&&x.members.includes(user.id));
  if(!conversation)throw fail('Conversa não encontrada.',404);
  const rows=read('chat:'+chat[1],[]);
  if(method==='GET')return {messages:rows};
  if(method==='POST'){
   const body=String(data?.body||'').trim();
   if(!body)throw fail('Digite uma mensagem.',422);
   const message={id:newId(),body,author_id:user.id,createdAt:Date.now()};
   store('chat:'+chat[1],[...rows,message]);return message;
  }
 }
 throw fail('Função indisponível neste teste local. Não houve envio ao servidor.',501);
}
