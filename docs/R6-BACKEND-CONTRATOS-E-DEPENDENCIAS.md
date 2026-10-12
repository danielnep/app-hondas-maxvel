# R6 · Backend de produção e sincronização (contratos antes de conexão)
**HondAS Maxvel / Horizon · 12/10/2026**
**Estado: PROPOSTA TÉCNICA, não implementado nem conectado.**

## 1. Decisão pendente e limite não negociável
A edição atual do app é uma demonstração web com dados locais. O usuário autorizou reformular o aplicativo, mas ainda NÃO definiu provedor da infraestrutura real, domínio do serviço, contas de gestores, responsável LGPD, retenção de mídia ou política de permissão. Os três manuais da Horizon exigem registrar trade-offs e não selecionar silenciosamente autenticação ou hospedagem.

Alternativa A (proposta da revisão mais recente do PDF): **Supabase (PostgreSQL, Auth, storage privado, RLS + funções servidor)**. Menor trabalho inicial para um piloto, sujeito a custos, desenho de RLS e limites operacionais.
Alternativa B: **API Node.js em hospedagem autorizada + PostgreSQL + object storage S3 compatível**, com maior autonomia e maior operação.
Ambas precisam de credenciais gerenciadas, HTTPS, backup e política de custos. Escolher a arquitetura só após confirmar ambiente/cliente e responsabilidades.

## 2. Entidades
- Organization: id, nome, status, politica_retencao, plano.
- Contract: id, organization_id, cliente, descrição, vigência.
- Unit: id, organization_id, contract_id, nome, geofence_policy.
- User: id, organization_id, status, profile, linkage, MFA/restrições.
- RoleGrant: id, user_id, organization_id, unit_id, role, granted_by, valid_from, valid_to.
- Route: id, organization_id, unit_id, nome, version, authorized_geometry (LineString), status.
- RoutePoint: id, route_id, order_index, gps, radius_m, dwell_seconds, evidence_policy.
- PatrolProgram: id, route_version_id, watcher_id, start_at, end_at, recurrence, status, version, changed_by.
- PatrolExecution: id, patrol_program_id, watcher_id, started_at, ended_at, status, signed_policy_version.
- LocationSample: idempotency_key, execution_id, sampled_at_device, received_at_server, lat, lng, accuracy, provider, integrity_flags.
- PointEvidence: id, execution_id, checkpoint_id, capture_mode, verified_at, media_refs, motion_result, declaration_version, status, synced_at.
- Incident: id, execution_id, point_id, description, severity, assignee, status, history.
- SupervisorAlert: id, organization_id, execution_id, kind, cause, created_at, delivered_at, acknowledged_at.
- AuditEvent: id, organization_id, entity, object_id, actor_id, event_type, occurred_at, received_at, prior_version, payload_hash.

Todos os dados multitenant devem portar organization_id coerente e ser filtrados pelo servidor. Eventos históricos são imutáveis; correções se registram como eventos adicionais.

## 3. Contratos HTTP propostos, sem implementar
- GET /v1/me, /v1/units, /v1/routes, /v1/patrol-programs: somente contexto autorizado.
- POST /v1/patrol-executions: cria execução para colaborador autenticado dentro de programação liberada, Idempotency-Key obrigatória.
- POST /v1/patrol-executions/:id/location-batches: lote assinado pelo app; valida timestamps, precisão, sequência, fonte e idempotência.
- POST /v1/patrol-executions/:id/checkpoints/:pointId/evidence: recebe metadados, devolve upload temporário para armazenamento privado; não aceita URL pública arbitrária.
- POST /v1/patrol-executions/:id/checkpoints/:pointId/complete: avalia geocerca + dwell + política de evidências + exceções aprovadas no servidor; 409 para conflito, 422 para requisito não atendido.
- POST /v1/patrol-executions/:id/deviations/:deviationId/justify: grava justificativa e autor, sem liberar ponto automaticamente.
- GET/PATCH /v1/incidents/:id: permissões por unidade; atribuição/status com histórico e controle de concorrência.
- GET /v1/alerts e eventos realtime autenticados por empresa e unidade, com data da última recepção.
- GET /v1/reports/summary e /v1/reports/complete: números derivados de eventos confirmados, sem incluir pendentes de envio como concluídos.

Erros: application/problem+json; 400 formato, 401 autenticação, 403 autorização, 404 recurso não visível, 409 versão/idempotência, 422 regra, 429 limite, 503 serviço temporário.

## 4. Offline/online
Fila local protegida em armazenamento compatível Android com UUID por evento e política de retenção; processamento em ordem por execução; reenvio seguro e idempotente até confirmação do servidor; timestamp do aparelho distinto de timestamp servidor. Nunca indicar “supervisor notificado” até confirmação remota. Conflitos registrados para análise, sem sobrescrever histórico.

## 5. GPS, câmera e giro
O GPS não é prova isolada; erro de precisão gera exceção técnica, não imputação automática. Câmera do app capta imagens privadas, com permissão contextual. Selfie é evidência visual, não reconhecimento facial automático. Sensores de movimento só verificam rotação do dispositivo, não o conteúdo da imagem. Aparelho sem sensor deve resultar em erro recuperável/decisão autorizada.

## 6. Segurança e privacidade
TLS, login individual, tokens curtos, controle RBAC por organização/unidade, MFA para administradores quando definido, RLS testada se escolhida, quotas, detecção de duplicidade, mídia privada, URLs temporárias, criptografia em repouso, auditoria de acessos, backups com restauração testada, retenção e descarte.
Termo de ciência operacional NÃO substitui definição da base legal LGPD nem avaliação de proporcionalidade do uso de fotos/localização em trabalho. Rastreamento somente durante ronda ativa e visível no Android.

## 7. Gates
- [ ] Responsável e decisões de infraestrutura confirmados.
- [ ] Matriz de permissões, tratamento de dados e política de retenção aprovados.
- [ ] Ambiente backend, autenticação real e banco criados com segregação.
- [ ] APIs validadas por testes de contrato e políticas de acesso.
- [ ] Evidências em mídia privada + fila segura com testes de offline/reenvio.
- [ ] Android físico, câmera/giroscópio e permissão de localização testados no piloto.
- [ ] Restauração, LGPD e suporte operacional avaliados.
A aprovação de testes no protótipo NÃO fecha estes itens.
