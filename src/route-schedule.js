/** Calendário local da unidade para rondas agendadas.
 * Não converte horários de parede em UTC nem autoriza GPS: somente elegibilidade temporal.
 * Rotas antigas, sem recorrência, continuam compatíveis com o contrato anterior.
 */
const DAY_MS=86400000;
const validHour=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
 const [y,m,d]=value.split('-').map(Number);
 const date=new Date(y,m-1,d);
 return date.getFullYear()===y&&date.getMonth()===m-1&&date.getDate()===d?date:null;
}
const dayNumber=date=>Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/DAY_MS;
function onSchedule(schedule,date){
 const anchor=validDate(schedule.startDate),delta=anchor?dayNumber(date)-dayNumber(anchor):null;
 switch(schedule.recurrence){
  case 'once':return delta===0;
  case 'daily':return true;
  case 'alternate':return delta!==null&&delta>=0&&delta%2===0;
  case 'weekly':return Array.isArray(schedule.weekdays)&&schedule.weekdays.includes(date.getDay());
  default:return false;
 }
}
function occurrence(schedule,date){
 if(!validHour(schedule.hour)||!onSchedule(schedule,date))return null;
 const [hour,minute]=schedule.hour.split(':').map(Number);
 const at=new Date(date.getFullYear(),date.getMonth(),date.getDate(),hour,minute);
 return at.getFullYear()===date.getFullYear()&&at.getMonth()===date.getMonth()&&at.getDate()===date.getDate()?at.getTime():null;
}
export function routeCanStart(route,now=Date.now()){
 const s=route?.schedule;
 if(!s?.recurrence)return true;
 const time=Number(now);
 if(!Number.isFinite(time))return false;
 const date=new Date(time),at=occurrence(s,date);
 return at!==null&&at<=time;
}
export function nextRouteStart(route,now=Date.now()){
 const time=Number(now);
 if(!Number.isFinite(time))return null;
 const s=route?.schedule;
 if(!s?.recurrence){
  const legacy=route?.plannedStart;
  return Number.isFinite(legacy)&&legacy>=time-60000?legacy:null;
 }
 if(!validHour(s.hour))return null;
 if(s.recurrence==='once'){
  const date=validDate(s.startDate);
  if(!date)return null;
  const at=occurrence(s,date);
  return at!==null&&at>=time-60000?at:null;
 }
 const today=new Date(time);
 for(let i=0;i<370;i++){
  const date=new Date(today.getFullYear(),today.getMonth(),today.getDate()+i);
  const at=occurrence(s,date);
  if(at!==null&&at>=time-60000)return at;
 }
 return null;
}
