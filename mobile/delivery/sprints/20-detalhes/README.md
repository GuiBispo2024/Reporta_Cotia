# 20 — Detalhes mais visuais

O topo mostra título, protocolo, categoria e data. A situação fica em um card próprio, com etapas Enviada → Moderação → Atendimento → Resolvida e uma explicação do estado atual. As etapas representam o estado da denúncia e não um percentual ou prazo estimado.

Descrição, fotos e endereço/mapa possuem cards separados. Fotos maiores se adaptam à largura da tela e continuam abrindo em tela cheia. A linha do tempo mostra as três atualizações mais recentes; Ver histórico completo expande as demais sem nova chamada. Curtidas, compartilhamento e comentários continuam disponíveis nas denúncias aprovadas, com carregamento automático dos comentários ao abrir.

## Testar no Android

1. Abra denúncias pendente, rejeitada, aprovada aberta, em andamento e resolvida. Confira a situação, a orientação e as etapas sem confundir publicação com conclusão do atendimento.
2. Na rejeitada, confira motivo e setor. Apenas o autor com permissão deve receber Corrigir e reenviar. Corrija e volte: o estado deve ser recarregado.
3. Confira descrição longa, título extenso, setor ainda não definido e denúncia sem fotos. Não deve aparecer uma imagem ilustrativa como evidência.
4. Abra uma denúncia com várias fotos: deslize a galeria, amplie e feche. Confira também imagem indisponível e tentativa de recarga.
5. Confira endereço antes do mapa. Sem coordenadas, deve aparecer uma explicação; com coordenadas válidas, teste mapa interno e abertura no aplicativo de mapas.
6. Com mais de três registros, confira ordem do mais recente para o mais antigo, expansão e Mostrar menos atualizações. Se o histórico falhar, a situação e o motivo devem permanecer visíveis e Recarregar histórico deve funcionar.
7. Em uma aprovada, confira comentários, curtida e compartilhamento. Teste fonte grande, leitor de tela e rolagem em tela pequena.

Validação automatizada: TypeScript, 6 testes de configuração e 82 testes Jest mobile aprovados (2 testes de integração optativos não executados nesta entrega). Exportação de produção com Hermes aprovada para Android e iOS. Novos cenários verificam etapas, histórico compacto/expandido, ordenação e ausência de coordenadas. A conferência visual e a interação no Android físico permanecem pendentes.
