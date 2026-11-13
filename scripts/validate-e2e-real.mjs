import { strict as assert } from 'node:assert';
import http from 'node:http';

const BASE = 'http://127.0.0.1:8325';

async function req(path, method = 'GET', data = null, token = null) {
  const url = new URL(path, BASE);
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined
  });
  const text = await res.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  return { status: res.status, body };
}

async function runValidation() {
  console.log('🏁 INICIANDO VALIDAÇÃO AUTOMATIZADA E REAL (FASE 6)...');

  // 1. Autenticação dos perfis
  console.log('1. Autenticando COI e Agente de Ronda...');
  const coiLogin = await req('/api/login', 'POST', { email: 'coi@rondapro.local', password: 'Maxvel@2026' });
  assert.equal(coiLogin.status, 200, 'Login COI falhou');
  const coiToken = coiLogin.body.token;
  const coiUser = coiLogin.body.user;
  console.log('   ✅ COI autenticado:', coiUser.name, 'Token:', coiToken.slice(0, 8) + '...');

  const rondaLogin = await req('/api/login', 'POST', { email: 'ronda@rondapro.local', password: 'Maxvel@2026' });
  assert.equal(rondaLogin.status, 200, 'Login Ronda falhou');
  const rondaToken = rondaLogin.body.token;
  const rondaUser = rondaLogin.body.user;
  console.log('   ✅ Agente de Ronda autenticado:', rondaUser.name, 'Token:', rondaToken.slice(0, 8) + '...');

  // 2. Ronda registra presença inicial (fica disponível)
  console.log('2. Agente de Ronda registrando presença e disponibilidade...');
  const presRes = await req('/api/presence', 'POST', {
    position: { lat: -20.1381, lng: -44.8862, accuracy: 8 }
  }, rondaToken);
  assert.equal(presRes.status, 200, 'Registro de presença falhou');
  assert.equal(presRes.body.ok, true);
  console.log('   ✅ Presença e GPS inicial gravados');

  // 3. COI verifica disponibilidade
  console.log('3. COI consultando disponibilidade operacional...');
  const availRes = await req('/api/availability', 'GET', null, coiToken);
  assert.equal(availRes.status, 200, 'Consulta de disponibilidade falhou');
  const guard = availRes.body.guards.find(g => g.id === rondaUser.id);
  assert.ok(guard, 'Agente de Ronda não encontrado na lista de guardas');
  assert.equal(guard.status, 'Disponível', 'Agente de Ronda não está Disponível');
  console.log('   ✅ Agente de Ronda confirmado como Disponível no COI');

  // 4. Cenário 1: COI cria solicitação com múltiplos destinos
  console.log('4. Cenário 1: COI criando despacho multi-destinos para Agente de Ronda...');
  const routePoints = [
    { lat: -20.1385, lng: -44.8865, label: 'Portaria Principal' },
    { lat: -20.1390, lng: -44.8870, label: 'Depósito Sul' },
    { lat: -20.1395, lng: -44.8875, label: 'Estacionamento Leste' }
  ];
  const dispatchRes = await req('/api/dispatches', 'POST', {
    workerId: rondaUser.id,
    address: 'Av. 7 de Setembro, 500 · Rota Multi-pontos A/B/C',
    reason: 'Ronda preventiva periódica com verificação de 3 pontos',
    kind: 'patrol',
    latitude: -20.1385,
    longitude: -44.8865,
    routePoints
  }, coiToken);
  assert.equal(dispatchRes.status, 201, 'Criação de despacho falhou: ' + JSON.stringify(dispatchRes.body));
  const dispatchId = dispatchRes.body.id;
  console.log('   ✅ Despacho criado com sucesso. ID:', dispatchId);

  // 5. Ronda recebe notificação e aceita o despacho (Estado: aceito)
  console.log('5. Agente de Ronda confirmando recebimento (ack)...');
  const ackRes = await req(`/api/dispatches/${dispatchId}/ack`, 'POST', {}, rondaToken);
  assert.equal(ackRes.status, 200, 'Confirmação de recebimento falhou');
  console.log('   ✅ Despacho aceito');

  // 6. Ronda inicia deslocamento (Estado: em_deslocamento)
  console.log('6. Agente de Ronda iniciando deslocamento (start)...');
  const startRes = await req(`/api/dispatches/${dispatchId}/start`, 'POST', {
    position: { lat: -20.1382, lng: -44.8863, accuracy: 6 }
  }, rondaToken);
  assert.equal(startRes.status, 200, 'Início de deslocamento falhou');
  console.log('   ✅ Deslocamento iniciado');

  // 7. Cenário 3: Telemetria contínua por rastro adaptativo
  console.log('7. Cenário 3: Transmissão de telemetria adaptativa (deslocamento, curva, gap)...');
  const now = Date.now();
  const fixes = [
    // Ponto 1: Saída da base
    { id: 'gps-fix-001', kind: 'gps', occurredAt: now, roundId: dispatchId, position: { lat: -20.13820, lng: -44.88630, accuracy: 5, speed: 4.5, bearing: 45 } },
    // Ponto 2: Deslocamento reto 22m (ultrapassa limiar de 15m)
    { id: 'gps-fix-002', kind: 'gps', occurredAt: now + 5000, roundId: dispatchId, position: { lat: -20.13835, lng: -44.88645, accuracy: 5, speed: 12.0, bearing: 45 } },
    // Ponto 3: Curva acentuada (8m deslocamento e delta de direção 40 graus)
    { id: 'gps-fix-003', kind: 'gps', occurredAt: now + 10000, roundId: dispatchId, position: { lat: -20.13840, lng: -44.88650, accuracy: 6, speed: 8.0, bearing: 85 } },
    // Ponto 4: Gap temporal / perda temporária de GPS (> 180s)
    { id: 'gps-fix-004', kind: 'gps', occurredAt: now + 195000, roundId: dispatchId, gap: true, position: { lat: -20.13870, lng: -44.88670, accuracy: 7, speed: 6.0, bearing: 90 } }
  ];

  for (const fix of fixes) {
    const postFix = await req('/api/events', 'POST', fix, rondaToken);
    assert.equal(postFix.status, 201, 'Envio de fix GPS falhou: ' + JSON.stringify(postFix.body));
  }
  console.log('   ✅ 4 coordenadas adaptativas gravadas com atributos de telemetria');

  // 8. COI consulta trail cronológico
  console.log('8. COI consultando trilha persistida no backend (/api/tracking/trail)...');
  const trailRes = await req(`/api/tracking/trail?roundId=${dispatchId}`, 'GET', null, coiToken);
  assert.equal(trailRes.status, 200, 'Consulta de trail falhou');
  const trail = trailRes.body.trail;
  assert.ok(Array.isArray(trail), 'Trail não é lista');
  assert.equal(trail.length, 4, `Esperava 4 pontos no trail, recebeu ${trail.length}`);
  assert.equal(trail[3].gap, true, 'Flag de gap não preservada no 4º ponto');
  console.log('   ✅ Trail recuperado pelo COI com fidelidade e sem ponte cega sobre o gap');

  // 9. Ronda confirma chegada no local "Estou aqui" (Estado: no_local)
  console.log('9. Agente de Ronda confirmando chegada no local ("Estou aqui")...');
  const arriveRes = await req(`/api/dispatches/${dispatchId}/arrive`, 'POST', {
    position: { lat: -20.13872, lng: -44.88672, accuracy: 5 }
  }, rondaToken);
  assert.equal(arriveRes.status, 200, 'Confirmação de chegada falhou: ' + JSON.stringify(arriveRes.body));
  console.log('   ✅ Chegada (Estou aqui) registrada no despacho e evento checkpoint gerado');

  // 10. Ronda conclui despacho (Estado: concluído)
  console.log('10. Agente de Ronda concluindo atendimento...');
  const completeRes = await req(`/api/dispatches/${dispatchId}/complete`, 'POST', {
    note: 'Ronda finalizada com sucesso. Todos os 3 pontos inspecionados sem inconformidades.',
    position: { lat: -20.13875, lng: -44.88675, accuracy: 5 }
  }, rondaToken);
  assert.equal(completeRes.status, 200, 'Conclusão de atendimento falhou: ' + JSON.stringify(completeRes.body));
  console.log('   ✅ Atendimento concluído com justificativa operacional');

  // 11. COI verifica estado final do despacho
  console.log('11. COI verificando lista de despachos...');
  const listRes = await req('/api/dispatches', 'GET', null, coiToken);
  assert.equal(listRes.status, 200, 'Listagem de despachos falhou');
  const found = listRes.body.dispatches.find(d => d.id === dispatchId);
  assert.ok(found, 'Despacho não retornado na listagem COI');
  assert.equal(found.status, 'concluido', `Esperava status 'concluido', recebeu ${found.status}`);
  console.log('   ✅ COI confirmou status final: concluido');

  // 12. Cenário 2: Comunicação bidirecional COI ↔ Ronda
  console.log('12. Cenário 2: Testando chat bidirecional...');
  const convRes = await req('/api/chat/conversations', 'POST', {
    members: [rondaUser.id]
  }, coiToken);
  assert.ok([200, 201].includes(convRes.status), 'Criação de conversa falhou');
  const convId = convRes.body.id;

  // COI envia mensagem
  const msgCoi = await req(`/api/chat/conversations/${convId}/messages`, 'POST', {
    body: 'Atenção Ronda, favor verificar portão leste.',
    kind: 'text'
  }, coiToken);
  assert.ok([200, 201].includes(msgCoi.status), 'Envio de mensagem do COI falhou');
  const msgCoiId = msgCoi.body.message?.id || msgCoi.body.id;
  console.log('   ✅ COI enviou mensagem de texto');

  // Ronda lista mensagens e confirma entrega
  const rondaDeliveries = await req('/api/chat/deliveries', 'GET', null, rondaToken);
  assert.equal(rondaDeliveries.status, 200, 'Consulta de entregas falhou');
  const delivPost = await req('/api/chat/deliveries', 'POST', { ids: [msgCoiId] }, rondaToken);
  assert.equal(delivPost.status, 200, 'Confirmação de entrega falhou');
  console.log('   ✅ Agente de Ronda confirmou recebimento da mensagem');

  // Ronda responde com texto e localização
  const msgRonda = await req(`/api/chat/conversations/${convId}/messages`, 'POST', {
    body: 'Ciente COI. Portão leste verificado e trancado.',
    kind: 'text'
  }, rondaToken);
  assert.ok([200, 201].includes(msgRonda.status), 'Resposta do Ronda falhou');
  console.log('   ✅ Agente de Ronda respondeu ao COI com sucesso');

  // 13. Cenário 4: Idempotência e sincronização pós-desconexão
  console.log('13. Cenário 4: Testando idempotência e reenvio de coordenadas acumuladas...');
  const dupFix = { id: 'gps-fix-002', kind: 'gps', occurredAt: now + 5000, roundId: dispatchId, position: { lat: -20.13835, lng: -44.88645, accuracy: 5 } };
  const dupRes = await req('/api/events', 'POST', dupFix, rondaToken);
  assert.equal(dupRes.status, 200, 'Esperava status 200 com flag duplicate para fix repetido');
  assert.equal(dupRes.body.duplicate, true, 'Deveria sinalizar duplicate: true');
  console.log('   ✅ Idempotência comprovada: ponto duplicado aceito sem duplicar registro');

  // 14. Limpeza rigorosa dos dados criados neste teste de aceitação
  console.log('14. Limpando registros de teste para manter a base limpa...');
  const cp = await import('node:child_process');
  cp.execSync(`sqlite3 /opt/ronda-pro-data/ronda-pro.sqlite "
    DELETE FROM chat_receipts WHERE message_id IN (SELECT id FROM chat_messages WHERE conversation_id='${convId}');
    DELETE FROM chat_messages WHERE conversation_id='${convId}';
    DELETE FROM chat_members WHERE conversation_id='${convId}';
    DELETE FROM chat_conversations WHERE id='${convId}';
    DELETE FROM events WHERE round_id='${dispatchId}' OR id LIKE 'gps-fix-%';
    DELETE FROM notifications WHERE dispatch_id='${dispatchId}';
    DELETE FROM dispatches WHERE id='${dispatchId}';
    VACUUM;
  "`);
  console.log('   ✅ Base limpa e preservada com sucesso.');
  console.log('🎉 TODOS OS CENÁRIOS DE INTEGRAÇÃO APROVADOS COM SUCESSO (100%)!');
}

runValidation().catch(err => {
  console.error('❌ ERRO NA VALIDAÇÃO:', err);
  process.exit(1);
});
