/** Instalador PWA: só oferece instalação quando permitida pelo navegador. */
export function createInstallManager(){
 let deferred=null,installed=window.matchMedia?.('(display-mode: standalone)')?.matches||false;
 const show=()=>{
  document.querySelectorAll('[data-install-app]').forEach(b=>{b.hidden=installed;b.disabled=false;});
 };
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;show();});
 window.addEventListener('appinstalled',()=>{installed=true;deferred=null;show();});
 document.addEventListener('click',async e=>{
  const target=e.target.closest('[data-install-app]');if(!target)return;
  e.preventDefault();if(installed)return;
  if(deferred){const prompt=deferred;deferred=null;await prompt.prompt();await prompt.userChoice;show();return;}
  const onIphone=/iPad|iPhone|iPod/.test(navigator.userAgent);
  const message=onIphone
   ?'No Safari: toque Compartilhar e escolha Adicionar à Tela de Início.'
   :'No navegador: abra o menu e escolha Instalar aplicativo ou Adicionar à tela inicial. A opção depende do navegador e da instalação compatível.';
  window.alert(message);
 });
 // No celular, a instalação aparece em Navegação, não sobre a marca da Maxvel.
 // O diálogo é criado pelo app no mesmo clique; esperar o final do evento.
 const decorate=()=>{
  const inMobileDashboard=window.matchMedia?.('(max-width:900px)')?.matches&&!!document.querySelector('.dashboard');
  const host=inMobileDashboard
   ?document.querySelector('.ux-access-menu')
   :document.querySelector('.nav-actions, .header-actions');
  if(!host||host.querySelector('[data-install-app]')||installed)return;
  const button=document.createElement('button');
  button.type='button';button.className='button small install-app-btn';
  button.setAttribute('data-install-app','');
  button.textContent='↓ Instalar aplicativo';
  button.setAttribute('aria-label','Instalar Rondas Pro no dispositivo');
  if(inMobileDashboard)host.append(button);
  else host.prepend(button);
  show();
 };
 document.addEventListener('click',event=>{
  if(event.target.closest('[data-action="open-mobile-menu"]'))queueMicrotask(decorate);
 });
 return {decorate};
}
