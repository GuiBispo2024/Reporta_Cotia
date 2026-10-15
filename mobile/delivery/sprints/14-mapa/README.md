# 14 — Mapa dentro do aplicativo

No Expo Go SDK 57, abra uma denúncia com coordenadas. O mapa deve aparecer nos detalhes, com marcador no endereço informado, permitindo zoom e movimentação. Recarregue sem sair do aplicativo. Sem coordenadas, aparece uma explicação; o mapa não inventa uma localização. Sem internet, o endereço continua disponível e há opção de recarregar. Não há solicitação da localização pessoal para consultar o mapa.

## APK Android

O Expo Go inclui a configuração nativa necessária. Para APK/development build, configure GOOGLE_MAPS_ANDROID_API_KEY no ambiente do build, habilite Maps SDK for Android no Google Cloud e restrinja a chave ao package e SHA-1 da assinatura. O app.config.js passa a chave ao plugin react-native-maps. Recrie o APK após configurar; sem a chave, esta instalação mostra uma explicação em vez de tentar abrir o mapa nativo sem configuração.

iOS usa Apple Maps. Esta etapa não cria conta/projeto Google, não habilita cobrança e não inventa credenciais. Configuração Google para APK, instalação e renderização física permanecem pendentes. Referência: https://docs.expo.dev/versions/v57.0.0/sdk/map-view/.

O plugin original do react-native-maps 1.27.2 importa caminhos privados de @expo/config-plugins. O projeto usa plugins/withReportMaps.cjs com a API pública expo/config-plugins para inserir/remover somente a chave Android. Apple Maps usa o autolinking padrão no iOS. Não há patch em node_modules nem supressão de verificações do Doctor. As correções de versão do SDK 57 também foram alinhadas às recomendações atuais.
