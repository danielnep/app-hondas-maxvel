const STORAGE_KEY='horizon-maxvel-v1';
export function loadState(){
 try{const s=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return s&&s.version===1?s:null;}
 catch{return null;}
}
export function saveState(s){
 try{localStorage.setItem(STORAGE_KEY,JSON.stringify({...s,version:1}));return true;}
 catch{return false;}
}
export function clearState(){try{localStorage.removeItem(STORAGE_KEY);}catch{}}