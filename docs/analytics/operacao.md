# Modelo e operação analítica

## Modelo

`AnalyticsFacts`: um registro por denúncia da última carga; PK `denunciaId` preserva rastreabilidade sem copiar dados pessoais. Contém dimensões de dia, categoria, bairro, setor e estados; elegibilidade, códigos de qualidade e durações. O vínculo é lógico: exclusões operacionais serão refletidas atomicamente na próxima carga, sem modificar um snapshot já publicado.

`AnalyticsAggregates`: cubo diário por combinação dessas dimensões. Chave SHA-256 da tupla, contagens, somas e tamanhos de amostra, além de contagens de problemas de qualidade. Essas medidas aditivas permitem novos recortes e médias ponderadas. Dimensões são degeneradas (colunas do fato/cubo); tabelas de dimensão independentes não são necessárias para o catálogo atual. Acrescentar uma dimensão/medida exige migration, cálculo e atualização do catálogo.

`AnalyticsRuns`: auditoria das execuções (`running`, `success`, `failed`), início/fim, contagens e código sanitizado de falha. `AnalyticsStates`: ponteiro singleton para a carga publicada. Nenhum endpoint expõe mensagens de erro de SQL ou conteúdo original.

Migration `202609260001-create-analytics` cria as quatro tabelas e índices de run/período/categoria/bairro/status e paginação da qualidade; rollback remove somente essas estruturas.

## Processamento e publicação

1. Aplicar `cd backend` e `npm run db:migrate` no ambiente de destino.
2. Executar `npm run analytics:refresh` para a primeira carga.
3. Configurar o agendador do ambiente para executar o mesmo comando, por exemplo a cada hora. Usar o mesmo banco e variáveis da API. Agendamento externo não é criado automaticamente pelo código.
4. Conferir o código de saída (0 sucesso, 1 falha), `AnalyticsRuns` e `/boards/analytics/quality`. Monitorar falhas e atraso de `lastUpdatedAt`.

Não se processa ao abrir o painel nem ao clicar em Atualizar. Esse botão relê a última carga. Não há endpoint HTTP que permita a um visitante iniciar a carga.

A carga lê denúncias por chave crescente em lotes de 500, com históricos do lote, em transação REPEATABLE READ no PostgreSQL. Um advisory lock transacional impede duas cargas concorrentes entre processos; um bloqueio em memória protege chamadas locais. Uma execução concorrente falha com `ANALYTICS_BUSY`. As tabelas analíticas são substituídas e o ponteiro é publicado na mesma transação. Falhas revertem todas as mudanças e são registradas fora da transação. Reexecutar não acumula contagens, inclui edições/exclusões e permite recuperar uma falha.

Leituras analíticas usam transação REPEATABLE READ para não misturar versões durante a publicação. Sem primeira carga retornam `status=not_processed`, indicadores vazios e `lastUpdatedAt=null`; nunca usam silenciosamente as tabelas operacionais como fallback.

Consultas de indicadores não leem denúncias/históricos. A carga ainda consome recursos do PostgreSQL operacional; agendar fora do pico e medir duração com volume real. Os lotes limitam registros carregados por vez, mas as combinações do cubo são acumuladas em memória. Se volume/cardinalidade crescer, migrar para staging/agregação SQL ou réplica de leitura. Não há promessa de impacto zero nem infraestrutura de data warehouse separada nesta entrega.

Uma interrupção abrupta do processo pode deixar uma execução `running` na auditoria; a transação é revertida e o lock é liberado pelo banco. Conferir o processo/agendador antes de classificar essa execução como interrompida e executar novamente.

## API e painel

- `GET /boards/analytics/indicators`: `dashboard.full.view`; indicadores e resumo de qualidade.
- `GET /boards/public/indicators`: `dashboard.public.view`; somente aprovadas, sem relatório de qualidade.
- `GET /boards/analytics/quality`: `dashboard.full.view`; relatório paginado, resumo por regra e último processamento (inclusive falha).
- Filtros dos três: `categoria`, `bairro`, `setorResponsavel`, `dataInicio`, `dataFim`. Qualidade aceita `page` (1–1000000) e `limit` (1–100, padrão 20). Parâmetros repetidos/arrays e datas inválidas retornam 400. Contratos no Swagger `/api-docs`.
- `generatedAt`: hora da resposta; `lastUpdatedAt`: publicação da última carga bem-sucedida; `dataAsOf`: início da captura. São conceitos distintos.
- Os boards comunitário e analítico usam esses mesmos cálculos persistidos para resumo, distribuições, tempos, evolução e comparação. O pessoal permanece operacional.
- Cartões, mapas, exportação XLSX e seção de operação da moderação continuam consultando registros atuais, sujeitos a alterações posteriores à carga e sem excluir registros por qualidade. O painel informa essa diferença. Não usar a exportação operacional como extrato exato do cubo.
- Nesses recursos, o filtro de bairro resolve os IDs pertencentes ao bairro normalizado na última carga. Isso permite selecionar `Jardim Sao Jose` e encontrar originais como `Jd. São José`; novos cadastros/mudanças de bairro entram nesse recorte após reprocessar. Outros filtros e os estados dos cartões continuam operacionais.
- Indicadores não incluem endereços nem textos livres das denúncias/históricos. Distribuição por localização textual foi removida; permanecem bairro e setor. Mapas e detalhes mantêm os contratos próprios existentes.

## Roteiro de teste para o Jira

1. Aprovar catálogo: conferir oito fórmulas, fontes e acessos em `catalogo.md`.
2. Aplicar migration em banco de homologação e consultar antes da primeira carga: estado aguardando processamento, sem falso horário de atualização.
3. Criar denúncias e históricos conhecidos; executar carga duas vezes. Totais e médias devem permanecer iguais, sem duplicação.
4. Alterar categoria/status e excluir denúncia permitida; executar novamente e conferir reconciliação com a origem.
5. Testar dados legados com categoria ausente, bairro `jd. teste`/`Jardim Teste`, endereço incompleto, data futura e resolução antes da aprovação. Conferir normalização, códigos, exclusões por indicador e médias sem valores negativos.
6. Aplicar filtros isolados/combinados e comparação com período anterior. Cidadão não acessa indicadores restritos/qualidade; analista e administrador com permissões acessam. Público só conta aprovadas.
7. Simular falha da carga em ambiente de teste: último snapshot e horário devem permanecer; auditoria deve indicar falha. Executar novamente com sucesso.
8. Conferir painel em desktop/celular, relatório resumido de qualidade, estado vazio e horário estável ao clicar Atualizar sem executar nova carga.

Aceite em homologação e configuração do agendador são etapas do ambiente de destino, não comprovadas apenas pelos testes locais.

## Verificação automatizada

`npm test -- --runInBand` no backend executa testes de qualidade, rotas, carga idempotente, rollback, reconciliação e processamento em lotes usando SQLite em memória. No frontend: `npm test -- --watchAll=false --runInBand` e `npm run build`.

Para verificar PostgreSQL real, criar um banco **descartável** chamado `reporta_cotia_analytics_test` em `127.0.0.1`, definir `ANALYTICS_PG_TEST_URL` com essa conexão e executar `node tests/postgres/analytics.check.js` no backend. O teste recria as tabelas desse banco e recusa qualquer outro nome/host. Verifica migration/up/down, índices, métricas, bloqueio entre processos, rollback, isolamento de leitura e reexecução. Nunca apontar esse teste para dados a preservar.
