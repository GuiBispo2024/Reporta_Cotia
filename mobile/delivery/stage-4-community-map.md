# Etapa 4 — Comunidade e mapa mobile

14/11/2026. Branch `mrcatt`, baseada na Etapa 3 (`54cf494`). Git limpo ao iniciar. Executada exclusivamente a Etapa 4: sem notificações push, merge, push, deploy, atualização de dependências, migration ou alteração de configuração/segredos de produção.

## Auditoria e decisões

Foram examinados MainTabs/RootNavigator, feed/lista pessoal/detalhes, ReportMap, serviços de denúncias/boards/GPS, componentes e serviços web de boards/mapas/detalhes, controllers, serviços, repositórios e autenticação/permissões backend.

Os três endpoints `/boards/public/indicators`, `/boards/public` e `/boards/public/map-points` **exigiam e continuam exigindo autenticação e `dashboard.public.view`**. O router inteiro não foi aberto a visitantes. O endpoint de pontos já limitava a 500, mas só excluía coordenadas nulas; passou também a exigir coordenadas nos intervalos válidos.

A auditoria identificou coordenadas e endereço originais nas consultas públicas de denúncias e pontos do board. Proteger só os marcadores mobile deixaria esses dados recuperáveis nos outros endpoints. A correção foi feita no backend e acompanhada de adaptações web, mantendo os originais nos fluxos privados autorizados.

## Política geográfica implementada

- Apenas aprovadas aparecem na comunidade. Pendentes/rejeitadas continuam privadas e os testes verificam sua exclusão.
- Coordenadas individuais públicas são arredondadas para uma **grade fixa de 0,01 grau**, aproximadamente 1 km em Cotia. Não há opt-in para publicar GPS exato nesta versão.
- Nas projeções públicas, `localizacao` passa a ser `Cotia — localização aproximada`, `bairro` fica vazio e `locationApproximate: true` identifica a generalização. Coordenadas inválidas viram null; campos de coordenadas não são acrescentados às colunas que já não os tinham.
- Marcadores/previews comunitários não incluem endereço. Dígitos são removidos do título nos endpoints de pontos, conservadoramente, para evitar numeração residencial no marcador; isso também remove números legítimos de datas/nomes de vias nesse título de prévia. O texto original não é alterado no banco.
- Rótulos de bairros legados com dígitos ou indícios de endereço nos agregados protegidos são reunidos sob “Região não divulgada”. Categorias comunitárias são normalizadas para o catálogo existente, usando Outros para valores legados desconhecidos.
- A busca pública por `localizacao` rejeita números e os curingas `%`/`_` com 400 `PRIVATE_LOCATION_FILTER`, para impedir consultas à numeração/GPS ocultados. Também restringe nomes de vias numeradas; busca por título/categoria e pelos nomes de vias sem números continua disponível.
- `Cache-Control: no-store` foi aplicado à leitura comunitária e ao router de denúncias. Não houve invalidação de caches externos ou alteração de infraestrutura.
- Autor autenticado e moderação autorizada conservam os dados exatos nos detalhes privados; lista própria, boards privados, mapa analítico e exportações autorizadas preservam os fluxos existentes. As consultas explicitamente públicas generalizam mesmo quando o autor está autenticado.
- Os formulários web/mobile informam a política. O web não geocodifica uma projeção aproximada para tentar produzir um endereço residencial; o mapa/detalhes indicam aproximação.

Essa política é **generalização geográfica, não anonimização**. Títulos completos, descrições, comentários, histórico e imagens de publicações aprovadas continuam sujeitos à política de conteúdo/moderação existente e podem identificar lugares/pessoas. Nenhuma heurística garante remover informação pessoal de texto livre ou pixels. Consultas textuais por nome da via ainda podem permitir inferências. O heatmap protegido existente mantém células agregadas de 0,001 grau com mínimo de três registros e sem IDs; não é o conjunto de pontos individuais do novo mapa. Cópias de dados públicos obtidas antes desta alteração não podem ser retiradas retroativamente.

## Funcionalidades mobile

- Cinco destinos autenticados: **Início, Mapa, Denunciar, Minhas, Conta**. Visitantes têm os mesmos destinos, exceto Minhas. Feed, formulário, board pessoal, gerenciamento de sessões e permissões foram preservados.
- Mapa acessível a visitantes e contas, com indicadores públicos, distribuição por categoria, filtros de categoria/resolução, atualização manual e estados de carregamento/erro/vazio.
- Marcadores agrupados pela célula aproximada. Selecionar um marcador mostra suas ocorrências, com título, categoria e situação; abrir uma ocorrência usa o mesmo `ReportDetail` do feed.
- Lista acessível e paginada em lotes de 12 dos pontos já carregados. Continua utilizável quando o mapa nativo não está configurado. Sem coordenadas válidas, há uma mensagem específica, mantendo os indicadores e a consulta sem GPS.
- Marcadores limitados ao conjunto retornado, `tracksViewChanges=false`, sem consultas individuais por ponto. Agrupamento linear de no máximo 500 pontos; não há busca por proximidade ou distância calculada sobre toda a base.
- Mostra quantos pontos foram carregados e quantos existem no recorte geográfico. Quando truncado, avisa que o mapa não contém todas as ocorrências da cidade e orienta usar filtros. Os totais dos indicadores incluem também denúncias sem GPS.
- GPS somente no botão de centralização, via `getDevicePosition`, sem geocodificação reversa e sem envio à API. Permissão negada não impede mapa/lista/filtros. Resultados de GPS/HTTP obsoletos são ignorados ao sair ou trocar a consulta.
- Cards responsivos, com coluna única para texto ampliado, rótulos acessíveis, cores/componentes do tema atual e nenhum gráfico administrativo.
- `NativeReportMap` compartilha provider, fallback Android e instância nativa entre mapa comunitário e mapa de detalhes. Não foi duplicada a configuração de mapas.

## Endpoint novo e custo

`GET /community`, sem autenticação, tem resposta idêntica para visitante e conta. Aceita exclusivamente `categoria` (texto até 120 caracteres) e `resolucaoStatus` (`aberta`, `em_andamento`, `resolvida`). Parâmetros desconhecidos, arrays/objetos, status privados e tentativa de selecionar `userId` são rejeitados.

| Campo | Conteúdo |
| --- | --- |
| `scope`, `source`, `generatedAt` | community, live e horário da consulta |
| `summary` | total, em_andamento, resolvida, apenas aprovadas no recorte |
| `categories` | label/total por categoria no mesmo recorte |
| `points` | ID, título de prévia, categoria, status aprovada, resolução, latitude/longitude aproximadas |
| `total`, `limit`, `truncated` | total com coordenadas válidas, teto 500 e indicação explícita de truncamento |
| `filters`, `privacy` | filtros efetivos, coordinatePrecision=2, approximate=true, addressIncluded=false |

Uma chamada carrega indicadores e mapa juntos. O servidor faz agregação SQL e consulta paginada/contagem de pontos numa transação de leitura com isolamento REPEATABLE_READ; não carrega todas as denúncias detalhadas para calcular indicadores. Isso mantém os dados da nova resposta no mesmo snapshot, sem participar de transações de escrita/moderação.

O app consulta uma vez por foco, aplicação de filtros, atualização ou tentativa manual. Digitar/selecionar filtros não consulta antes de aplicar; movimento/zoom/seleção do mapa não dispara HTTP. Não foram adicionados índices/migrations ou dependências de clustering sem evidência de necessidade. Proximidade futura exigirá medição e desenho de consulta/índice espacial backend, não varredura global no cliente.

## Compatibilidade de contratos existentes

1. `/boards` continua autenticado e com as mesmas permissões. Endpoints administrativos não foram removidos ou abertos.
2. `/denuncia`, `/denuncia/filter`, `/denuncia/public/user/:id` e detalhes aprovados para não autores passam pela projeção pública no servidor. Estruturas de array/página, IDs e campos de localização permanecem consumíveis pelos clientes; endereço/bairro/coordenadas públicos mudam de significado conforme a política. Clientes antigos podem ignorar o novo indicador de aproximação, mas não recebem os originais por esses caminhos.
3. `/boards/public` generaliza suas colunas e `/boards/public/map-points` generaliza coordenadas/títulos. O limite existente permanece 500, agora contando somente coordenadas geográficas válidas.
4. Resumo e categorias de `/boards/public` e `/boards/public/indicators` usam a mesma agregação operacional de aprovadas atuais da comunidade, evitando que uma aprovação/rejeição dependa de nova carga para aparecer nesses contadores. Campos `summarySource=live` e `summaryGeneratedAt` identificam a origem.
5. Séries históricas, demais distribuições e médias continuam no snapshot analítico, com `lastUpdatedAt`, `dataAsOf` e `status` existentes. O web diferencia isso do resumo atual, inclusive antes da primeira carga. A visão analítica administrativa mantém sua regra de elegibilidade original; um registro aprovado legado com data futura pode entrar no resumo operacional e continuar excluído da série analítica.
6. Filtros antigos por bairro no board protegido ainda usam a dimensão/coorte da carga analítica, conforme implementação anterior. O mapa visitante aceita somente categoria/resolução, sem depender dessa carga.

## Arquivos modificados

| Área | Arquivos |
| --- | --- |
| Backend — montagem/rotas | `backend/app.js`, `backend/controllers/CommunityController.js`, `BoardController.js`, `DenunciaController.js` |
| Backend — consultas/serviços | `backend/repositories/BoardRepository.js`, `backend/services/CommunityService.js`, `BoardService.js`, `DenunciaService.js`, `backend/utils/publicGeography.js` |
| Backend — testes | `backend/tests/integration/community.routes.test.js`, `analytics.test.js`, `backend/tests/unit/public-geography.test.js`, `denuncia.service.test.js` |
| Web — componentes/telas | `frontend/src/components/BoardMap.jsx`, `ReportBoard.jsx`, `frontend/src/pages/DetalheDenuncia.jsx`, `NovaDenuncia.jsx`, `EditarDenuncia.jsx` |
| Web — testes | `frontend/tests/unit/PublicGeography.test.jsx`, `BoardMap.test.jsx`, `ReportBoard.test.jsx` |
| Mobile — componentes/telas | `mobile/src/components/NativeReportMap.tsx`, `ReportMap.tsx`, `mobile/src/screens/CommunityScreen.tsx`, `CreateReportScreen.tsx` |
| Mobile — serviços/navegação | `mobile/src/services/communityService.ts`, `locationService.ts`, `reportService.ts`, `mobile/src/navigation/MainTabs.tsx`, `types.ts` |
| Mobile — testes | `mobile/tests/CommunityScreen.test.tsx`, `communityService.test.ts`, `location.test.ts`, `navigation.test.tsx` |
| Documentação | `mobile/README.md`, `docs/boards/README.md`, `docs/analytics/catalogo.md`, este relatório |

Nenhum package/lockfile, modelo, credencial ou arquivo de ambiente foi alterado. Os testes com recriação de esquema operam exclusivamente em SQLite `:memory:` sob NODE_ENV=test, nunca no banco operacional.

## Validação

| Comando/check | Resultado |
| --- | --- |
| `mobile: npm run check` | TypeScript sem erros, 6 testes de configuração e 178 testes Jest aprovados; 2 testes reais de API ignorados na suíte offline |
| `mobile: Jest navigation.test.tsx` após ajuste de limpeza de timers | 8 testes aprovados, incluindo visitante/conta → Mapa → detalhes → retorno e regressões de sessão |
| `backend: npm test -- --runInBand` | 227 testes aprovados em 38 suítes |
| `backend: Jest community.routes, denuncia.routes, denuncia.service` após proteção adicional da busca por localização | 33 testes aprovados em 3 suítes |
| `frontend: npm test -- --watchAll=false --runInBand` | 93 testes aprovados em 24 suítes |
| `frontend: npm run build` | Compilação web aprovada, sem deploy |
| `mobile: npx expo-doctor` | 21/21 verificações aprovadas |
| `mobile: npm run export` | Bundles Hermes Android/iOS gerados em mobile/dist, ambiente development |
| `git -c core.whitespace=cr-at-eol diff --check` | Sem erros, respeitando os CRLF já versionados no backend |

Testes novos cobrem consulta anônima/autenticada, não aprovadas, dados privados, caminhos públicos antigos, precisão/generalização, filtros, coordenadas inválidas/nulas, conta autoral privada, agregados, permissão administrativa, revogação de publicação e limite real com mais de 500 registros no SQLite. No mobile, cobrem agrupamento, detalhes, filtros/ausência de reload por movimento, permissão negada e centralização autorizada sem enviar GPS à API, rede/retry, contrato inválido, omissão de pontos inválidos e cancelamento. No web, verificam indicação de aproximação e ausência de geocodificação reversa pública, preservando o fluxo privado.

As falhas intermediárias de expectativas antigas foram revisadas conforme os contratos novos: GPS/endereço público e resumo antes limitado à carga. Os testes não foram removidos ou seus timeouts aumentados. Um aviso de act em timer do navegador motivou limpeza dos timers em testes; a suíte de navegação passou sem o aviso na repetição dirigida.

## Limitações, riscos e configuração Android/iOS

- Não houve teste físico Android/iOS, instalação APK/IPA, PostgreSQL real, smoke de API remota ou benchmark em aparelho. Exportação/Doctor/mocks não comprovam esses itens.
- Android nativo mantém a necessidade da chave real `GOOGLE_MAPS_ANDROID_API_KEY`, com restrições corretas de package/SHA-1. Sem configuração, a lista continua funcional. iOS usa o provider nativo existente; permissões foreground do Expo Location já estavam configuradas. Nenhuma chave, conta ou configuração real foi substituída.
- A API executando este código precisa estar alcançável pelo aparelho. O endpoint novo não existe em servidores que ainda executem a versão anterior; nenhum servidor foi atualizado nesta entrega.
- O teto 500 e agrupamento da grade reduzem carga/renderização, mas não substituem ensaio de desempenho real. Não há geofencing municipal ou validação de pertencimento a Cotia, apenas validação de intervalo geográfico.
- O mapa não faz polling nem promete atualização em tempo real. Alterações externas aparecem no próximo foco/atualização. Heatmap/séries legados têm regras e timestamps próprios.
- A generalização reduz precisão; não impede correlação com textos, imagens, nomes de vias, fontes externas ou regiões com poucos moradores. Conteúdo aprovado continua exigindo moderação; URLs de imagens e riscos preexistentes de armazenamento permanecem conforme a auditoria da Etapa 1.
- Rótulos legados de bairro são texto livre: a supressão de indícios de endereço é conservadora e não equivale à validação de um cadastro oficial de bairros. Uma evolução futura deve usar regiões canônicas/IDs e revisar conteúdo pessoal já publicado.
- Compatibilidade preserva formas/tipos consumíveis, não a precisão original dos valores públicos. Consumidores externos devem passar a indicar aproximação; não é possível apagar cópias antigas já obtidas. Caches externos anteriores precisam de revisão operacional separada e autorizada.
- Avisos de dependências anteriores não foram reavaliados por npm audit ou corrigidos com upgrades nesta etapa. O build web emite aviso de depreciação fs.F_OK no toolchain, sem impedir compilação.

## Roteiro manual pendente

1. Como visitante e como conta, abrir Mapa, aplicar categoria/resolução, selecionar região e abrir detalhes. Voltar deve retornar à aba Mapa; Minhas só deve existir para conta autenticada.
2. Conferir totais com o board web para filtros equivalentes, distinguindo resumo atual de séries da carga. Verificar que sem GPS continua havendo indicadores, sem inventar marcadores.
3. Comparar origem privada com projeção pública: fonte exata permanece para autor/moderação; visitante recebe região aproximada sem número/endereço residencial estruturado.
4. Negar GPS, desligar localização, testar rede interrompida e resposta tardia ao sair. A lista deve continuar utilizável. Aceitar GPS somente ao centralizar e verificar que nenhuma posição é enviada à API.
5. Testar mais de 500 resultados, região com vários pontos, navegação em páginas de 12 e aviso explícito de truncamento. Conferir texto ampliado, VoiceOver/TalkBack, safe areas e gestos mapa/rolagem em celulares pequenos.

Commit local desta etapa: `feat: add community map with public geography protection`. O hash definitivo está em `git log -1 --oneline -- mobile/delivery/stage-4-community-map.md`. Sem push, deploy, merge ou início da Etapa 5.
