import test from 'node:test';
import assert from 'node:assert/strict';
import {searchPlaces,rankPlaces,placeDistance,requestSearchFocus} from '../src/place-search.js';
// Referências cartográficas públicas; não são uma localização simulada de telefone.
const sanctuary={lat:-20.1429457,lng:-44.8904539};
const street={name:'Rua Pernambuco',address:'Rua Pernambuco, Divinópolis, Minas Gerais, Brasil',lat:-20.1472637,lng:-44.8908018};
const far={name:'Avenida Pernambuco',address:'Avenida Pernambuco, Ribeirão das Neves, Minas Gerais, Brasil',lat:-19.7504048,lng:-44.0912268};
const feature=p=>({properties:{name:p.name,city:p===far?'Ribeirão das Neves':'Divinópolis',state:'Minas Gerais',country:'Brasil'},geometry:{coordinates:[p.lng,p.lat]}});
test('ordena por distância real e mantém só o segmento mais próximo do mesmo endereço',()=>{
 const duplicate={...street,lat:-20.1461754,lng:-44.8940789};
 const points=rankPlaces([far,street,duplicate],sanctuary);
 assert.equal(points.length,2);assert.equal(points[0].name,'Rua Pernambuco');
 assert.ok(points[0].distanceMeters<600);assert.ok(points[1].distanceMeters>80000);
 assert.equal(placeDistance(sanctuary,sanctuary),0);
});
test('envia foco e país ao geocodificador e encontra o nome real da via próxima',async()=>{
 const urls=[];const fetcher=async raw=>{const u=new URL(raw);urls.push(u);return {ok:true,json:async()=>({features:u.searchParams.has('bbox')?[feature(street)]:[feature(far)]})}};
 const points=await searchPlaces('Avenida Pernambuco',{focus:sanctuary,fetcher});
 assert.equal(urls.length,2);for(const u of urls){assert.equal(u.searchParams.get('lat'),String(sanctuary.lat));assert.equal(u.searchParams.get('lon'),String(sanctuary.lng));assert.equal(u.searchParams.get('countrycode'),'BR');}
 assert.equal(urls[1].searchParams.get('q'),'Pernambuco');assert.ok(urls[1].searchParams.has('bbox'));
 assert.equal(points[0].name,'Rua Pernambuco');assert.equal(points[0].lat,street.lat);
});
test('sem localização não inventa foco, resultados ou distância',async()=>{
 let url;const rows=await searchPlaces('Farmácia',{fetcher:async raw=>{url=new URL(raw);return {ok:true,json:async()=>({features:[]})}}});
 assert.deepEqual(rows,[]);assert.equal(url.searchParams.has('lat'),false);assert.equal(url.searchParams.has('lon'),false);
 assert.equal(await requestSearchFocus(),null);
});
test('consulta cancelada não entrega uma resposta antiga',async()=>{
 const controller=new AbortController();
 const fetcher=async(raw,{signal})=>new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(Object.assign(Error('cancelado'),{name:'AbortError'})),{once:true});});
 const pending=searchPlaces('Pernambuco',{focus:sanctuary,signal:controller.signal,fetcher});controller.abort();
 await assert.rejects(pending,{name:'AbortError'});
});
