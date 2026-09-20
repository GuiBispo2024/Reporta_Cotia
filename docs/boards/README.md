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

## Interface

- `/meu-board`: board pessoal, também acessível em “Minhas denúncias” e na aba “Boards” do navbar.
- `/boards/analitico`: destino da aba “Boards” para analistas e demais contas com `dashboard.full.view`. A visão analítica também oferece acesso ao board pessoal.
- Detalhes em janela navegável por teclado; no board analítico, registros privados são consultados nessa janela. O link público é oferecido somente para denúncias aprovadas.
- Filtros analíticos por categoria e setor, contagens por situação e distribuições por categoria e setor. Cada coluna tem “Carregar mais” e informa quantos registros estão visíveis.
- No celular e com texto ampliado, as colunas são empilhadas. Os boards usam os temas e recursos globais de acessibilidade.

As três etapas acima estão implementadas. Exportação, filtros por período e métricas de tempo de atendimento ficam para incrementos futuros; não há arraste de cartões nem edição de status nesta primeira versão.
