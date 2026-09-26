# Catálogo de indicadores — versão 1

Estado: implementação disponível; **validação dos responsáveis pendente**. Este documento não registra aprovação em nome da equipe.

## Regras comuns

- Unidade: uma denúncia, identificada por `Denuncia.id`; históricos não multiplicam a contagem.
- Fonte operacional: `Denuncia` e `DenunciaHistorico`. Fonte de consulta: `AnalyticsAggregates`, reconstruída pelo comando `npm run analytics:refresh`.
- Período: data de cadastro, em dias UTC, limites inclusivos. Mantém a semântica da API existente. O painel apresenta horários de atualização em America/Sao_Paulo.
- Filtros cumulativos: período, categoria, bairro e setor. Bairro representa a dimensão região nesta versão; não há cadastro de distritos ou associação bairro–distrito.
- Visão pública: sessão com `dashboard.public.view`, apenas denúncias aprovadas na carga. Visão restrita: `dashboard.full.view`, atribuída por padrão a ANALYST e ADMIN. Perfis são cumulativos e a autorização usa permissões no banco.
- Data de cadastro inválida/futura ou estados incompatíveis excluem a denúncia de todos os indicadores. Categoria ausente/desconhecida e bairro ausente não invalidam as demais dimensões: excluem somente suas respectivas distribuições. Por isso as somas por categoria/bairro podem ser menores que o total.
- `Outros` é uma categoria válida, não sinônimo de categoria ausente. Ausências não são preenchidas com dados inventados.
- Reprocessar substitui a carga integralmente. Alterações e exclusões da origem aparecem na próxima carga bem-sucedida.

| Indicador | Fórmula e unidade | Campos de origem | Acesso |
| --- | --- | --- | --- |
| Denúncias por categoria | Contagem das denúncias elegíveis com categoria reconhecida, agrupada pela categoria | `id`, `categoria`, `createdAt`, estados | Público (aprovadas) e restrito |
| Denúncias por bairro | Contagem das denúncias elegíveis com bairro informado, agrupada pelo nome normalizado | `id`, `bairro`, `createdAt`, estados | Público (aprovadas) e restrito |
| Denúncias por período | Contagem por mês de cadastro; gráfico mostra os últimos 12 meses com registros no recorte | `id`, `createdAt`, estados | Público (aprovadas) e restrito |
| Status de moderação | Contagem por pendente, aprovada e rejeitada | `id`, `status`, `resolucaoStatus`, `createdAt` | Distribuição completa restrita; público recebe somente aprovadas |
| Status de resolução | Contagem de aprovadas por aberta, em andamento e resolvida | `id`, `status`, `resolucaoStatus`, `createdAt` | Público e restrito |
| Tempo médio de moderação | Soma das horas entre cadastro e primeira decisão aprovada/rejeitada ÷ quantidade de denúncias com intervalo válido | `Denuncia.createdAt`; histórico `tipo=moderacao`, `statusNovo`, `createdAt` | Público (aprovadas) e restrito |
| Tempo médio de resolução | Soma das horas entre primeira aprovação e primeira resolução ÷ quantidade de denúncias com intervalo válido | Histórico `tipo=moderacao/statusNovo=aprovada` e `tipo=resolucao/statusNovo=resolvida` | Público (aprovadas) e restrito |
| Percentual de resolução | 100 × aprovadas atualmente resolvidas ÷ total de aprovadas elegíveis | `status`, `resolucaoStatus`, `createdAt` | Público e restrito |

Médias são ponderadas pelo número de denúncias, nunca médias de médias. Valores em horas com uma casa decimal; percentual arredondado ao inteiro. Sem amostra, médias são `null` e tamanho de amostra zero. Sem aprovadas, taxa zero, com denominador disponível em `summary.approved`.

Múltiplas decisões/reaberturas não criam novas unidades: mede-se a primeira decisão e o primeiro ciclo de aprovação–resolução. Uma resolução anterior à primeira aprovação, um evento anterior ao cadastro ou um evento futuro/inválido exclui o histórico das duas médias e gera inconsistência. A contagem por estado continua representando o estado atual. Histórico ausente não é reconstruído a partir de `updatedAt`.

## Qualidade e normalização

- Categoria: reconhecida pelo catálogo de `validateDenuncia`, ignorando caixa, acentos e espaços repetidos; armazenada com o nome canônico.
- Bairro: aparar/colapsar espaços, ignorar caixa/acentos e expandir os prefixos `Jd.`/`Jd` para Jardim e `Vl.`/`Vl` para Vila. Não usar correspondência aproximada nem juntar nomes diferentes sem regra explícita. O nome operacional original é preservado.
- Legados sem campo bairro: recuperar somente do formato `rua - bairro - Cotia - São Paulo/SP` salvo pelo formulário antigo. A recuperação fica identificada no relatório de qualidade e é usada também nos cartões/mapas/exportação. Não deduzir bairro de coordenadas ou de nomes desenhados no mapa; outros formatos continuam ausentes.
- Endereço incompleto: bairro ausente ou menos de dois segmentos não vazios separados por vírgula em `localizacao`. É uma heurística de preenchimento do texto livre, não validação postal. Um endereço incompleto não invalida um bairro conhecido nem indicadores sem dimensão geográfica.
- Categorias/bairros ausentes, estados inválidos, datas inconsistentes e históricos necessários ausentes são sinalizados automaticamente. O relatório conta denúncias com problemas uma vez e cada regra separadamente.
- Problemas em datas de cadastro aparecem no relatório sem filtro de período, pois não possuem dia válido para atribuição.
- O relatório detalhado é restrito e retorna somente ID da denúncia, códigos e elegibilidade. Não copia endereço, título, descrição, autor, coordenadas ou motivo livre do histórico.

## Aceite dos responsáveis

Confirmar as fórmulas, acesso às médias públicas, UTC nos filtros, bairro como região, primeiro ciclo para os tempos e a heurística de endereço. Registrar responsável, data e decisão no Jira; atualizar este catálogo caso a decisão altere as regras.
