# Etapa 5 — Riscos e limites separados

## Privacidade

- Tokens Expo permanecem no banco e no SecureStore porque são necessários ao envio/rotação; não aparecem em respostas ou logs do módulo. Acesso ao banco, backups, transporte TLS e retenção exigem controles operacionais. Não foi implementada criptografia adicional de coluna nem alterada infraestrutura.
- Payload contém somente textos genéricos, tipo e UUID do evento; ainda permite inferir que existe uma atualização de denúncia. Banner do sistema e dispositivo compartilhado precisam ser considerados pelo usuário. Detalhes exigem autenticação e autoria consultadas na API.
- Logout sem rede não consegue revogar imediatamente a associação remota: persiste remoção local, oculta notificações foreground e tenta DELETE com a credencial antiga; sessão revogada ou expirada bloqueia novos envios. Próximo login limpa/transfere a instalação desativada. Notificações já aceitas/em trânsito não podem ser retiradas do FCM/APNs ou do sistema remotamente. TTL solicitado de 15 minutos limita retenção no provedor, sem promessa de revogação instantânea.
- Worker respeita revogação, tokenVersion e expiração absoluta da sessão; não renova sessão e não usa o idle timeout de 15 min como revogação de push. Após expiração absoluta (8 h no contrato atual), aparelho precisa autenticar/renovar vínculo; tocar sempre passa pela autenticação normal. Esse limite reduz alertas de longa duração e deve ser avaliado antes de produção, sem ampliar sessões automaticamente nesta etapa.
- Corrida entre a última verificação e um POST já iniciado é inerente ao envio externo. Opt-out cancela pendentes e bloqueia envios posteriores; não cancela tráfego já aceito. Troca de conta nunca abre evento antigo na nova conta.

## Confiabilidade e infraestrutura

- Não há exactly-once ponta a ponta no Expo. Claims/versionamento reduzem duplicação local; resposta perdida fica unknown para evitar repetição potencial. Essa escolha pode perder uma notificação cuja tentativa não chegou ao Expo. Exige monitoramento/reconciliação operacional; o acompanhamento na lista/detalhes permanece fonte de verdade.
- Receipt ok confirma encaminhamento a FCM/APNs, não entrega física ou leitura. Ausência de receipt é estado desconhecido, não sucesso.
- Processamento usa lotes limitados e HTTP sequencial por consumidor; não foi realizado benchmark de escala. Outros consumidores podem operar por claims atômicos. PostgreSQL, falhas de processo reais, plano Render, frequência do scheduler e backlog precisam de validação de homologação.
- Tabelas de eventos/entregas não têm poda automática; remoção por conta/denúncia já está associada, mas retenção temporal precisa de política. Pruning existente de AuthSessions elimina dispositivos da sessão; isso exige novo vínculo após autenticação, sem replay de eventos antigos para instalação nova.
- SDK/plugin exige novo binário; API/worker/migration precisam ser disponibilizados coordenadamente. Nenhuma credencial, serviço remoto ou configuração de produção foi alterado.

## Dependências e validação

- Instalação do pacote compatível notificou 13 vulnerabilidades no grafo mobile (9 low, 3 moderate, 1 high). Não foi executado upgrade automático/audit fix nem atribuída causalidade ao módulo novo; triagem de advisories fica separada do escopo. Somente expo-notifications e dependências necessárias entraram no lockfile.
- Mocks, TypeScript, Doctor e exportação Hermes não validam FCM/APNs, entitlements, credenciais, comportamento em aparelho ou entrega real. Nenhuma afirmação de prontidão para produção ou teste físico aprovado.
- Riscos anteriores de conteúdo publicado, localização generalizada, imagens e infraestrutura continuam registrados nos relatórios anteriores; não foram ampliados os contratos públicos nesta etapa.
