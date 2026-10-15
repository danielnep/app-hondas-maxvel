# Ações compactas do vigia

Ajustes solicitados: card e elementos menores no celular, pânico no topo esquerdo do mapa, alerta amarelo com campo de uma linha antes do envio, ocorrência com tipo/gravidade e mensagem branca abrindo chat.

- Layout preserva tema escuro e marca Maxvel. Ajuda fica abaixo do pânico; corpo do card rola sem encobrir os comandos.
- Demonstração mantém alertas e ocorrências fora de ronda no dispositivo e os apresenta nos eventos. Ocorrências durante ronda mantêm o vínculo e as evidências existentes.
- Comunicação autenticada usa a fila existente e só confirma envio após sincronização. Falha de persistência não gera confirmação de salvamento.
- Chat operacional existente foi preservado. Demonstração permite escrever e consultar mensagens locais, identificadas como locais; não simula recibos remotos.
- Central registra tipo e gravidade em `details` da ocorrência.
- Cache PWA atualizado para v34.

Validação: 156 testes existentes; sintaxe; navegador Chromium com cliques reais em 320, 390, 768 e 1366 pixels, alertas, ocorrências antes/durante ronda, chat e cores. Inspeção visual em 390 pixels. Auditoria ampliada: oito larguras, 61 capturas e zero falhas, incluindo espaçamento da marca.

Limites: esta revisão não adiciona cartografia offline de ruas nem valida GPS/câmera em aparelho Android. Mantém mapa esquemático de contingência existente. Os estudos novos de frontend/backend foram localizados, mas leitura e download retornaram falha; foram consultadas as diretrizes disponíveis no repositório.
