import {distanceMeters} from './domain.js';
/** O deslocamento simula posições intermediárias; não depende de cronômetro de permanência. */
export function travel(from,to,durationMs=4200,now=Date.now()){
  return {from:{lat:from.lat,lng:from.lng},to:{lat:to.lat,lng:to.lng},startedAt:now,durationMs:Math.max(600,durationMs)};
}
export function interpolated(t,now=Date.now()){
  const fraction=Math.min(1,Math.max(0,(now-t.startedAt)/t.durationMs));
  const eased=fraction<.5?2*fraction*fraction:1-((-2*fraction+2)**2)/2;
  return {lat:t.from.lat+(t.to.lat-t.from.lat)*eased,lng:t.from.lng+(t.to.lng-t.from.lng)*eased,
    accuracy:5,at:now,finished:fraction>=1,fraction};
}
export function travelDuration(a,b){return Math.max(2400,Math.min(6800,distanceMeters(a,b)*100));}