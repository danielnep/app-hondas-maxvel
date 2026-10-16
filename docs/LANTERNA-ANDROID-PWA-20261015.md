# Rondas Pro · Lanterna Android e PWA (15-10-2026)

## Alcance
Vigia e Vistoriador, tanto demonstração `/` quanto central autenticada `/central.html`. O botão é exibido somente nessas áreas. Perfil administrativo/COI não recebe esse controle.

## Funcionalidade
- **Navegador/PWA HTTPS:** usa `getUserMedia({video:{facingMode:{exact:'environment'}}})` e `MediaStreamTrack.applyConstraints({advanced:[{torch:true}]})` sobre a câmera traseira. Repetição com `ideal:environment` somente se não for encontrada uma câmera exata. Verifica `getCapabilities().torch` ou `getSettings().torch` antes de afirmar que ligou. Mantém a trilha em vídeo oculto para não suspender indevidamente e libera após desligar.
- **APK Android:** em vez de depender da WebView expor `torch`, a ponte `AndroidTracking.setTorchEnabled(enabled,requestId)` chama `CameraManager.setTorchMode` sobre câmera traseira com `FLASH_INFO_AVAILABLE`. Pede a permissão de câmera sob demanda. A ponte responde com o evento `rondas-native-torch-result` com `enabled` e `error`.
- **Interface:** estado neutro / ativando / ligado. Não indica ligado antes da confirmação da API. Falhas de permissão, câmera ocupada e suporte ausente deixam o botão desligado.
- **Ciclo de vida:** desliga ao ocultar a página, sair, trocar de perfil, perder o app nativo para outro aplicativo e destruir a Activity. A desmontagem de componentes mantém a propriedade sobre a lanterna isolada das evidências; nenhuma gravação é realizada pelo botão.
- **Pânico:** continua no canto inferior direito; lanterna da central autenticada fica acima, com área de toque separada.

## Cuidados
- A compatibilidade do controle `torch` é variável entre fabricantes, versões de WebView e navegadores. Não prometer que toda PWA ligará o LED.
- O resultado confirmado pelo Android significa que a solicitação nativa foi aceita. Um outro app pode tomar o controle do flash depois; isso precisa de teste real.
- Câmera usada para foto/vídeo pode ocupar o hardware, impedindo a lanterna simultânea.
- **Sem flash real no hardware de teste**, a UI informa que o dispositivo/navegador não liberou o controle, sem simular acendimento.

## Teste e homologação
- `npm run check && npm test`: inclui testes para estado, confirmação de API, falha de capacidades, troca de perfil e liberação.
- GitHub Actions: validar APK Java 17/Android 35, acessibilidade, UI e simulação Chrome.
- **Pendente em dispositivo físico:** (1) Chrome PWA HTTPS; (2) APK de teste instalado; (3) autorização/negação e segunda tentativa; (4) ligar/desligar cinco vezes; (5) sair da tela, alternar app e bloquear aparelho; (6) tentar ativar durante uso de câmera; (7) testar com lanternas em aparelhos Android de fabricantes diferentes. Só após os testes físicos declarar lanterna homologada.

## Referências técnicas
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/getCapabilities
- MDN: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/applyConstraints
- Android: https://developer.android.com/reference/android/hardware/camera2/CameraManager#setTorchMode(java.lang.String,%20boolean)
