import test from 'node:test';
import assert from 'node:assert/strict';
import {canDragDialogSurface} from '../src/ui-motion.js';

function element(parentElement=null,{scrollHeight=0,clientHeight=0,overflowY='visible',interactive=false}={}){
 return {
  parentElement,scrollHeight,clientHeight,overflowY,
  closest(){return interactive?this:null;}
 };
}
const styleFor=node=>({overflowY:node.overflowY});

test('swipe começa em área não interativa da superfície, não apenas no título',()=>{
 const modal=element();
 modal.contains=target=>{for(let p=target;p;p=p.parentElement)if(p===modal)return true;return false;};
 const section=element(modal),paragraph=element(section),blank=element(section);
 assert.equal(canDragDialogSurface(paragraph,modal,styleFor),true);
 assert.equal(canDragDialogSurface(blank,modal,styleFor),true);
 assert.equal(canDragDialogSurface(modal,modal,styleFor),false);
});

test('cliques em botões e componentes interativos nunca iniciam arrasto',()=>{
 const modal=element();modal.contains=()=>true;
 const button=element(modal,{interactive:true});
 const label=element(button);
 label.closest=()=>button;
 assert.equal(canDragDialogSurface(button,modal,styleFor),false);
 assert.equal(canDragDialogSurface(label,modal,styleFor),false);
});

test('scroll de listas, formulários e mensagens prevalece sobre gesto do modal',()=>{
 const modal=element();modal.contains=()=>true;
 const thread=element(modal,{scrollHeight:900,clientHeight:320,overflowY:'auto'});
 const message=element(thread);
 assert.equal(canDragDialogSurface(message,modal,styleFor),false);
 const fixed=element(modal,{scrollHeight:200,clientHeight:320,overflowY:'auto'});
 assert.equal(canDragDialogSurface(element(fixed),modal,styleFor),true);
});

test('não permite gesto em elementos externos ao diálogo',()=>{
 const modal=element();modal.contains=()=>false;
 assert.equal(canDragDialogSurface(element(),modal,styleFor),false);
});
