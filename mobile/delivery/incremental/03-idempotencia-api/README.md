# Etapa 3 — backend

Na pasta backend: `npm run db:migrate` e reinicie a API. `npm test -- --runInBand` verifica repetição, conflito de conteúdo, isolamento por autor e rollback. `node scripts/smokeReportSubmissions.js` verifica concorrência no PostgreSQL local de desenvolvimento usando uma conta temporária removida ao terminar.

POST /denuncia aceita o header opcional Idempotency-Key (UUID v4). Repetir chave e conteúdo retorna o mesmo protocolo; mudar conteúdo retorna 409. GET /denuncia/submissions/:key consulta o comprovante somente para o autor autenticado. Clientes existentes podem continuar enviando sem a chave. Os comprovantes persistem até a exclusão da conta; remover a denúncia não permite recriá-la com a mesma chave. A fila usa bloqueio da conta no banco durante o upload para impedir duplicações entre instâncias da API.

[Voltar ao índice](../README.md)
