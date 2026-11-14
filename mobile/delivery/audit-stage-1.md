# Etapa 1 — Auditoria e estabilização

Data: 14/11/2026. Branch: `mrcatt`. A árvore de trabalho estava limpa no início. Escopo limitado à etapa 1; nenhuma etapa seguinte foi implementada. Não houve push, deploy, seed, migration nem sincronização de banco operacional. Os testes backend usam exclusivamente SQLite `:memory:` quando `NODE_ENV=test`, inclusive os testes que recriam o esquema.

## Base examinada

Foram examinados os README raiz, web e mobile, o inventário histórico mobile, os índices de entregas incrementais e sprints, a navegação, telas, componentes e serviços mobile, controllers Express, serviços, repositórios, modelos de sessão/denúncia e testes existentes. Os handlers HTTP ficam em `backend/controllers/`, não em uma pasta `routes/`. O SDK real é Expo 57, com React Native 0.86.3 e React 19.2.3.

O frontend web já tem boards, mapas, gestão de usuários, permissões e auditoria; seus serviços consomem o mesmo backend. Nenhuma funcionalidade web foi removida ou portada para o mobile.

## Diagnóstico do código atual

| Área | Estado observado | Limites |
| --- | --- | --- |
| Autenticação | Login/cadastro, JWT de 5 minutos, refresh rotativo, revogação, atividade, limite de 15 minutos ocioso e 8 horas totais | SecureStore guarda refresh e prazos; perfil/access ficam em memória. Logout offline limpa localmente, mas não garante revogação imediata no servidor. Falha de rede na restauração exige novo login atualmente. |
| Conta | Perfil, avatar, recuperação de senha, alteração sensível e exclusão de conta | E-mail e links nativos exigem validação com infraestrutura real. |
| Denúncias | Criação, quatro fotos, câmera/galeria, conversão JPEG, GPS/manual, progresso, confirmação e correção de rejeitadas | Backend limita a 5 MB/arquivo. Correção reutiliza o protocolo e volta à moderação. A API não tem chave idempotente para PUT; a tela consulta o protocolo antes de repetir envio incerto. |
| Rascunhos | Arquivos por API/conta/escopo, duas revisões e cópia durável das fotos | São arquivos no armazenamento privado do app, não um cofre criptografado pela aplicação. A criação persiste UUID antes da requisição; backend usa recibo e bloqueio transacional por usuário. |
| Consulta | Feed público paginado, busca, categoria, resolução, ordenação; lista privada e histórico | Lista própria carrega todos os registros da conta e filtra/pagina no cliente. Ordenação pública por curtidas/compartilhamentos carrega IDs para ordenar no servidor; medir e otimizar com volume real. |
| Interações | Curtir/descurtir, comentários, respostas, exclusão autorizada e compartilhamento nativo | Edição de comentário existe no backend/web, mas não na interface mobile. Bloqueios impedem cliques simultâneos; comentários não têm idempotência de servidor para repetição após resposta perdida. O app orienta atualizar antes de reenviar. |
| Navegação | Início (`ReportsScreen`), Minhas quando autenticado, Conta; formulários/detalhes no stack | Não há abas Mapa/Denunciar. `HomeScreen` é uma tela antiga de diagnóstico separada do feed real; não criar outro feed ao reorganizar. |
| Mapa | Mapa de uma denúncia nos detalhes, validação de coordenadas, fallback sem configuração Android e abertura externa | Não há mapa comunitário mobile, filtros de marcadores ou proximidade. O mapa atual não solicita localização do usuário. |
| Interface | Tema compartilhando identidade web, cards, ícones, safe area, teclado iOS, estados vazios/erro e acessibilidade semântica | Responsividade, teclado Android, contraste real, texto ampliado e leitores de tela precisam de teste visual/físico; testes de renderização não comprovam esses critérios. |
| Boards | Endpoints agregados e interface web existentes | Indicadores pessoais/comunitários ainda não estão no mobile. |
| Push | Ausente | Sem Expo Notifications, cadastro de dispositivos, outbox ou tratamento de abertura por push. |

## Correções realizadas

1. **Contrato de correção:** `PUT /denuncia/:id` retorna `{ message }`, mas o mobile tentava ler `data.denuncia`. `updateReport` agora confirma o PUT e consulta `GET /denuncia/:id`, com a autorização existente. Falha nessa leitura mantém o fluxo de confirmação pendente, sem repetir PUT automaticamente. Os testes anteriores simulavam uma resposta que o backend não produz.
2. **Idempotência e autosave:** enquanto `prepareSubmission` aguardava persistência, autosave/background podia capturar `submissionKey=undefined` e enfileirar uma revisão que apagava a chave. A ref recebe a chave antes de aguardar o disco; falha na preparação restaura a ref anterior e nenhuma requisição de criação é iniciada. Testes cobrem autosave concorrente e falha de armazenamento.
3. **Validação de comentário:** edição com número, booleano, objeto ou array podia chamar `.trim()` e gerar 500. O serviço verifica o tipo e devolve 400 `VALIDATION_ERROR`, mantendo o comentário anterior. A autorização por autoria foi preservada.
4. **Compatibilidade Expo:** Doctor inicialmente aprovou 20/21 checks e identificou sete patches recomendados. Foram alinhados `expo` 57.0.33, build-properties 57.0.23, constants 57.0.24, dev-client 57.0.21, image-manipulator 57.0.22, image-picker 57.0.21 e location 57.0.23, usando `expo install --fix`. Sem troca de SDK, React ou React Native.
5. **Documentação:** README mobile deixa de declarar como ausentes recursos já entregues. Resultados antigos continuam identificados como históricos.

Também foram adicionados testes de segurança do cliente para preservar sessão em 403, renovar access expirado em 401, encerrar sessão revogada e ignorar refresh concluído após logout. Esses comportamentos já funcionavam; não foi reimplementada a sessão.

## Contratos e permissões

Não foram criados ou alterados endpoints backend nem adicionadas migrations. Mudou apenas o tratamento de entrada inválida no PUT de comentários. O cliente de correção passou a cumprir o contrato existente do PUT de denúncias.

- Feed: `GET /denuncia` com `page`, `limit=12`, `titulo`, categoria, resolução e ordenação. Backend mantém apenas aprovadas.
- Privado: `GET /denuncia/user/:userId`, restrito ao autor ou `moderation.view`. Detalhes/histórico privados conferem autoria/permissão no servidor.
- Criação: `POST /denuncia` e `GET /denuncia/submissions/:key`; UUID v4 e recibo vinculados à conta. Não repetir upload com conteúdo diferente para a mesma chave.
- Correção: `PUT /denuncia/:id`, autoria e `denuncia.update_own`, apenas rejeitadas; depois `GET /denuncia/:id`.
- Social: rotas de like, comentário e share limitam interações a aprovadas; edição/exclusão conferem autorização. Compartilhamento tem `clientRequestId` para confirmação idempotente.
- Sessão: endpoints `users/session/refresh`, `activity` e `end`; backend revalida conta/permissões e refresh reutilizado revoga a família.

## Arquivos modificados

- `backend/services/CommentService.js`
- `backend/tests/integration/social.routes.test.js`
- `mobile/src/services/reportService.ts`
- `mobile/src/services/useReportDraft.ts`
- `mobile/tests/mobileServices.test.ts`
- `mobile/tests/submissionDraft.test.ts`
- `mobile/tests/AuthContext.test.tsx`
- `mobile/package.json` e `mobile/package-lock.json`
- `mobile/README.md` e este relatório

## Validação e limitações

| Verificação | Resultado em 14/11/2026 |
| --- | --- |
| `mobile: npm run check` após patches | TypeScript sem erros; 6 testes de configuração e 108 testes Jest aprovados, 2 testes reais de API ignorados na suíte offline |
| `backend: npm test -- --runInBand` | 36 suítes, 208 testes aprovados, incluindo integração Supertest/SQLite, sessões, permissões, uploads e idempotência |
| `frontend: npm test -- --watchAll=false --runInBand` | 23 suítes, 90 testes aprovados |
| `npx expo-doctor` após patches | 21/21 verificações aprovadas |
| `mobile: npm run export` após patches | Bundles Hermes Android e iOS gerados em `mobile/dist`, ambiente development; sem build nativo |
| `mobile: npm run smoke:api` | 2 falhas de conexão à API configurada, reproduzidas fora do sandbox; PostgreSQL/API real não validados nesta execução |
| `git diff --check` | Sem erros de whitespace |

A primeira execução backend dentro do sandbox teve 4 timeouts no hook de preparação de `account-security`, com 204 testes aprovados. A repetição fora do sandbox passou integralmente, sem alterar limites de tempo ou código dos testes para ocultar falhas. O smoke de API faz somente leitura; não se iniciou banco/API nem se modificou ambiente para fazê-lo passar.

## Riscos e configuração externa

- A API configurada não foi alcançada pelo smoke, inclusive fora do sandbox. Testes SQLite/Supertest não substituem PostgreSQL real, concorrência entre instâncias ou upload Cloudinary real.
- A instalação npm reportou 13 vulnerabilidades (9 baixas, 3 moderadas, 1 alta). Não foi usado `audit fix --force`; requer triagem das cadeias afetadas antes de distribuição.
- Imagens em `/uploads` são servidas estaticamente e Cloudinary usa URLs públicas. Conhecer a URL permite buscar um anexo sem passar pela autorização da denúncia. Se anexos pendentes/rejeitados precisarem ser privados, será necessária entrega autenticada/assinada e revisão do cache/CDN, incluindo clientes web. O UUID do nome não substitui autorização. Isso não foi alterado nesta correção de contrato.
- `publicAddress` reduz números residenciais na apresentação, mas não remove endereços/coordenadas do contrato público de denúncias aprovadas. Definir política de precisão geográfica antes de ampliar o mapa comunitário.
- Android nativo com mapas depende de `GOOGLE_MAPS_ANDROID_API_KEY` real e restrições de package/SHA; não foi criada chave. EAS/lojas exigem contas e credenciais reais. Staging exige API HTTPS real, sem fallback para produção.
- Câmera, galeria, GPS, permissão negada, upload com rede interrompida, abertura de links, retomada de sessão e acessibilidade precisam de Android/iOS real. Bundles Hermes não são APK/AAB/IPA nem comprovação de instalação. Não foram enviados e-mails ou notificações reais.

## Plano técnico atualizado — sem execução automática

1. **Etapa 2 — navegação/experiência:** reutilizar `MainTabs`, `ReportsScreen`, stack e formulário; destacar Denunciar com acesso autenticado e preservar consulta pública. A aba Mapa deve integrar a implementação geográfica da etapa 4, sem criar telas de feed/formulário duplicadas. Priorizar testes de transição visitante/login/logout e teclado/safe area em aparelho. Definir edição de comentários como complemento separado, pois não existe UI atualmente.
2. **Etapa 3 — board pessoal:** consumir `GET /boards/mine` e seu `summary`: `total`, `pendente`, `approved`, `rejeitada`, `em_andamento`, `resolvida`. O backend já agrega por status/moderação e limita escopo a `user.id`, ignorando tentativa de trocar o proprietário pela query. Integrar em Minhas com uma atualização por foco/ação e estados de loading/erro/vazio. O endpoint hoje também consulta colunas; avaliar projeção de resumo apenas se a medição justificar, preservando contrato web. Não calcular totais a partir da página visível nem consultar cada status separadamente.
3. **Etapa 4 — comunidade/mapa:** `/boards/public/indicators`, `/boards/public` e `/boards/public/map-points` já existem, mas todos passam por auth e `dashboard.public.view`; não são endpoints anônimos. Map-points limita a 500 pontos e o heatmap omite células com menos de três registros. Definir acesso visitante com projeção pública mínima e agregação de aprovadas, sem liberar o router inteiro. Harmonizar filtros de resolução/categoria e limites com o feed, informar resultados truncados, descartar coordenadas inválidas e abrir detalhes pelo ID. Solicitar GPS somente ao centralizar. Proximidade requer desenho/índice backend e medição, sem varrer todo o conjunto no celular.
4. **Etapa 5 — push:** adicionar Expo Notifications compatível com SDK 57 e migrations incrementais para dispositivos por conta e outbox/tentativas. Registrar evento na transação de moderação/resolução e entregar fora dela, com unicidade por evento/dispositivo, retries e invalidação de tokens obsoletos. Cadastro/remoção autenticados, preferência explícita e tratamento de troca de conta. Notificação deve carregar apenas ID/tipo necessários; abrir detalhes via navegação tipada e sempre buscar conteúdo autorizado na API. Testar deduplicação, logout, dispositivo inválido, abertura a frio e sessão expirada; entrega real depende de EAS/projeto/dispositivos e credenciais válidos.
5. **Etapa 6 — validação final:** repetir suites e Doctor após cada mudança de dependência; conferir ambientes sem alterar segredos, validar PostgreSQL de desenvolvimento e SDKs nativos, gerar bundles de produção e registrar testes físicos Android/iOS. Recriar development builds depois dos patches nativos. Publicação permanece sujeita à autorização específica.

Commit: este relatório acompanha o commit local da Etapa 1 (`fix: stabilize mobile submissions and API validation`). Consulte `git log -1 --oneline -- mobile/delivery/audit-stage-1.md` para o hash. Nenhum push/deploy autorizado ou realizado.
