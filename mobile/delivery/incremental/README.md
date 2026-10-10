# Entregas incrementais do mobile — roteiro de testes

Cada etapa tem seu commit e instruções de teste. As implementações seguem em sequência, conforme a preferência escolhida, e podem ser conferidas por funcionalidade ou pelo commit correspondente. Geração de APK e testes físicos são registrados separadamente das verificações locais.

| Etapa | Entrega | Estado |
| --- | --- | --- |
| 1 | Development build e perfis de distribuição | Configuração, Expo Doctor e Prebuild Android aprovados; APK pendente |
| 2 | Rascunhos persistentes com fotos | Implementada; testar fechamento e reabertura no Android |
| 3 | Idempotência no backend | Implementada; executar migration antes do envio mobile |
| 4 | Envio mobile com prevenção de duplicidade | Implementada; testar perda de resposta no Android |
| 5 | Verificações mobile no CI | Implementada; execução remota ocorre ao enviar a branch |
| 6 | Diagnóstico e validação em aparelhos | Diagnóstico implementado; testes físicos e ajustes dependem dos resultados |
| 7 | Navegação por abas | Implementada |
| 8 | Recuperação de senha | Implementada; entrega de e-mail depende do provedor no backend |
| 9 | Gerenciamento e exclusão da conta | Planejada |
| 10 | Edição e reenvio de denúncias rejeitadas | Planejada |

## Etapa 1 — o que muda

O app pode ser instalado como development build com seu próprio nome e identificador, usando `expo-dev-client`. Esse build abre o launcher e carrega o código do Metro. A tela e os recursos existentes continuam iguais nesta etapa. A configuração foi preparada conforme https://docs.expo.dev/develop/development-builds/introduction/.

Os perfis estão em `mobile/eas.json`:

- `development`: app de desenvolvimento para celular Android/iOS; Android gera APK debug.
- `development-simulator`: development build para simulador iOS, separado do celular físico.
- `staging`: distribuição interna com bundle embarcado, sem depender do Metro; exige API HTTPS de homologação.
- `production`: artefato para as lojas; Android AAB.

Staging e production usam numeração de build gerenciada pelo EAS e incremento automático. Isso não altera a versão pública `0.1.0`.

## Preparar a conta e gerar o APK

Na pasta `mobile`, execute:

```powershell
npx eas-cli login
npx eas-cli init
```

Como `app.config.js` é dinâmico, o EAS pode pedir para incluir manualmente o `projectId` em `extra.eas`. Use somente o ID real retornado pelo comando. Não envie senha ou token pelo chat. A conta do Expo é separada da conta de cidadão do Reporta Cotia.

Configure `API_BASE_URL` no ambiente EAS `development` com o endereço alcançável pelo celular. Para a rede local atual, a API foi configurada como `http://192.168.15.16:8081`; confirme o IP com `ipconfig`. Arquivos `.env.development.local` não são enviados para o build remoto. Essa URL é pública, nunca use JWT ou senha nela.

```powershell
npx eas-cli env:create --environment development --name API_BASE_URL --value http://192.168.15.16:8081 --visibility plaintext
npx eas-cli build --platform android --profile development
```

O build remoto usa a conta e os limites do EAS. A geração ainda não foi iniciada nesta entrega. Após terminar, abra o link fornecido pelo EAS no Android e instale o APK.

## Testar o development build no Android

1. Inicie o backend com `npm start` em `backend`.
2. Na pasta `mobile`, execute `npm run start:dev-client`.
3. Deixe o celular e o computador na mesma rede Wi-Fi. Abra o app instalado **Reporta Cotia (development)** e use o QR code do terminal; no launcher também é possível informar `http://IP_DO_COMPUTADOR:8082`.
4. Confira lista pública, login e "Minhas denúncias". Teste câmera e localização com permissão aceita e negada. Para enviar dados, use o banco de desenvolvimento.
5. Feche e reabra o app e confira a restauração da sessão; depois saia da conta.

Registre o modelo do Android, a versão do sistema e o resultado de cada item. Logs devem ser compartilhados sem tokens, senhas ou dados pessoais.

## Continuar testando com Expo Go

Se ainda não tiver o APK, use `npm run start:lan` e abra `exp://IP_DO_COMPUTADOR:8082` no Expo Go SDK 57. Não execute os dois comandos de Metro simultaneamente na porta 8082. Novas dependências nativas em etapas futuras podem exigir gerar um novo APK de desenvolvimento.

## Critério para concluir a etapa 1

A configuração e as verificações locais devem passar; o APK deve ser gerado, instalado e abrir o app no aparelho real. Configurar perfis ou exportar bundles não comprova compilação nativa. iOS físico exige assinatura Apple; a validação inicial deste roteiro é Android.

## Etapa 2 — rascunhos

1. Entre, abra nova denúncia, preencha textos e coordenadas, adicione uma foto e espere "Rascunho salvo".
2. Volte à lista e reabra a criação. Depois feche o app pelo Android e reabra: confira todos os campos e a foto.
3. Saia da conta e entre em outra: o rascunho anterior não deve aparecer. Retorne à primeira conta para recuperá-lo.
4. Use "Descartar rascunho", confirme e confira os campos vazios. Envie uma denúncia válida: após confirmação do protocolo, o rascunho deve ser removido.
5. Se faltar espaço ou uma foto ficar indisponível, confira o aviso; não trate o aviso como confirmação de envio.

Há um rascunho por conta/API no aparelho. Ele contém textos, coordenadas e fotos no armazenamento privado do aplicativo, sem senha ou token. Desinstalar o aplicativo ou limpar seus dados remove os rascunhos. Dependências nativas adicionadas: expo-file-system e expo-crypto; gere novo development build quando já tiver a conta EAS.

## Etapa 3 — backend

Na pasta backend: `npm run db:migrate` e reinicie a API. `npm test -- --runInBand` verifica repetição, conflito de conteúdo, isolamento por autor e rollback. `node scripts/smokeReportSubmissions.js` verifica concorrência no PostgreSQL local de desenvolvimento usando uma conta temporária removida ao terminar.

POST /denuncia aceita o header opcional Idempotency-Key (UUID v4). Repetir chave e conteúdo retorna o mesmo protocolo; mudar conteúdo retorna 409. GET /denuncia/submissions/:key consulta o comprovante somente para o autor autenticado. Clientes existentes podem continuar enviando sem a chave. Os comprovantes persistem até a exclusão da conta; remover a denúncia não permite recriá-la com a mesma chave. A fila usa bloqueio da conta no banco durante o upload para impedir duplicações entre instâncias da API.

## Etapa 4 — envio seguro

1. Com a migration aplicada e a API reiniciada, envie normalmente e confira um protocolo.
2. Prepare uma denúncia, desconecte a rede antes de enviar e tente enviar. Os campos ficam preservados e bloqueados enquanto o resultado estiver incerto.
3. Feche/reabra o app, recupere a rede e toque "Confirmar envio pendente". Deve existir somente um protocolo em "Minhas denúncias".
4. Para simular resposta perdida depois da gravação, use um proxy de desenvolvimento que interrompa a resposta de POST /denuncia. Ao confirmar, o app deve recuperar o protocolo existente, sem criar outro.
5. Uma rejeição 400 de validação permite corrigir os campos. Erros de rede/servidor preservam a chave e exigem confirmação. Se um anexo pendente desaparecer, o app consulta o comprovante, mas não reenvia conteúdo diferente.

O identificador e as fotos são gravados antes da requisição. Não desinstale nem limpe os dados do app com um envio pendente: isso remove a chave local; consulte "Minhas denúncias" antes de começar outro envio.

## Etapa 5 — CI

Na pasta mobile, execute `npm ci` e `npm run check`. O workflow validate.yml faz esses checks, Expo Doctor e exportação dos bundles Android/iOS em configuração production, e guarda os bundles por 7 dias. A URL de API no CI é um domínio reservado inválido para que os testes não enviem dados a produção; o artefato é de verificação e não deve ser distribuído como app.

Depois de enviar a branch ao GitHub, confira o job mobile na aba Actions. O CI não gera APK, não faz deploy e não precisa de credencial Expo. Testes que exigem API local estão separados e não são ativados nesse job. A execução remota ainda não ocorreu nesta entrega local.

## Etapa 6 — aparelho Android

Em Sobre o aplicativo, no ambiente development/staging, use "Verificar conexão e permissões". Essa consulta não solicita permissões e não exibe credenciais. Registre versão Android, tipo de instalação (Expo Go/APK), resultado e passo que falhou.

| Cenário | Resultado esperado | Resultado físico |
| --- | --- | --- |
| Teclado aberto, fonte grande, rolagem | Campos e botões acessíveis | Pendente |
| Câmera, galeria e GPS: permitir/recusar | Ação ou mensagem recuperável, sem travamento | Pendente |
| App encerrado após salvar rascunho | Textos e fotos recuperados | Pendente |
| Rede perdida durante envio | Confirmação com único protocolo | Pendente |
| 15 minutos em segundo plano | Sessão encerrada; novo login necessário; rascunho preservado | Pendente |
| Voltar do Android / alternar telas | Navegação previsível, sem telas privadas após sair | Pendente |
| Trocar de conta | Rascunhos e dados privados isolados | Pendente |

Não há aparelho Android conectado nem APK gerado nesta máquina. Portanto, esses itens não foram aprovados fisicamente; correções específicas serão feitas a partir dos resultados. Os testes automatizados e bundles não substituem esta tabela.

## Etapa 7 — abas

Confira Início e Conta sem login. Entre: Minhas deve aparecer e listar somente seus registros. Abra detalhes e nova denúncia: Voltar deve retornar à aba de origem. Alterne abas com busca/paginação preenchidas; confira fonte grande e leitor de tela. Saia pela aba Conta: Minhas e as telas privadas devem desaparecer, inclusive ao pressionar Voltar do Android. A criação continua acessível pelo botão Nova denúncia na lista.

## Etapa 8 — senha

Em Entrar, use Esqueci minha senha. Solicite as instruções, copie o link do e-mail e use Já recebi o link para colá-lo no app. Informe e confirme a nova senha. Teste senha divergente, link expirado e reutilização do link; depois entre com a nova senha. A senha antiga e as sessões antigas devem ser recusadas.

O mesmo e-mail permite redefinir pelo site; o app extrai somente o token, sem abrir ou requisitar a URL colada. O development build aceita `reportacotia-development://redefinir-senha?token=...` (produção: reportacotia), mas o e-mail atual continua com o link web. Custom scheme exige app instalado; o fluxo de copiar/colar também funciona no Expo Go. Não há associação de Universal/App Links nesta etapa.

O backend já usa token de 30 minutos, hash no banco e uso único. Configure RESEND_API_KEY, RESET_EMAIL_FROM e FRONTEND_URL corretos no backend para receber o e-mail, inclusive em desenvolvimento. Sem provedor, a resposta permanece genérica e a falha fica no histórico administrativo, sem imprimir link/token no console. O envio real de e-mail depende dessa configuração e ainda precisa ser conferido; nos testes isolados o token é fornecido apenas em NODE_ENV=test.
