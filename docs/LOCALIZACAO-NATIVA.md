# Localização durante a ronda · versão Android nativa

## O que é solicitado ao primeiro acesso

A primeira abertura apresenta um aviso legível com quatro tópicos: finalidade da localização, continuidade com a tela bloqueada na versão nativa, controle pelo usuário e privacidade. **“Li e aceito”** guarda localmente a ciência da versão do aviso. Não equivale a conceder permissão do sistema nem substitui a definição de base legal/LGPD pelo responsável pela operação. Há a opção de visualizar a simulação sem GPS.

Ao iniciar **Ronda > Localização real**, o sistema operacional solicitará a localização precisa. No projeto nativo, `MainActivity` aciona `PatrolLocationService` a partir da interface visível. Esse serviço do tipo `location` usa notificação persistente **“Maxvel · ronda ativa”**, com botão **“Parar acompanhamento”**; na operação real, só deve operar durante a ronda autorizada.

## Até onde vai a continuidade

- **Tela bloqueada:** o serviço Android pode continuar coletando as posições, conforme permissões e restrições do dispositivo.
- **Usuário passa para outro aplicativo:** o serviço Android pode continuar, com notificação visível.
- **Interface é removida das tarefas recentes:** o serviço em primeiro plano pode permanecer ativo; fabricantes e versões do Android podem interromper a coleta. Não há garantia universal.
- **Usuário usa Parar / força parada / desativa localização / revoga permissão:** a coleta deve parar. Não tentar reiniciar ou contornar decisão do usuário.
- **Versão web, navegador fechado:** não coleta posições; o navegador não oferece serviço contínuo equivalente. A interface explica esse limite.
- **Android 12+ / Android 14+:** início de serviços em segundo plano tem restrições; começar o serviço enquanto a Activity está visível. `ACCESS_BACKGROUND_LOCATION` é uma autorização separada para casos de uso específicos e não deve ser inferida do aceite inicial.

## Como são tratados os registros

O serviço nativo grava amostras com horário, coordenadas e precisão em SQLite privado do aparelho; o limite atual é **10.000 amostras ou 30 dias**, o que vencer primeiro. Ao reabrir a interface, o app consulta o histórico e reaplica as verificações da ronda. Intervalos de mais de **15 segundos sem amostras confiáveis** reiniciam a contagem de permanência, pois GPS intermitente não comprova uma permanência contínua.

**Importante:** a etapa de GPS nativo ainda requer teste empírico. A sincronização do SQLite com backend operacional, autenticação real, criptografia adicional, planos de recuperação de perda de sinal, retenção aprovada e observabilidade da supervisão não estão implementados.

## Compilar no Android Studio

1. Abra a pasta `android/` no Android Studio, com JDK 17 e Android SDK 35 instalados.
2. Aguarde a sincronização do Gradle e permita baixar `androidx.webkit`.
3. Construa a variante Debug. O Gradle incorpora `index.html`, `styles.css` e a pasta `src/` de **uma única fonte** do repositório.
4. Instale num aparelho de teste autorizado com Android 8+.
5. Abra o aplicativo, leia o aviso e aceite (ou selecione demonstração sem GPS).
6. Em **Ronda**, escolha **Localização real**, aceite as regras e conceda a permissão do sistema.
7. Com a ronda ativa, confira a notificação **Maxvel · ronda ativa**; bloqueie a tela, abra outro app e teste a remoção da interface da lista de tarefas, verificando se amostras são salvas.
8. Use **Parar acompanhamento** na notificação e confirme que o rastreamento cessa.
9. Faça testes específicos de bateria, perda de sinal, modo avião, mudança de permissão, parada forçada, diferentes fabricantes e atualizações do Android. Não ateste comportamento antes de medir.

## Referências oficiais

- Tipos de serviços em primeiro plano: https://developer.android.com/about/versions/14/changes/fgs-types-required
- Restrições para iniciar serviços em segundo plano: https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
- Solicitação de localização em segundo plano: https://developer.android.com/develop/sensors-and-location/location/permissions/background

## Ética e conformidade

A finalidade é verificar a execução autorizada de uma ronda durante o serviço, e não acompanhar a vida privada do trabalhador. Nunca tratar uma falha técnica como desvio disciplinar automático. A empresa deverá estabelecer base legal, finalidades, política de retenção, acessos, direitos dos titulares e procedimento de revisão humana. O serviço inclui notificação visível e parada voluntária.