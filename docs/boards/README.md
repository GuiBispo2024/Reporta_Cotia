# Boards — primeira versão

Implementação incremental na branch `feat/boards`. Nesta versão, o board acompanha as denúncias; mudanças de status continuam nos fluxos de moderação existentes.

## API

- `GET /boards/mine`: requer sessão; consulta apenas denúncias do usuário autenticado.
- `GET /boards/analytics`: requer `dashboard.full.view`; consulta todas as denúncias e distribuições por categoria e setor.

Parâmetros opcionais: `categoria`, `setorResponsavel`, `column`, `page` (a partir de 1) e `limit` (1–50, padrão 8). A paginação é independente por coluna. Sem `column`, todas as colunas são retornadas; com `column`, apenas a coluna solicitada é carregada. Os indicadores sempre consideram o conjunto filtrado completo.

Colunas: `pendente` (em moderação), `aberta`, `em_andamento`, `resolvida` e `rejeitada`. As três colunas de andamento incluem somente denúncias aprovadas. A taxa de resolução divide as resolvidas pelas aprovadas, sem incluir pendentes e rejeitadas.

Os registros incluem título, descrição, localização, categoria, setor, estados, datas e motivo da rejeição. Textos originais de censura, credenciais e dados pessoais do autor não são retornados. O ID de usuário informado na URL não altera o escopo pessoal.

## Etapas

1. API, validação, isolamento dos dados e testes de integração.
2. Board pessoal com indicadores, colunas, paginação e detalhes.
3. Board analítico com filtros e distribuições, respeitando a permissão existente.
