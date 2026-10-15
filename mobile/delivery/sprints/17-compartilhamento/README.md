# 17 — Compartilhamento nativo

Antes de usar, execute npm run db:migrate no backend e reinicie a API. A migration 202610150001-add-share-request-id.js mantém compatibilidade com clientes web e adiciona unicidade por conta/identificador para repetições mobile. Não há mudança automática de contador ao abrir o seletor de compartilhamento.

Como ainda não há site público, compartilha-se título, endereço e protocolo. Futuramente, configure PUBLIC_WEB_URL como uma origem HTTPS real no ambiente do app para incluir /denuncia/:id. Não há domínio fictício nem link local nos compartilhamentos.

## Android

Abra Compartilhar denúncia, feche o seletor e escolha Não compartilhei: nenhum registro deve ser enviado nem o contador alterado. Compartilhe com outro aplicativo e toque Concluí o compartilhamento para registrar. A API nativa do Android retorna sharedAction mesmo no cancelamento; por isso o registro exige essa confirmação explícita. O app não afirma detectar entrega ao destinatário. Referência: https://reactnative.dev/docs/0.86/share.

## iOS e falhas

No iOS, dismissedAction não registra compartilhamento; sharedAction registra para usuários autenticados. Visitantes podem compartilhar o conteúdo, mas não alteram contador. Corte a rede ao registrar: Confirmar registro pendente repete o mesmo identificador e não reabre o seletor nativo. O backend retorna o mesmo registro sem duplicá-lo. Essa chave vive na tela; ao sair/reabrir, o contador é consultado novamente e não há reenvio automático. Um novo compartilhamento explícito é uma nova ação.

Teste cancelar, compartilhar, falhar, repetir e trocar conta em Android real. Até a instalação e conferência física, esse critério permanece em validação. Nenhum compartilhamento real foi enviado pelos testes automatizados.
