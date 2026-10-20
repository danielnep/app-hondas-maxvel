// Acesso real do Ronda Pro. Senhas e dados ficam exclusivamente no servidor.
export async function liveRequest(path,{method='GET',data}={}){
 const token=sessionStorage.getItem('rondaspro_api_token');
 const response=await fetch('/api'+path,{method,headers:{...(token?{Authorization:'Bearer '+token}:{}),...(data!==undefined?{'Content-Type':'application/json'}:{})},body:data===undefined?undefined:JSON.stringify(data),cache:'no-store'});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||'Erro de conexao ('+response.status+')');
 return result;
}
export const liveSession={
 get token(){return sessionStorage.getItem('rondaspro_api_token')},
 set token(value){if(value)sessionStorage.setItem('rondaspro_api_token',value);else sessionStorage.removeItem('rondaspro_api_token')}
};
export function loginHtml(brand,error=''){
 const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<div class="entry-screen product-home"><header class="entry-topnav topnav">'+brand+'</header><main class="entry-main" id="main"><section class="entry-panel"><div class="entry-eyebrow">GRUPO MAXVEL · ACESSO OPERACIONAL</div><h1>Ronda <span>Pro.</span></h1><p>Entre com seu usuário ou e-mail.</p><form id="live-login-form" class="login"><label>Usuário ou e-mail<input name="identifier" autocomplete="username" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><button class="button primary full" type="submit">Entrar</button></form>'+(error?'<p class="flag" role="alert">'+escape(error)+'</p>':'')+'</section></main></div>';
}
