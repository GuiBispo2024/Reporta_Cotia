# Reporta Cotia Mobile — REP-27

Base Android/iOS em React Native 0.83, React 19.2, Expo SDK 55 e TypeScript estrito. React Navigation Native Stack, Axios e os tokens de cor da versão web. Não inclui autenticação, cadastro ou fluxos de denúncias: essas funcionalidades ficam para as próximas tarefas do epic REP-5.

## Execução rápida

Requisitos: Node.js >= 20.19.4, npm e a API do backend em execução. Use `npm ci` para reproduzir as versões do lockfile.

```powershell
cd C:\Users\Marcos\Desktop\Reporta_Cotia-main\Reporta_Cotia-main\mobile
npm ci
npm run check
npm run smoke:api
npm start
```

O Metro mostra o QR code e as opções de abrir Android/iOS. Use uma versão do Expo Go compatível com SDK 55 (consulte https://expo.dev/go) ou um build nativo. Não é necessário alterar o frontend web nem o backend.

- Emulador Android padrão: `localhost` e `127.0.0.1` na URL de development são convertidos para `10.0.2.2` no app.
- Simulador iOS no mesmo Mac da API: `localhost` funciona sem conversão.
- Celular físico ou simulador em outro computador: use o IP de rede da máquina da API. Crie `.env.development.local` com `API_BASE_URL=http://IP_DO_COMPUTADOR:5000`, substituindo pelo IP real. O celular e o computador precisam alcançar um ao outro pela rede e a porta 5000 precisa estar acessível. Reinicie com `npm start -- --clear` após alterar o arquivo.
- O backend local mantém imagens em disco e imprime os links de recuperação de senha no console, conforme seu README. Essas funcionalidades ainda não têm telas mobile.

## Estrutura e limites entre camadas

```text
mobile/
  App.tsx                       composição dos providers e do Error Boundary
  index.ts                      registro do componente raiz
  app.config.js                 configuração nativa e extra público
  eas.json                      perfis de build
  config/environment.cjs        resolução e validação de ambientes no build
  scripts/                      execução multiplataforma e smoke test
  src/
    components/                 Button, Screen, ErrorBoundary
    screens/                    HomeScreen, AboutScreen
    navigation/                 Stack e parâmetros tipados
    services/                   cliente HTTP e contrato de saúde
    theme/                      cores, tipografia, espaçamentos, raios
    config/                     configuração de runtime e host Android
    utils/                      ApiError e normalização de erros
  tests/                        testes de contrato, ambiente, UI e integração
```

Telas não chamam Axios diretamente. Serviços validam contratos antes de devolver dados às telas. O cliente centraliza timeout e normalização de erros; cancelamentos permanecem cancelamentos. Não há retry automático de operações que possam gravar dados. A tela de início cancela a consulta ao desmontar e oferece tentativa manual após uma falha.

O Error Boundary protege a renderização da árvore React e pode remontá-la. Ele não captura crashes nativos, falhas de inicialização de módulos ou exceções de handlers assíncronos; estas últimas devem ser tratadas na chamada do serviço, como na HomeScreen. O callback `onError` permite integrar observabilidade no futuro sem enviar dados externamente nesta base.

## Ambientes

| Ambiente | Arquivo versionado | API padrão |
| --- | --- | --- |
| development | `.env.development` | `http://localhost:5000` |
| staging | `.env.staging` | Não informada; execução exige configurar uma URL HTTPS |
| production | `.env.production` | `https://reporta-cotia.onrender.com` (endereço do README web) |

Staging é homologação: um ambiente separado para validar mudanças antes de produção. Não foi inventado um servidor de homologação nem usado produção como fallback.

Precedência: variáveis do processo/CI/EAS > `.env.<ambiente>.local` > `.env.<ambiente>`. Arquivos locais são ignorados pelo Git. `API_BASE_URL` e `API_TIMEOUT_MS` são as únicas variáveis expostas em `extra`; não coloque tokens, senhas de banco ou outros segredos nelas. O conteúdo do aplicativo é público.

`APP_ENV` escolhe o ambiente. `NODE_ENV` permanece sob controle das ferramentas; exportações otimizadas podem usar development ou staging sem trocar a API. Os scripts desabilitam o carregamento automático de `.env` pelo Expo com `EXPO_NO_DOTENV=1`, evitando misturas entre ambientes. Use os scripts npm deste projeto para seleção explícita.

```powershell
npm run config
npm run expo -- production config --type public
npm run start:production
```

Para homologação, configure a URL HTTPS real em `.env.staging.local`, ou no processo/EAS como `API_BASE_URL`, antes de executar:

```powershell
npm run expo -- staging config --type public
npm run start:staging
```

O comando falha com uma mensagem clara enquanto a URL estiver vazia. `API_TIMEOUT_MS` deve ser um inteiro de 1000 a 120000; o padrão é 15000 ms. Hosts não HTTP(S), URLs com credenciais, query ou fragmento são rejeitados. HTTP nativo só é permitido em development; staging/production exigem HTTPS.

Nomes, schemes e identificadores Android/iOS têm sufixos em development/staging, permitindo instalações lado a lado. `br.com.reportacotia.app` é a convenção inicial e deve ser conferida com as contas das lojas antes da publicação.

## Verificação funcional

1. Inicie o backend e o banco conforme o README principal; não execute o seed novamente se quiser preservar os dados existentes.
2. Execute `npm run smoke:api`. Ele usa o mesmo cliente Axios e serviço de saúde do app para fazer uma requisição real `GET /` e exigir `status=ok` e `database=connected`.
3. Abra o app: a tela inicial deve exibir “Tudo pronto. O serviço está disponível.”.
4. Abra “Sobre o aplicativo” e volte pelo cabeçalho/gesto. Em development/staging, confira o ambiente e a URL efetiva. Esses detalhes não aparecem em production.
5. Interrompa a API e toque em “Verificar conexão”: deve aparecer uma mensagem amigável; restaure a API e toque em “Tentar novamente”.
6. Execute `npm run check` para TypeScript, ambientes e testes de timeout, HTTP 4xx/5xx, resposta inválida, cancelamento, recuperação e navegação solicitada pela HomeScreen. O teste de rede real é separado para a suíte normal funcionar offline.

## Builds Android e iOS

Os diretórios `android/` e `ios/` são gerados por Expo Prebuild (Continuous Native Generation) e não são fonte versionada. Edite `app.config.js` e plugins, não os arquivos gerados. A geração Android foi executada nesta entrega; o diretório está ignorado pelo Git.

Android local exige Android Studio, Android SDK/Build Tools da versão requerida pelo Expo SDK 55, JDK 17 e emulador/aparelho com ADB. iOS local exige macOS, Xcode e CocoaPods.

```powershell
npm run android
```

No macOS:

```sh
npm ci
npm run ios
```

Ao trocar o ambiente de um build nativo, regenere antes de compilar para atualizar identificadores e políticas de rede. `--clean` substitui somente os projetos nativos gerados; não mantenha customizações manuais neles. Exemplo para production:

```sh
npm run expo -- production prebuild --clean
npm run expo -- production run:android --variant release
# Alternativa no macOS:
npm run expo -- production run:ios --configuration Release
```

Exportação de JavaScript/Hermes para ambas as plataformas (não gera APK/AAB/IPA):

```sh
npm run export
npm run expo -- production export --platform all --output-dir dist/production
```

Build remoto opcional via EAS, sem precisar de Xcode local:

```sh
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
```

`eas init` associa o projeto à sua conta. Como a configuração é dinâmica, se a ferramenta não conseguir editá-la, acrescente `eas: { projectId: ID_REAL }` à propriedade `extra` retornada por `app.config.js`, usando como string o ID fornecido pelo EAS. Esse identificador é público e pode ser versionado. Não há ID fictício no código. O perfil development gera APK Android e build de simulador iOS; não é um development client. O perfil staging gera distribuição interna e production gera AAB/artefato para loja. Builds iOS para aparelhos/distribuição exigem credenciais Apple adequadas. Para staging, configure `API_BASE_URL` no ambiente EAS `preview` antes do build; para development em aparelho físico, configure a URL alcançável pelo aparelho no ambiente EAS `development`. Arquivos `.local` não são enviados ao EAS. Não foi feito login, upload de código, publicação ou consumo de builds remotos nesta tarefa.

## Validação desta entrega (02/10/2026)

- TypeScript: aprovado.
- 5 testes de configuração e 17 testes Jest: aprovados.
- Teste de integração real com a API/PostgreSQL local: aprovado, usando o cliente mobile.
- Expo Prebuild Android: aprovado.
- Exportação Hermes Android e iOS: aprovada.
- Configuração de produção: HTTPS exigido, cleartext Android desabilitado e ATS iOS sem liberação de HTTP.
- Build nativo Android/iOS e execução em emulador/aparelho: **pendentes**. Esta máquina Windows tem Java 8, não tem Android SDK e não pode executar Xcode. Bundles e testes não substituem essa validação. Portanto, o critério de aceite “compilar perfeitamente Android/iOS” ainda não está comprovado.
- `npm audit` reportou 12 avisos transitivos no toolchain Expo (8 moderados, 4 altos), ligados a `uuid`/`node-forge`. Não foi aplicado `audit fix --force`, que propunha versões incompatíveis com o SDK escolhido. Reavaliar as correções suportadas pelo Expo antes de distribuir builds.

## Referências técnicas

- https://docs.expo.dev/versions/v55.0.0/
- https://docs.expo.dev/workflow/configuration/
- https://docs.expo.dev/guides/environment-variables/
- https://docs.expo.dev/build-reference/variants/
- https://reactnavigation.org/docs/hello-react-navigation/
