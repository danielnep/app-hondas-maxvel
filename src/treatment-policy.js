/* Vocabulário único dos tipos já aceitos pela API operacional. */
export const EVENT_TYPES={
 incident:{label:'Ocorrências',icon:'▤'},alert:{label:'Alertas',icon:'⚠'},message:{label:'Mensagens',icon:'✉'},
 panic:{label:'Pânicos',icon:'!'},inspection:{label:'Vistorias',icon:'✓'},
 gps_issue:{label:'Falhas de GPS',icon:'⌖'},route_deviation:{label:'Desvios de rota',icon:'↗'},
 patrol_incomplete:{label:'Rondas incompletas',icon:'◷'},patrol_interrupted:{label:'Rondas interrompidas',icon:'Ⅱ'},
 patrol_start:{label:'Inícios de ronda',icon:'▷'},patrol_end:{label:'Términos de ronda',icon:'■'},
 checkpoint:{label:'Pontos',icon:'◎'},gps:{label:'Posições GPS',icon:'⊕'},battery:{label:'Bateria',icon:'▰'},media:{label:'Mídias',icon:'▧'}
};
export const isPending=event=>!!event&&event.status!=='resolvida';
export const primaryRole=role=>['coi','operador'].includes(role);
export const administrativeRole=role=>['admin','master'].includes(role);
export const typeInfo=kind=>EVENT_TYPES[kind]||{label:kind||'Registro',icon:'•'};
export const stateLabel=event=>event.status==='resolvida'?'Concluída':event.status==='em_analise'?'Em análise':event.status==='encaminhada'?'Encaminhada':'Pendente';
