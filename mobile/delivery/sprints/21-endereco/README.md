# 21 — Endereço sem número residencial

A lista pública, Minhas denúncias, os detalhes, o texto do marcador do mapa e a mensagem de compartilhamento passam pelo mesmo formatador. Exemplo: Rua das Flores, 123, Cotia → Rua das Flores, Cotia. Endereços já salvos também recebem o tratamento ao serem exibidos.

O preenchimento automático por GPS usa rua e cidade, sem adicionar streetNumber. A apresentação reconhece números separados por vírgula ou hífen, indicadores como nº/número, sufixos e complementos separados. Mantém nomes como Rua 13, Rua 25 de Março, Jardim 25 e referência de quilômetro.

Esse tratamento é específico do campo de endereço no mobile. Não migra dados antigos nem altera a Web; o autor ainda pode revisar o endereço original no formulário de edição. Não anonimiza coordenadas do mapa, fotos ou texto livre de título/descrição. Como endereços antigos são texto livre, formatos diferentes dos reconhecidos devem ser incorporados ao formatador e aos testes quando identificados.

## Testar no Android

1. Abra uma denúncia existente com endereço Rua das Flores, 123, Cotia. Confira Início, Minhas e Detalhes: o endereço deve aparecer sem 123.
2. Toque no marcador do mapa e abra o compartilhamento: o endereço textual também deve estar sem o número. Cancele o compartilhamento após conferir.
3. Confira Rua 13 e Rua 25 de Março: números do nome da via devem permanecer.
4. Em Nova denúncia, use minha localização e confira que o endereço preenchido não inclui o número residencial. As coordenadas continuam apontando para a localização capturada.

Validação: TypeScript, testes de configuração e suíte Jest mobile. Novos casos cobrem formatos de endereço, nomes numéricos de vias/bairros, GPS e compartilhamento; os testes de detalhes e mapa também usam endereço com número para verificar a remoção. Teste físico pendente.
