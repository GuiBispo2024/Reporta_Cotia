# Fechamento das sprints mobile

Sequência complementar na branch mrcatt, com commits locais e um roteiro por funcionalidade. Os dez roteiros anteriores permanecem em [entregas incrementais](../incremental/README.md). Nenhum push, deploy ou compartilhamento real foi realizado pelo agente.

| Entrega | Commit | Roteiro |
| --- | --- | --- |
| Foto do perfil | 71aa4a1 | [11 — Avatar](11-avatar/README.md) |
| Progresso e etapas de envio | da22a48 | [12 — Envio](12-progresso-envio/README.md) |
| Filtros e ordenação | 28ad954 | [13 — Filtros](13-filtros/README.md) |
| Mapa interno | cced2fd | [14 — Mapa](14-mapa/README.md) |
| Comentários e respostas | e413264 | [15 — Comentários](15-comentarios/README.md) |
| Curtir e descurtir | 1b82cb9 | [16 — Curtidas](16-curtidas/README.md) |
| Compatibilidade de build e correções SDK 57 | a126f30 | Complemento do roteiro 14 |
| Compartilhamento nativo e confirmação idempotente | Commit desta entrega | [17 — Compartilhamento](17-compartilhamento/README.md) |

Use git log --oneline -8 para consultar o hash da última entrega. Há oito commits porque a integração revelou um ajuste de configuração do mapa, registrado separadamente.

## Situação dos critérios de aceite

| Sprint | Implementação | Pendência para aceite final |
| --- | --- | --- |
| Autenticação e perfil | Cadastro, login, sessão renovável segura, edição dos dados, foto e logout | Validar sessão, câmera/galeria e perfil em Android real |
| Criação de denúncias | Formulário, GPS/endereço, imagens comprimidas, rascunho, progresso, validações e idempotência | Validar permissões, medição do upload e recuperação de falhas no aparelho |
| Consulta e interação | Listagem, filtros, detalhes, mapa interno, comentários automáticos ao abrir, respostas, curtidas e compartilhamento | Validar mapa e seletor nativo; configurar Google Maps para APK e gerar novo build |

As funcionalidades estão implementadas, mas as sprints devem permanecer em teste até registrar os resultados físicos. No Android, abrir/cancelar o seletor não altera o contador; somente Concluí o compartilhamento registra a ação autenticada. Essa confirmação é necessária porque a API Android não distingue o cancelamento. Não representa comprovação de entrega ao destinatário.

## Preparar e testar

1. Em backend, execute npm run db:migrate e reinicie a API. A migration 202610150001-add-share-request-id.js é necessária para a confirmação idempotente.
2. Em mobile, execute npm ci e npm run check. O projeto permanece no SDK 57, agora com as correções recomendadas (Expo 57.0.30).
3. Para testar pelo Expo Go SDK 57, execute npm run start:lan. App e computador devem estar na mesma rede; confirme o IP da API em .env.development.local. Reinicie o Metro após instalar as dependências novas.
4. Para APK/development build, gere uma nova instalação por causa de react-native-maps. Configure GOOGLE_MAPS_ANDROID_API_KEY no ambiente do build com restrições de package/SHA-1, conforme roteiro 14. A conta Expo/EAS e as credenciais Google ainda não foram fornecidas.
5. Siga os roteiros 11 a 17 e anote modelo Android, versão do sistema, resultado e falha observada. Use contas e denúncias de teste.

Não há site público no momento, conforme informado. O texto compartilhado contém título, endereço e protocolo. PUBLIC_WEB_URL é opcional e deve receber uma URL HTTPS real quando o site existir; nenhuma URL é inventada.

## Verificação automatizada

TypeScript, 6 testes de configuração e 78 testes Jest mobile. Backend: 208 testes. Dois testes de leitura contra API/PostgreSQL local. Confirmações simultâneas de compartilhamento verificadas no PostgreSQL com uma conta temporária própria, removida ao terminar. Expo Doctor 21/21, Prebuild Android e exportação Hermes Android/iOS.

O script backend/scripts/smokeShareRegistration.js permite repetir a verificação de concorrência somente em PostgreSQL local de desenvolvimento. O CI já executa os checks mobile existentes; a execução remota depende de enviar os commits ao GitHub. APK/IPA não foram compilados nem instalados fisicamente. Prebuild e bundles não substituem essa etapa.
