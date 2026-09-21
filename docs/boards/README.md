# Boards — primeira versão

Implementação incremental na branch `feat/boards`. Nesta versão, o board acompanha as denúncias; mudanças de status continuam nos fluxos de moderação existentes.

## API

- `GET /boards/mine`: requer sessão; consulta apenas denúncias do usuário autenticado.
- `GET /boards/public`: requer `dashboard.public.view`; apresenta somente denúncias aprovadas e indicadores comunitários por categoria, setor, bairro e localização.
- `GET /boards/analytics`: requer `dashboard.full.view`; consulta todas as denúncias e distribuições por categoria, setor e bairro.
- `GET /boards/analytics/export`: requer `dashboard.full.view` e `dashboard.export`; exporta em XLSX os registros do recorte analítico, respeitando categoria, setor, bairro e período.

Parâmetros opcionais: `categoria`, `setorResponsavel`, `bairro`, `dataInicio`, `dataFim`, `column`, `page` (a partir de 1) e `limit` (1–50, padrão 8). As datas usam o formato `AAAA-MM-DD`, são inclusivas e filtram pela data de cadastro da denúncia. A paginação é independente por coluna. Sem `column`, todas as colunas são retornadas; com `column`, apenas a coluna solicitada é carregada. Os indicadores sempre consideram o conjunto filtrado completo.

Colunas: `pendente` (em moderação), `aberta`, `em_andamento`, `resolvida` e `rejeitada`. As três colunas de andamento incluem somente denúncias aprovadas. A taxa de resolução divide as resolvidas pelas aprovadas, sem incluir pendentes e rejeitadas.

Os registros incluem título, descrição, localização, bairro, categoria, setor, estados, datas e motivo da rejeição. Denúncias antigas sem bairro permanecem disponíveis e são agrupadas como “Não informado”. Textos originais de censura, credenciais e dados pessoais do autor não são retornados. O ID de usuário informado na URL não altera o escopo pessoal.

As visões comunitária e analítica incluem `map.points` com até 500 denúncias que possuem coordenadas, além de `total`, `limit` e `truncated`. Os pontos respeitam os filtros ativos; no board comunitário, o conjunto geográfico contém exclusivamente denúncias aprovadas. O board pessoal não recebe esse conjunto adicional.

As mesmas visões incluem `metrics`, com o tempo médio em horas até a primeira decisão de moderação e entre a aprovação e a resolução. Cada média informa também o tamanho da amostra e considera somente denúncias com o histórico necessário para o cálculo. Os filtros ativos são respeitados.

O campo `trend` apresenta a quantidade mensal de denúncias nos últimos 12 meses que possuem registros no recorte consultado. A interface combina essa evolução com gráficos de situação, categorias mais recorrentes e bairros com mais denúncias.

Cada resposta do board inclui `generatedAt`, e a interface apresenta essa data como a última atualização dos indicadores. O horário é renovado quando a página abre, quando os filtros são aplicados ou quando o usuário solicita uma atualização.

## Etapas

1. API, validação, isolamento dos dados e testes de integração.
2. Board pessoal com indicadores, colunas, paginação e detalhes.
3. Board analítico com filtros por categoria, setor, bairro e período, além de distribuições que respeitam a permissão existente.
4. API do board comunitário, limitada a dados aprovados e preparada para visualização geográfica.
5. Mapa das denúncias com coordenadas nas visões comunitária e analítica.

## Interface

- `/meu-board`: board pessoal, também acessível em “Minhas denúncias” e na aba “Boards” do navbar.
- `/boards/comunidade`: visão das denúncias aprovadas para cidadãos, com filtros e distribuições por categoria, setor, bairro e localização.
- `/boards/analitico`: destino da aba “Boards” para analistas e demais contas com `dashboard.full.view`. A visão analítica também oferece acesso ao board pessoal.
- Detalhes em janela navegável por teclado; no board analítico, registros privados são consultados nessa janela. O link público é oferecido somente para denúncias aprovadas.
- Filtros por categoria, setor, bairro e período, contagens por situação e distribuições por categoria, setor, bairro e localização. Cada coluna tem “Carregar mais” e informa quantos registros estão visíveis.
- A aba “Boards” leva cidadãos ao board comunitário e contas com `dashboard.full.view` ao board analítico.
- Contas com `dashboard.export` podem baixar uma planilha XLSX do board analítico. O arquivo utiliza os filtros aplicados, inclui o bairro, preserva acentos, dimensiona as colunas, fixa o cabeçalho, oferece autofiltro e apresenta datas no horário de Cotia. Campos privados de revisão de censura não são incluídos.
- As visões comunitária e analítica exibem os registros com coordenadas sobre um mapa do OpenStreetMap. Marcadores aprovados levam ao detalhe público; registros privados do board analítico não geram links públicos.
- No celular e com texto ampliado, as colunas são empilhadas. Os boards usam os temas e recursos globais de acessibilidade.

As cinco etapas acima e a exportação analítica estão implementadas. Não há arraste de cartões nem edição de status nesta primeira versão.
