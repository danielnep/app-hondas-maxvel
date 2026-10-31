export const DEFAULT_VERIFICATION_SETTINGS=Object.freeze({verificationMode:'gps',dwellSeconds:30});
export const VERIFICATION_MODES=Object.freeze(['gps','qr','gps+qr']);
export function verificationSettings(value={}){
 value=value&&typeof value==='object'?value:{};
 const mode=VERIFICATION_MODES.includes(value.verificationMode)?value.verificationMode:'gps';
 const seconds=Number(value.dwellSeconds);
 return {verificationMode:mode,dwellSeconds:Number.isInteger(seconds)&&seconds>=5&&seconds<=120?seconds:30,updatedAt:Number(value.updatedAt)||0};
}
export function pointQrValue(routeId,point){
 if(!routeId||!Number.isFinite(point?.lat)||!Number.isFinite(point?.lng))throw Error('Ponto sem coordenadas reais cadastradas.');
 return 'MAXVEL|'+routeId+'|'+point.lat.toFixed(6)+'|'+point.lng.toFixed(6);
}
export function verificationLabel(settings){
 const s=verificationSettings(settings);
 return s.verificationMode==='qr'?'QR Code':s.verificationMode==='gps+qr'?'GPS '+s.dwellSeconds+' s + QR Code':'GPS '+s.dwellSeconds+' s';
}
