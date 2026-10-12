import {distanceMeters} from './domain.js';
/** O deslocamento ilustrativo percorre vértices intermediários sem interferir no tempo de permanência. */
export function travel(from,to,durationMs=4200,now=Date.now(),via=[]){
 const path=[from,...via,to].map(p=>({lat:p.lat,lng:p.lng}));
 const distances=path.slice(1).map((p,i)=>distanceMeters(path[i],p));
 const totalDistance=distances.reduce((sum,d)=>sum+d,0);
 return {from:path[0],to:path.at(-1),path,distances,totalDistance,startedAt:now,durationMs:Math.max(600,durationMs)};
}
export function interpolated(t,now=Date.now()){
 const fraction=Math.min(1,Math.max(0,(now-t.startedAt)/t.durationMs));
 const eased=fraction<.5?2*fraction*fraction:1-((-2*fraction+2)**2)/2;
 const path=t.path?.length>=2?t.path:[t.from,t.to];
 const distances=t.distances?.length===path.length-1?t.distances:path.slice(1).map((p,i)=>distanceMeters(path[i],p));
 const total=Number.isFinite(t.totalDistance)?t.totalDistance:distances.reduce((sum,d)=>sum+d,0);
 let remainder=eased*total;
 let i=0;
 while(i<distances.length-1&&remainder>distances[i]){remainder-=distances[i];i++;}
 const a=path[i],b=path[i+1];
 const ratio=distances[i]>0?Math.max(0,Math.min(1,remainder/distances[i])):1;
 return {lat:a.lat+(b.lat-a.lat)*ratio,lng:a.lng+(b.lng-a.lng)*ratio,
  accuracy:5,at:now,finished:fraction>=1,fraction};
}
export function travelDuration(a,b,via=[]){
 const path=[a,...via,b];
 const meters=path.slice(1).reduce((sum,p,i)=>sum+distanceMeters(path[i],p),0);
 return Math.max(2400,Math.min(6800,meters*100));
}
