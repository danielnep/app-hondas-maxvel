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

/** Identificador do dia em que uma rotina já ficou elegível na unidade.
 * A zona é explícita: o relógio UTC do servidor não desloca uma ronda brasileira.
 */
export function dueScheduleOccurrence(schedule,at=Date.now(),timeZone='America/Sao_Paulo'){
 if(!schedule||!validHour(schedule.hour)||!Number.isFinite(at))return null;
 const fields=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
  .formatToParts(new Date(at));
 const part=t=>fields.find(f=>f.type===t)?.value;
 const date=[part('year'),part('month'),part('day')].join('-'),clock=part('hour')+':'+part('minute');
 if(clock<schedule.hour)return null;
 const base=validDate(schedule.startDate),today=validDate(date);
 if(!today)return null;
 const delta=base?dayNumber(today)-dayNumber(base):null;
 switch(schedule.recurrence){
  case 'once':return delta===0?date:null;
  case 'daily':return !base||delta>=0?date:null;
  case 'alternate':return delta!==null&&delta>=0&&delta%2===0?date:null;
  case 'weekly':return Array.isArray(schedule.weekdays)&&schedule.weekdays.includes(today.getDay())&&(!base||delta>=0)?date:null;
  default:return null;
 }
}
