# Etapa 5 — Notificações push

Implementação local na branch `mrcatt`, partindo do commit da Etapa 4 `24a0389`, com árvore inicialmente limpa. Nenhum push, merge, deploy, migration operacional, edição de credenciais ou início da Etapa 6.

## Auditoria e arquitetura

Revisados RootNavigator/MainTabs/ReportDetail, AuthContext e refresh no SecureStore, AuthSession/SessionService, serviços de moderação/resolução, associações Sequelize, migrations e testes. O backend não possuía fila persistente de push. O processamento de analytics existente não oferece a semântica de entrega necessária, portanto foi preservado e criado um consumidor separado.

Expo instalado: SDK `57.0.33`; adicionado somente `expo-notifications ~57.0.25` e suas dependências necessárias ao lockfile, sem atualizar SDK. Referências oficiais consultadas: [Expo Notifications SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) e [envio e receipts](https://docs.expo.dev/push-notifications/sending-notifications/). Usados handler com `shouldShowBanner/shouldShowList`, leitura/limpeza síncrona da última resposta e token Expo renovado após listener de token nativo.

Moderação e resolução registram evento + entregas na mesma transação do negócio, sob o lock já existente da denúncia. Nenhuma chamada ao Expo ocorre na transação ou no request de moderação. Uma falha de rede do provedor não impede aprovação/rejeição/resolução. Falha de persistência da outbox reverte a operação para preservar atomicidade.

Eventos: `aprovada`, `rejeitada`, `em_andamento`, `resolvida`. Somente mudanças efetivas de status; repetição, alteração isolada de motivo/setor e retorno a estados iniciais não notificam. O histórico identifica unicamente o evento quando disponível; entregas têm unicidade por evento/dispositivo. Sem autor válido não há evento. Títulos/corpos são templates estáticos, evitando duplicar conteúdo de denúncia na outbox.

## Modelos e migration

Migration incremental `backend/migrations/202611140001-create-push-outbox.js`:

- `PushPreferences`: opção global da conta, desativada por padrão.
- `PushDevices`: instalação UUID e token únicos, proprietário e sessão autenticados, plataforma, versão, enabled e lastSeenAt. Versão muda na rotação, troca de sessão/conta e desativação.
- `NotificationEvents`: UUID, autor, denúncia, histórico único opcional e tipo; sem endereço, texto livre ou coordenadas.
- `NotificationDeliveries`: evento/dispositivo/versão, estado, tentativas, próxima tentativa, lease, ticket e timestamps de aceitação/receipt; erros codificados, sem token.

Índices para conta/dispositivos, sessão, eventos por conta, estado/vencimento e lease. Exclusão da conta/denúncia remove seus eventos; remoção do dispositivo conserva a trilha técnica com FK nula. Pruning de sessões remove registros ligados à sessão. A migration foi aplicada somente em SQLite descartável em memória pelo teste de bootstrap, junto a todas as anteriores. PostgreSQL real não foi validado nesta entrega.

## Endpoints autenticados

| Método/caminho | Contrato |
| --- | --- |
| POST `/notifications/devices` | installationId UUID, expoPushToken validado, platform android/ios, consent booleano. Atualiza por instalação; consent false não habilita uma nova conta. |
| DELETE `/notifications/devices/:id` | Remove somente dispositivo da conta; idempotente. If-Match opcional protege a versão de operações atrasadas. |
| GET `/notifications/preferences` | enabled e dispositivos próprios sem token/instalação/sessão. |
| PATCH `/notifications/preferences` | Apenas enabled booleano. false desativa todos e cancela entregas pendentes; true não reativa silenciosamente aparelhos. |
| GET `/notifications/events/:id` | Resolve eventId para denunciaId somente se evento e denúncia pertencerem à conta autenticada; 404 para outra conta/removida. |

Nenhum endpoint recebe userId/sessionId como proprietário. Campos extras de escrita são rejeitados. O cabeçalho opcional X-Push-Account apenas rejeita uma operação se a conta mudou durante a espera/refresh; não seleciona proprietário. Respostas usam Cache-Control no-store. Contratos administrativos e web existentes foram preservados.

## Processamento e recuperação

`npm run notifications:worker` executa consumidor independente; `npm run notifications:once` processa um lote para agendamento externo. Desativado por padrão: requer `PUSH_DELIVERY_ENABLED=true`. `PUSH_BATCH_SIZE` aceita 1–100, padrão 20. Seleção de lote é limitada, com I/O sequencial para limitar concorrência; cada POST envia uma mensagem. Novos workers podem disputar o lote, mas somente um obtém cada claim via update condicional no banco. Não existe fila dependente apenas da memória.

Estados: pending → claimed → sending → accepted → checking → provider_confirmed. Canceled/failed/unknown/receipt_unknown são terminais. Aceito significa ticket Expo; provider_confirmed significa receipt de encaminhamento para FCM/APNs. Nenhum desses estados comprova recebimento/leitura no aparelho.

Leases de 60 s. Claim interrompido volta a pending; envio interrompido passa a unknown, evitando repetir POST cujo resultado pode ter sido perdido; consulta interrompida volta a accepted e consulta apenas o receipt. Timeout HTTP de 15 s. Falhas explícitas 429/5xx e MessageRateExceeded têm backoff exponencial de 30 s até 1 h, máximo 5 envios. Resultado ambíguo não recebe reenvio automático. Receipts começam após 15 min, até 12 consultas/23 h; ausência final vira receipt_unknown. DeviceNotRegistered desativa somente a versão correspondente do token. Ticket aceito nunca é reenviado por falha de receipt.

Antes do envio, revalida propriedade, versão do aparelho, preferência, sessão não revogada/absolutamente expirada, tokenVersion e existência/autoria da denúncia. Logs JSON incluem apenas componente, IDs técnicos, estado e código de erro. NODE_ENV=test impede HTTP real no adaptador Expo; testes do worker usam provedor mockado.

## Mobile

Provider envolve a navegação dentro do AuthProvider. Seção Notificações em Conta reutiliza Surface/Button/tema e oferece ativar, desativar aparelho, desativar todos, atualizar e abrir configurações do sistema. Não condiciona o uso do app ao push. Sem projectId real/development build mantém o restante do app funcional e explica configuração pendente.

Permissão é solicitada somente ao ativar. Android cria canal reports antes do pedido; iOS aceita autorização provisória. Restauração/AppState ativo renovam vínculo existente sem pedir consentimento; listener nativo refaz getExpoPushTokenAsync, nunca grava token FCM/APNs como token Expo. Operações são serializadas, protegidas por conta/geração e canceladas logicamente após desmontagem. SDK carregado de forma tardia.

SecureStore guarda UUID de instalação e vínculo local separado por ambiente/API. Logout marca remoção persistente antes do DELETE e usa credencial anterior + versão; offline conserva a pendência, sem guardar essa credencial. Na próxima conta, vínculo anterior é transferido desativado e removido antes de ativação explícita. Atualização atrasada não pode apagar versão nova. Revogação da sessão bloqueia o worker independentemente do DELETE.

Toques em foreground/background usam listener; cold start usa última resposta. Aceita apenas type report_update + eventId UUID, deduplica e ignora denunciaId/URL do payload. Sem sessão, abre login; após autenticação resolve evento na API e abre ReportDetail existente, que busca dados atuais. 401 preserva intenção para autenticação; 403/404/rede exibem aviso sem abrir conteúdo alternativo. Login cancelado descarta intenção. Nenhuma nova tela de denúncia/detalhes.

## Arquivos modificados/adicionados

| Área | Arquivos |
| --- | --- |
| Backend integração | `backend/app.js`, `backend/models/rel.js`, `backend/package.json`, `backend/services/DenunciaService.js` |
| Backend push | `backend/controllers/NotificationController.js`, `backend/models/Notifications.js`, `backend/services/NotificationService.js`, migration citada, `backend/notifications/templates.js`, `ExpoPushProvider.js`, `worker.js`, `backend/scripts/processNotifications.js` |
| Backend testes | `backend/tests/integration/notifications.test.js`, `migrations-bootstrap.test.js`, `backend/tests/unit/denuncia.service.test.js` |
| Mobile integração | `mobile/App.tsx`, `app.config.js`, `package.json`, `package-lock.json`, `mobile/src/context/AuthContext.tsx`, `mobile/src/navigation/RootNavigator.tsx`, `mobile/src/screens/ProfileScreen.tsx` |
| Mobile push | `mobile/src/context/PushNotificationContext.tsx`, `mobile/src/components/NotificationSettings.tsx`, `mobile/src/services/notificationService.ts`, `pushStorage.ts` |
| Mobile testes | `mobile/tests/notifications.test.ts`, `pushStorage.test.ts`, `PushNotificationContext.test.tsx`, `navigation.test.tsx` |
| Documentação | Este relatório e `stage-5-risks.md` |

## Validação

- TypeScript mobile: `npm run typecheck`, aprovado.
- Jest mobile completo: 203 aprovados em 31 suítes; 2 testes de API real ignorados na suíte offline.
- Configuração mobile: 6 testes aprovados.
- Web: 93 testes aprovados em 24 suítes, sem alteração de arquivos frontend.
- Backend completo: 244 testes aprovados em 39 suítes. Após adicionar mais um teste de receipt/rotação, execução dirigida de push + bootstrap: 19 aprovados em 2 suítes.
- Expo Doctor: 21/21 verificações aprovadas, com acesso à rede autorizado.
- Exportação development Hermes Android/iOS: bundles .hbc gerados em `.expo/stage-5-export` (artefatos ignorados).
- Verificação de whitespace com `git -c core.whitespace=cr-at-eol diff --check`, preservando CRLF preexistente.
- Após endurecer a validação do vínculo no SecureStore e a asserção de deduplicação de toques, TypeScript e testes dirigidos do provider/armazenamento foram repetidos.

Testes cobrem autenticação e autoria, token inválido, versão/idempotência/rotação, troca de conta, preferências, quatro eventos e no-op, rollback, deduplicação, concorrência, leases após reinício, falhas/retry/backoff, receipts, permissão negada/provisória, logout offline, leitura segura de payload, login/expiração e denúncia removida/de outra conta. Não houve envio real.

## Operação externa pendente (não executada)

1. Revisar e aplicar migration em ambiente de homologação PostgreSQL antes de publicar API/worker; manter backup e procedimento de recuperação operacional aprovado.
2. Configurar EXPO_PROJECT_ID com UUID real do projeto autorizado no build; extra.eas.projectId é público. Não foi preenchido ID fictício. Configurar credenciais FCM v1/APNs no Expo/EAS, mantendo segredos fora do app/repositório.
3. Gerar novos development builds Android/iOS com o plugin expo-notifications; Expo Go Android não valida remote push. Exportação Hermes não equivale a build nativo.
4. Render: criar Background Worker com root backend, build `npm ci` e start `npm run notifications:worker`, mesma conexão de banco/ambiente da API e PUSH_DELIVERY_ENABLED=true. Alternativa: cron/runner confiável executando notifications:once, com frequência e lotes dimensionados ao backlog. Web service que dorme não garante execução contínua. Nenhuma configuração de produção foi alterada.
5. Se Enhanced Push Security estiver habilitada, fornecer EXPO_ACCESS_TOKEN somente ao worker. Não enviar esse segredo para extra/EAS public vars/mobile.
6. Monitorar backlog, failed/unknown/receipt_unknown e credenciais inválidas. Não reencaminhar unknown cegamente. Definir retenção e remoção segura de dispositivos inativos/trilha técnica com política aprovada.
7. Em aparelhos reais, testar permissões, foreground/background/cold start, logout online/offline, troca de conta, token rotacionado, sessão expirada, remoção/rejeição e perda de rede; comparar ticket/receipt com observação no aparelho. Validar VoiceOver/TalkBack, texto ampliado e alertas do sistema.

Não foram realizados build APK/IPA, testes físicos Android/iOS, teste de PostgreSQL/Render real, autenticação de credenciais ou entrega real via Expo/FCM/APNs. O sistema não está declarado pronto para produção. Riscos separados em `stage-5-risks.md`.

Commit local: `feat: add private transactional push notifications`. Hash definitivo disponível em `git log -1 --oneline -- mobile/delivery/stage-5-push.md` e no relatório da conversa.
