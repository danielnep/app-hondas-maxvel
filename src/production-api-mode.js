// Operação real: este módulo substitui o adaptador de apresentação no servidor e no APK.
export const isPagesTestMode=()=>false;
export const PAGES_TEST_ACCOUNTS=Object.freeze([]);
export async function pagesTestRequest(){
 throw Object.assign(new Error('Acesse com uma conta cadastrada na VPS.'),{status:410});
}
