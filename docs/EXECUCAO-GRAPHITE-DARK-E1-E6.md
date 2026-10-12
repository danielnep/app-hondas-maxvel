# Execução E1–E6 · Hondas Maxvel Graphite Dark
**12/10/2026 | Horizon | Versão de avaliação funcional**

## Base de pesquisa
[Estudo permanente UI/UX, layouts adaptativos, cards, cor e spotlight](PESQUISA-APROFUNDADA-UI-UX-DARK-CARDS-TUTORIAL.md) e [Protocolo Visual Aprimorado](PROTOCOLO-VISUAL-APRIMORADO.md). O código foi alterado após a fase de estudos, não para substituí-la.

## E1. Acesso e perfis
- `entryScreen()` usa logotipos reais Maxvel × Horizon, interface compacta e CTA **Entrar**.
- `loginDialog()` abre escolha de Vigia/Ronda, Supervisão, Gestão e Administração, sem senha, somente para **avaliação local**.
- `beginSimulation()` monta o aplicativo real (`appShell`), sem apresentação comercial vertical paralela.
- Perfis no topo, rotulados. No celular, rótulos curtos e nomes acessíveis completos; menus do papel atual abaixo.

## E2. Tutorial e ajuda
- `src/tutorial.js`: spotlight com cortina preta fosca, destaque da área real, quatro etapas, botão **Entendi · continuar** e **Fechar tutorial**.
- O foco fica no tutorial, a área do app fica inerte durante a explicação, Escape fecha, e o foco retorna ao controle anterior quando possível.
- Progresso/encerramento guardado no navegador; botão **Rever tutorial** no header, perfil e barra lateral.
- Ajuda `?` sobre perfis, mapa, próxima ação, tempo/raio, agenda, equipe, alertas, configurações e registros.
- Consentimento de GPS independente da ajuda opcional.

## E3. Identidade e ergonomia Graphite Dark
- `assets/horizon-graphite.css` é a camada específica de Graphite Dark, carregada após os estilos anteriores.
- Predominância de grafite `#111923` e superfícies `#192431` / `#213040`; azul Horizon de CTA `#145BB0` e detalhes ciano `#55C9F5`.
- Branco/gelo usado principalmente na leitura; mapas reais conservam cores úteis para localizar ruas.
- No mobile, mapa + ação principal dentro da altura disponível. O seletor de papel reduz rótulos em telas estreitas, sem sobrepor as áreas clicáveis.

## E4. Múltiplos vigias
- `src/scheduling.js` reúne **12 personagens fictícios**, agrupados em 3 unidades de cenário, com IDs estáveis.
- Geração inicial de **48 programações de exemplo** em datas relativas à abertura; registros não são dados operacionais reais.
- Na página do Vigia, `mySchedule()` apresenta atribuições numa área recolhível, preservando o botão principal e o mapa; permite trocar vigia e selecionar uma programação.

## E5. Programação e execução
- Supervisão/Gestão/Administração acessam **Rondas → Agenda de rondas → Programar ronda**.
- Campos: vigia, rota/unidade, início, término, recorrência única ou 7 dias, observações.
- Validação: datas futuras, até 12h de duração, nenhum intervalo sobreposto do mesmo vigia, vigia e rota da mesma unidade.
- Após preencher, o aplicativo **pede confirmação antes de salvar**.
- Programações podem ser consultadas, filtradas e canceladas mediante confirmação quando ainda não foram executadas.
- Ao iniciar uma ronda selecionada, uma nova execução recebe `programId` e `watcherId`. Agenda e execução são objetos separados, e os dados reais de tempo/permanência são os do motor existente.
- O mesmo motor conserva raio 25 m, permanência 30 s contínuos, sequência, justificativa, retorno à base e registro de ocorrência.
- **Não implementado como produção:** autenticação no servidor, agendamento remoto, sincronização entre aparelhos e recorrência sem limite.

## E6. QA e evidências
Scripts atualizados:
- `tests/scheduling.test.mjs`: vínculo, conflitos, recorrência, cancelamento, separação por vigia e unidade.
- `scripts/app-immersive-test.mjs`: teste integrado de acesso, mapa, tutorial, rondas, desvio, justificativa, alerta, criação de agenda, troca de perfil e ajuda.
- `scripts/ux-mobile-audit.mjs`: auditoria de 8 larguras (320, 360, 390, 430, 768, 1024, 1440, 1920 px) e captura de 10 estados por dispositivo.
- `scripts/a11y-audit.mjs`: axe-core WCAG automatizado em 390 e 1440 px.
- `scripts/browser-smoke.sh`: marca + login compacto no browser, sem antigos cards comerciais.
- GitHub Actions: ver [validações](https://github.com/danielnep/app-hondas-maxvel/actions).

## Limites importantes
A simulação é o próprio aplicativo, porém os perfis e as programações são **dados de avaliação locais**. A troca de perfis não é autenticação e não equivale a permissões reais de vigias. Os alertas e justificativas não são enviados a supervisores em outro aparelho. Android APK debug não é certificação GPS de campo; exigir piloto, segurança, servidor e conformidade de dados antes do uso operacional.

A bibliografia estudada é uma base de projeto, não alegação de teste com usuários reais. O screenshot de browser não substitui QA humano/TalkBack.
