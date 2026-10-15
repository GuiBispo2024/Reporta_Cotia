# Reporta Cotia Mobile — REP-27

Aplicativo Android/iOS em React Native 0.86, React 19.2, Expo SDK 57 e TypeScript estrito. Inclui cadastro, login, sessão segura, listas pública e pessoal com busca, acompanhamento e histórico, fotos e localização GPS com ajuste manual.

## Execução rápida

As próximas entregas serão verificadas uma de cada vez. Veja o [roteiro incremental e teste da etapa 1](delivery/incremental/README.md). A configuração do development build está pronta; gerar e instalar o APK ainda depende da conta Expo/EAS e da validação no aparelho.

Requisitos: Node.js >= 22.13.0, npm e a API do backend em execução. Use `npm ci` para reproduzir as versões do lockfile.

```powershell
cd C:\Users\Marcos\Desktop\Reporta_Cotia-main\Reporta_Cotia-main\mobile
npm ci
npm run check
npm run smoke:api
npm start
```

O Metro mostra o QR code e as opções de abrir Android/iOS. Use uma versão do Expo Go compatível com SDK 57 (consulte https://expo.dev/go) ou um build nativo. Não é necessário alterar o frontend web nem o backend.

- Emulador Android padrão: `localhost` e `127.0.0.1` na URL de development são convertidos para `10.0.2.2` no app.
- Simulador iOS no mesmo Mac da API: `localhost` funciona sem conversão.
- Celular físico ou simulador em outro computador: use o IP de rede da máquina da API. Crie `.env.development.local` com `API_BASE_URL=http://IP_DO_COMPUTADOR:5000`, substituindo pelo IP real. O celular e o computador precisam alcançar um ao outro pela rede e a porta 5000 precisa estar acessível. Reinicie com `npm start -- --clear` após alterar o arquivo.
- O backend local mantém imagens em disco e imprime os links de recuperação de senha no console, conforme seu README. Essas funcionalidades ainda não têm telas mobile.

## Estrutura e limites entre camadas

### Acesso pelo celular na rede local

Inicie a API com `npm start` na pasta `backend`. Confira `PORT` em `backend/.env` e crie `mobile/.env.development.local` com `API_BASE_URL=http://IP_DO_COMPUTADOR:PORTA_DA_API`. O arquivo local não é versionado. Use `ipconfig` para consultar o IPv4 do Wi-Fi; atualize a URL se o IP mudar.

Na pasta `mobile`, execute `npm run start:lan`. O Expo usa a porta 8082 para não conflitar com o backend local na porta 8081. Com o celular no mesmo Wi-Fi, abra `exp://IP_DO_COMPUTADOR:8082` no Expo Go compatível com SDK 57 ou leia o QR code exibido no terminal. Para Android, obtenha a versão compatível em https://expo.dev/go?platform=android&device=true&sdkVersion=57. Consulte https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/ para as opções de instalação em outros dispositivos.

Para verificar a rede, abra `http://IP_DO_COMPUTADOR:PORTA_DA_API/` no navegador do celular; deve retornar `status: ok` e `database: connected`. Mantenha os terminais da API e do Expo abertos. Se o Windows solicitar acesso à rede, permita na rede privada.

```text
mobile/
  App.tsx                       providers de sessão, safe area e Error Boundary
  index.ts                      registro do componente raiz
  app.config.js                 configuração nativa e extra público
  eas.json                      perfis de build
  config/environment.cjs        resolução e validação de ambientes no build
  scripts/                      execução multiplataforma e smoke test
  src/
    components/                 Button, Screen, ErrorBoundary
    context/                    sessão e armazenamento seguro
    screens/                    lista, login/cadastro, envio, detalhes e sobre
    navigation/                 Stack e parâmetros tipados
    services/                   cliente HTTP, contas, denúncias e saúde
    theme/                      cores, tipografia, espaçamentos, raios
    config/                     configuração de runtime e host Android
    utils/                      ApiError e normalização de erros
  tests/                        testes de contrato, ambiente, UI e integração
```

Telas não chamam Axios diretamente. Serviços validam contratos antes de devolver dados às telas. O cliente centraliza timeout e normalização de erros; cancelamentos permanecem cancelamentos. Não há retry automático de operações que possam gravar dados. A tela de início cancela a consulta ao desmontar e oferece tentativa manual após uma falha.

O Error Boundary protege a renderização da árvore React e pode remontá-la. Ele não captura crashes nativos, falhas de inicialização de módulos ou exceções de handlers assíncronos; estas últimas devem ser tratadas na chamada do serviço, como na HomeScreen. O callback `onError` permite integrar observabilidade no futuro sem enviar dados externamente nesta base.

## Fluxos disponíveis no mobile

- Visitantes podem consultar denúncias aprovadas, buscar pelo título, navegar entre páginas e abrir detalhes.
- O cadastro exige nome de usuário, e-mail e senha com pelo menos 6 caracteres, com confirmação. Após criar a conta, faça login.
- O refresh token rotativo e seus prazos ficam no `expo-secure-store`; access JWT e perfil ficam somente na memória. Ao reabrir, a renovação valida a sessão no servidor. O token não é reutilizado se a URL da API mudar; credenciais do formato antigo são descartadas. A senha não é armazenada.
- A sessão termina após 15 minutos sem interação, inclusive em segundo plano, com aviso no último minuto. Toques e digitação confirmam atividade; consultas e refresh automáticos não mantêm a sessão viva. O access JWT dura 5 minutos e é renovado sob demanda com uma única renovação simultânea. O limite total é 8 horas. Expiração/revogação devolve o acesso a visitante e pede novo login.
- Contas com `denuncia.create` podem enviar título, descrição, endereço, bairro opcional e categoria. A tela preserva o formulário após falhas e confirma o protocolo somente após resposta da API. A denúncia enviada fica pendente de moderação; o autor pode abrir seus detalhes na confirmação, e a lista pública a exibirá após aprovação.
- O logout revoga a sessão no backend quando a rede está disponível e remove o armazenamento local.
- “Minhas denúncias” mostra também registros pendentes e rejeitados. O endpoint privado retorna todos os registros da conta; busca e paginação dessa lista são feitas no app.
- Os detalhes exibem situação, setor responsável, motivo de rejeição e histórico, respeitando o acesso autorizado pelo backend.
- Anexe até quatro fotos da câmera ou galeria, confira a prévia e remova anexos antes do envio. As imagens são convertidas para JPEG com dimensão máxima de 2048 pixels; o backend mantém o limite de 5 MB por arquivo. Os detalhes permitem ampliar imagens, inclusive denúncias antigas com `imageUrl`.
- “Usar minha localização” solicita apenas acesso enquanto o app está em uso. O GPS preenche coordenadas e tenta sugerir endereço/bairro sem sobrescrever texto digitado. Revise os dados; é possível editar ou remover coordenadas e enviar apenas o endereço. Permissão negada, GPS desligado ou falha de consulta não impedem o preenchimento manual. Os detalhes abrem as coordenadas no mapa externo.

Recuperação de senha, edição de denúncias/perfil, curtidas, comentários, mapa interativo dentro do app e telas administrativas ficam para próximas etapas.

Para verificar manualmente: abra a lista como visitante, crie uma conta, entre, envie uma denúncia, abra o protocolo, feche e reabra o app para conferir a restauração da sessão e saia da conta. Use uma denúncia real ou um banco de desenvolvimento para testar o envio. `npm run smoke:api` consulta apenas saúde e lista pública; não cria contas ou denúncias.

Validação da versão mínima (10/10/2026): TypeScript, 5 testes de ambiente, 32 testes Jest, 2 testes de integração de leitura com a API local, Expo Doctor 21/21 e exportação Hermes Android/iOS aprovados. Execução e conferência visual no celular ainda precisam ser confirmadas.

Validação da etapa de fotos, GPS e acompanhamento (10/10/2026): TypeScript, 5 testes de ambiente, 47 testes Jest, 2 testes de integração de leitura (saúde, lista, detalhes e histórico), Expo Doctor 21/21 e exportação Hermes de produção Android/iOS aprovados. Câmera, galeria, permissões e GPS foram verificados com mocks; a conferência desses recursos no Android/iOS real ainda é necessária. As novas permissões também exigem gerar um novo build se estiver usando APK/IPA próprio; no Expo Go use a versão compatível com SDK 57.

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
npm run expo:env -- production config --type public
npm run start:production
```

Para homologação, configure a URL HTTPS real em `.env.staging.local`, ou no processo/EAS como `API_BASE_URL`, antes de executar:

```powershell
npm run expo:env -- staging config --type public
npm run start:staging
```

O comando falha com uma mensagem clara enquanto a URL estiver vazia. `API_TIMEOUT_MS` deve ser um inteiro de 1000 a 120000; o padrão é 15000 ms. Hosts não HTTP(S), URLs com credenciais, query ou fragmento são rejeitados. HTTP nativo só é permitido em development; staging/production exigem HTTPS.

Nomes, schemes e identificadores Android/iOS têm sufixos em development/staging, permitindo instalações lado a lado. `br.com.reportacotia.app` é a convenção inicial e deve ser conferida com as contas das lojas antes da publicação.

## Verificação funcional

1. Inicie o backend e o banco conforme o README principal; não execute o seed novamente se quiser preservar os dados existentes.
2. Execute `npm run smoke:api`. Ele usa o mesmo cliente Axios e serviço de saúde do app para fazer uma requisição real `GET /` e exigir `status=ok` e `database=connected`.
3. Abra o app: a tela inicial deve mostrar a lista pública, com busca e acesso aos detalhes.
4. Abra “Sobre o aplicativo” e volte pelo cabeçalho/gesto. Em development/staging, confira o ambiente e a URL efetiva. Esses detalhes não aparecem em production.
5. Interrompa a API e atualize a lista: deve aparecer uma mensagem amigável; restaure a API e toque em “Tentar novamente”.
6. Execute `npm run check` para TypeScript, ambientes e testes de timeout, HTTP 4xx/5xx, resposta inválida, cancelamento, recuperação e navegação solicitada pela HomeScreen. O teste de rede real é separado para a suíte normal funcionar offline.
7. Entre na conta e abra “Minhas denúncias”. Teste câmera/galeria com permissão aceita, negada e seleção cancelada; remova anexos e confira o limite de quatro fotos.
8. Teste GPS aceito, negado e desativado; confira endereço e coordenadas, ajuste manualmente e remova as coordenadas para testar envio apenas com endereço.
9. Em banco de desenvolvimento, envie uma denúncia com foto e localização. Abra o protocolo, confira a imagem ampliada e o mapa externo. Verifique em “Minhas denúncias” o status pendente; após moderação pelo web, atualize e confira situação, setor, motivo e histórico. A execução em aparelho permanece uma etapa manual; bundles não a substituem.

## Builds Android e iOS

Os diretórios `android/` e `ios/` são gerados por Expo Prebuild (Continuous Native Generation) e não são fonte versionada. Edite `app.config.js` e plugins, não os arquivos gerados. A geração Android foi executada nesta entrega; o diretório está ignorado pelo Git.

Android local exige Android Studio, Android SDK/Build Tools e JDK da versão requerida pelo Expo SDK 57 e emulador/aparelho com ADB. iOS local exige macOS, Xcode e CocoaPods.

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
npm run expo:env -- production prebuild --clean
npm run expo:env -- production run:android --variant release
# Alternativa no macOS:
npm run expo:env -- production run:ios --configuration Release
```

Exportação de JavaScript/Hermes para ambas as plataformas (não gera APK/AAB/IPA):

```sh
npm run export
npm run expo:env -- production export --platform all --output-dir dist/production
```

Build remoto opcional via EAS, sem precisar de Xcode local:

```sh
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform android --profile development
npx eas-cli build --platform ios --profile development
```

`eas init` associa o projeto à sua conta. Como a configuração é dinâmica, se a ferramenta não conseguir editá-la, acrescente `eas: { projectId: ID_REAL }` à propriedade `extra` retornada por `app.config.js`, usando como string o ID fornecido pelo EAS. Esse identificador é público e pode ser versionado. Não há ID fictício no código. O perfil `development` gera um development client para celular Android/iOS; `development-simulator` atende o simulador iOS. Use `npm run start:dev-client` após instalar o APK. O comando `npm run start:lan` continua abrindo o Expo Go. Staging gera distribuição interna com bundle embarcado e production gera AAB/artefato para loja, ambos sem development client e com incremento remoto de versão do build. Builds iOS para aparelhos/distribuição exigem credenciais Apple adequadas. Para staging, configure `API_BASE_URL` no ambiente EAS `preview` antes do build; para development em aparelho físico, configure a URL alcançável pelo aparelho no ambiente EAS `development`. Arquivos `.local` não são enviados ao EAS. Nenhum build remoto foi iniciado nesta etapa.

## Atualização para SDK 57 (10/10/2026)

Expo 57.0.30, React Native 0.86.3, React 19.2.3 e TypeScript 6. Os módulos Expo, safe-area, screens e jest-expo foram alinhados com as versões recomendadas pelo SDK. A configuração inclui o plugin `expo-status-bar`. O script de seleção de ambiente agora se chama `expo:env`, evitando conflito com o executável do Expo.

Validação atual: Expo Doctor 21/21, TypeScript, 6 testes de configuração, 78 testes Jest, 2 testes de leitura com API/PostgreSQL local, Prebuild Android e exportação Hermes Android/iOS. O teste de integração usa o adaptador HTTP do Node para fazer uma requisição real, pois os adaptadores nativos são simulados pelo preset Jest. Builds nativos APK/AAB/IPA e execução no aparelho ainda precisam de validação; exportar bundles não substitui essas etapas. Além dos [dez roteiros incrementais](delivery/incremental/README.md), consulte os [roteiros de fechamento das sprints](delivery/sprints/README.md) para foto do perfil, progresso, filtros, mapa, comentários, curtidas e compartilhamento.

O inventário em `delivery/README.md` é um snapshot histórico do SDK 55. As versões atuais estão em `package.json` e `package-lock.json`.

O [layout alinhado à Web](delivery/sprints/18-layout/README.md) reutiliza a logo, Bootstrap Icons e ilustrações do projeto, com cabeçalhos verdes, cards e formulários adaptados ao celular. Execute `npm run assets:sync` para atualizar os assets compartilhados. SVG e gradiente estão disponíveis no Expo Go SDK 57; um development build anterior precisa ser recriado para incluir essas dependências nativas.

## Validação original da entrega (02/10/2026, SDK 55)

- TypeScript: aprovado.
- 5 testes de configuração e 17 testes Jest: aprovados.
- Teste de integração real com a API/PostgreSQL local: aprovado, usando o cliente mobile.
- Expo Prebuild Android: aprovado.
- Exportação Hermes Android e iOS: aprovada.
- Configuração de produção: HTTPS exigido, cleartext Android desabilitado e ATS iOS sem liberação de HTTP.
- Build nativo Android/iOS e execução em emulador/aparelho: **pendentes**. Esta máquina Windows tem Java 8, não tem Android SDK e não pode executar Xcode. Bundles e testes não substituem essa validação. Portanto, o critério de aceite “compilar perfeitamente Android/iOS” ainda não está comprovado.
- `npm audit` reportou 12 avisos transitivos no toolchain Expo (8 moderados, 4 altos), ligados a `uuid`/`node-forge`. Não foi aplicado `audit fix --force`, que propunha versões incompatíveis com o SDK escolhido. Reavaliar as correções suportadas pelo Expo antes de distribuir builds.

## Referências técnicas

- https://docs.expo.dev/versions/v57.0.0/
- https://docs.expo.dev/workflow/configuration/
- https://docs.expo.dev/guides/environment-variables/
- https://docs.expo.dev/build-reference/variants/
- https://reactnavigation.org/docs/hello-react-navigation/
