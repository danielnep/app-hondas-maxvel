/**
 * Shared, deterministic minimum-quality check for audit conclusions.
 * Heuristics prevent empty/keyboard-smash submissions. Human review remains necessary.
 */
export function validateConclusion(value){
 const normalized=String(value??'').normalize('NFC').replace(/\s+/g,' ').trim();
 if(normalized.length<24)return {ok:false,reason:'Descreva o que verificou e o encaminhamento adotado (mínimo de 24 caracteres).'};
 if(normalized.length>4000)return {ok:false,reason:'A conclusão deve ter no máximo 4.000 caracteres.'};
 const words=normalized.match(/[\p{L}]{2,}/gu)||[];
 if(words.length<5||new Set(words.map(x=>x.toLocaleLowerCase('pt-BR'))).size<4)return {ok:false,reason:'Escreva uma conclusão com pelo menos cinco palavras relevantes e diferentes.'};
 const alpha=(normalized.match(/\p{L}/gu)||[]).length;
 if(alpha<18)return {ok:false,reason:'Utilize palavras e frases para explicar sua análise.'};
 if(/(.)\1{5,}/iu.test(normalized))return {ok:false,reason:'Evite letras ou símbolos repetidos. Informe uma conclusão descritiva.'};
 const vowels=/[aeiouáàâãéêíóôõúü]/iu;
 const sensible=words.filter(w=>vowels.test(w));
 if(sensible.length<4)return {ok:false,reason:'A conclusão contém sequências sem palavras reconhecíveis. Descreva os fatos e o tratamento.'};
 const longConsonants=(normalized.match(/[bcdfghjklmnpqrstvwxyz]{8,}/giu)||[]).length;
 if(longConsonants>=2)return {ok:false,reason:'Revise o texto: há muitas sequências de letras sem formar palavras.'};
 const uniqueLetters=new Set((normalized.toLocaleLowerCase('pt-BR').match(/\p{L}/gu)||[]));
 if(uniqueLetters.size<7)return {ok:false,reason:'Descreva a conclusão com palavras compreensíveis e específicas.'};
 return {ok:true,reason:'Conclusão pronta para registrar.',value:normalized};
}