# Etapa 3 — Board pessoal mobile

Data: 14/11/2026. Branch: `mrcatt`. Base: Etapa 2, commit `e9ae1b8`. Git sem alterações locais ao iniciar. Trabalho restrito à Etapa 3, sem push, deploy, merge, atualização de dependências ou configuração de produção.

## Auditoria e contrato confirmado

Foram examinados `ReportsScreen`, `MainTabs`, componentes de tema/cards/ícones, `ReportBoard` e o serviço web, além de `BoardController`, `BoardService`, `BoardRepository` e testes backend existentes. Não havia painel pessoal no mobile. O feed e a lista própria já compartilham `ReportsScreen`; foram preservados.

`GET /boards/mine` é protegido pelo middleware de autenticação do router. Não exige permissão administrativa ou `dashboard.full.view`. O serviço usa `{ userId: req.user.id }`; um `userId` arbitrário na query não substitui o proprietário. A resposta real inclui `scope: 'mine'`, `summary`, `columns`, `filters`, `generatedAt` e `limit`.

| Campo em `summary` | Uso no mobile |
| --- | --- |
| `total` | Total de denúncias |
| `pendente` | Pendentes de moderação |
| `approved` | Aprovadas |
| `rejeitada` | Rejeitadas |
| `em_andamento` | Aprovadas em andamento |
| `resolvida` | Aprovadas resolvidas |

Os campos continuam válidos e foram confirmados por testes de integração. Moderação e resolução são dimensões distintas: `total = pendente + approved + rejeitada`; andamento e resolvidas são subconjuntos das aprovadas. Os seis contadores não são somados para obter um novo total.

## Implementação

- Painel “Sua participação” entre o cabeçalho de Minhas denúncias e a busca/filtros existentes, mantendo listagem, detalhes e acompanhamento.
- Cards com os seis indicadores, usando `Surface`, `Icon`, `Button`, tipografia e cores já presentes. Total em destaque, moderação agrupada separadamente do andamento das aprovadas; explicação sobre a sobreposição dos indicadores.
- Grade flexível sem altura fixa nem truncamento. O painel passa a uma coluna quando o tamanho efetivo de tela/fonte é pequeno ou o texto está ampliado. Cada card tem rótulo acessível incluindo nome e contador; ícones são decorativos.
- Estados de carregamento, erro com tentativa manual e conta vazia com orientação para Denunciar. Ausência de dados ou erro não é transformado em zeros fictícios.
- Novo serviço mobile valida escopo e os seis inteiros seguros não negativos, além da consistência entre as dimensões. Descarta registros/colunas e outros campos antes de guardar o resultado no estado.
- Resumo global da conta, sem aplicar título, categoria, resolução ou paginação da lista. A interface deixa essa diferença explícita. Os totais nunca são calculados a partir dos registros da página visível.

## Atualização, custo e isolamento

O painel possui um `useFocusEffect` independente da consulta da lista. Faz uma requisição por foco em Minhas, incluindo o retorno de criação, detalhes e correção. A consulta depende apenas do cliente HTTP, ID da conta, restauração e gatilhos explícitos de atualização/tentativa; digitação, busca, filtros, paginação e atualização do perfil sem troca de conta não disparam novas consultas de indicadores.

Atualizar por gesto refaz uma vez o resumo e a lista. A tentativa após erro dos indicadores refaz somente o resumo. Não há polling, temporizador, cálculo de seis indicadores em seis requisições ou cache global entre contas. As respostas independentes não bloqueiam uma à outra.

A chamada é `GET /boards/mine?column=pendente&limit=1`. No contrato existente, `column` e `limit` limitam apenas os cartões em `columns`; `summary` continua global. Isso foi confirmado comparando a resposta limitada com o board completo no teste backend. Assim, o serviço do board executa uma agregação por moderação/resolução e uma consulta paginada de uma coluna, em vez de consultar as cinco colunas padrão. A autenticação mantém suas consultas normais. A resposta ainda pode carregar um registro pendente da própria conta, descartado pelo parser mobile; não foi criado endpoint só para eliminar esse pequeno payload.

Sem sessão, durante restauração ou fora da tela pessoal não há consulta do painel. O serviço não recebe um argumento `userId` e não o envia na query. A propriedade autenticada continua sendo responsabilidade do backend. A renderização é vinculada ao ID da conta, e respostas antigas são abortadas/ignoradas no blur, desmontagem, logout e troca de conta. Os contadores ficam somente em memória.

## Arquivos modificados

- `mobile/src/components/PersonalReportBoard.tsx`: painel, estados, apresentação e atualização por foco.
- `mobile/src/services/boardService.ts`: contrato tipado, validação e consulta única.
- `mobile/src/screens/ReportsScreen.tsx`: integração no cabeçalho e atualização por gesto.
- `mobile/tests/boardService.test.ts`: contrato real, entrada inválida, contagens, rede, 401 e cancelamento.
- `mobile/tests/PersonalReportBoard.test.tsx`: loading, seis contadores, vazio, erros/retry, sessão, troca de conta, respostas tardias e texto ampliado.
- `mobile/tests/PersonalBoardFlow.test.tsx`: navegador real, retorno de criação/detalhes/correção, preservação de filtros/página e atualização independente.
- `mobile/tests/ReportsScreen.test.tsx`: adaptação da suíte e ausência de consulta privada sem sessão.
- `backend/tests/integration/boards.routes.test.js`: testes do contrato limitado, isolamento, atualização dos estados e conta vazia.
- `mobile/README.md` e este relatório.

Não foram alterados handlers, serviços, repositórios ou modelos backend. Não foram criados endpoints ou migrations. Os contratos web/administrativos e as permissões permanecem iguais. Os testes backend recriam exclusivamente SQLite em memória sob `NODE_ENV=test`, conforme a configuração existente; não houve sync, seed ou migration em banco operacional.

## Testes executados

| Verificação | Resultado |
| --- | --- |
| `cd mobile; npm run check` | TypeScript sem erros; 6 testes de configuração e 156 testes Jest aprovados em 26 suítes; os 2 testes reais de API permanecem ignorados na execução offline |
| `cd mobile; npx expo-doctor` | 21/21 verificações aprovadas |
| `cd mobile; npm run export` | Bundles Hermes Android e iOS gerados em `mobile/dist`, ambiente development |
| `cd backend; npm test -- --runInBand --runTestsByPath tests/integration/boards.routes.test.js tests/integration/session-security.test.js` | 23 testes aprovados em 2 suítes de integração Supertest/SQLite |
| `git -c core.whitespace=cr-at-eol diff --check` | Sem erros; respeita os finais de linha CRLF já versionados no teste backend |

O teste com navegador real confirma uma consulta de indicadores na entrada, nenhuma consulta adicional ao buscar/filtrar/paginar e exatamente mais uma ao voltar de cada uma das três telas. Os totais do painel são maiores que os registros filtrados/paginados no teste, verificando que não derivam deles. Gesto de atualização preserva página/filtros e consulta os dois recursos uma vez. Erro do painel e sua tentativa manual não refazem a lista.

No backend, a query com outro proprietário continua limitada à conta autenticada. O contrato com uma coluna limitada contém os mesmos totais globais da resposta completa; uma alteração de em andamento para resolvida atualiza o resumo sem duplicar aprovadas. Conta sem denúncias retorna seis zeros. Os testes existentes de sessão e do AuthProvider foram mantidos e executados.

## Limitações e riscos

- Sem validação física Android/iOS, leitores de tela, texto ampliado em aparelho ou avaliação visual real. Os testes de dimensão/fonte e bundles não comprovam instalação ou compilação APK/AAB/IPA.
- Não foram executados smoke de API remota/PostgreSQL ou benchmarks com volume real nesta etapa. Os testes de backend usam SQLite em memória. A redução de consultas foi avaliada pelo caminho do código e pelo contrato, sem alegar latência medida em produção.
- O painel e a lista são consultas independentes: alterações concorrentes podem produzir diferença transitória até a próxima atualização. Não se promete uma fotografia transacional conjunta.
- Não há atualização em tempo real enquanto a tela permanece aberta. Mudanças externas aparecem ao retornar à tela, atualizar por gesto ou repetir uma consulta após erro. Retomar o app sem mudança de foco não adiciona polling.
- A lista própria ainda carrega todos os registros da conta, conforme contrato preexistente. Essa limitação não foi modificada para implementar o resumo agregado.
- Mudanças futuras nos nomes dos campos ou na relação entre status exigem atualizar o parser/testes; inconsistências hoje geram erro explícito, sem mostrar indicadores incorretos.
- Riscos anteriores de URLs de anexos, precisão geográfica e avisos de dependências seguem registrados nas etapas anteriores. Não foram alterados ou reavaliados por `npm audit` nesta etapa.

## Validação manual pendente

1. Entrar com uma conta sem denúncias e conferir orientação, seis zeros e acesso ao formulário existente por Denunciar.
2. Em conta com estados variados, comparar os seis contadores com o board web da mesma conta. Não somar andamento/resolvidas novamente ao total de moderação.
3. Aplicar busca/filtros e ir à página seguinte; o resumo deve continuar global. Abrir detalhes/correção ou criar denúncia e voltar: resumo atualizado, busca/filtros preservados, página preservada quando ainda válida.
4. Interromper a rede, conferir erro independente do painel, restaurar e tentar novamente. Atualizar por gesto deve renovar painel/lista.
5. Sair/trocar de conta com uma consulta pendente, expirar a sessão e fechar/reabrir: não devem aparecer indicadores da conta anterior antes de validar a sessão.
6. Conferir layout em telas de 320/360 pontos, fonte ampliada, VoiceOver/TalkBack e safe areas nas duas plataformas.

## Commit local

Entrega associada ao commit `feat: add personal report board to mobile`. Obtenha o hash definitivo com `git log -1 --oneline -- mobile/delivery/stage-3-personal-board.md`. Sem push, deploy ou merge.

Mapa comunitário e notificações push não foram implementados. Nenhuma etapa seguinte foi iniciada.
