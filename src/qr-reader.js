let decoderPromise;
export function loadQrDecoder(){
 if(typeof globalThis.jsQR==='function')return Promise.resolve(globalThis.jsQR);
 if(!decoderPromise)decoderPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src=new URL('../assets/vendor/jsqr/jsQR.js',import.meta.url).href;
  script.onload=()=>typeof globalThis.jsQR==='function'?resolve(globalThis.jsQR):reject(Error('Leitor QR não carregou.'));
  script.onerror=()=>{script.remove();decoderPromise=null;reject(Error('Não foi possível carregar o leitor QR do aparelho.'));};
  document.head.append(script);
 });
 return decoderPromise;
}
