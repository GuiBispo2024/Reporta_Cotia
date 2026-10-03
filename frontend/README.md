# Frontend — preparação mobile

O frontend React continua atendendo desktop e celular com a mesma API. Esta etapa
adiciona navegação inferior abaixo de 768 px para usuários conectados, controles
de toque, áreas seguras da tela, menu recolhível controlado pelo React e metadados
de instalação. Os ícones PNG são derivados de `frontend/public/reporta-cotia-logo.svg`.

No celular, o menu superior “Mais” reúne Indicadores, Comunidade, Moderação
(conforme permissão), Configurações e Sair. Início, Denunciar, Minhas denúncias e
Perfil ficam na barra inferior, sem repetição no menu superior. O menu abre sobre
o conteúdo, fecha ao navegar ou tocar fora e aceita Escape com retorno do foco.
O botão flutuante de denúncia é ocultado onde a barra inferior já oferece a ação.

Os gráficos e boards comunitários usam uma coluna no celular. A tabela mensal
tem rolagem própria, foco por teclado e orientação de uso, sem alargar a página.
O painel de compartilhamento fica limitado à tela e acima da navegação inferior.

O formulário destaca o GPS e mantém as coordenadas em uma seção opcional. A busca
tem limites de espera e mantém o endereço manual disponível se o GPS falhar.
O seletor de imagens indica os formatos aceitos pela API; não converte HEIC.

## Validação no navegador e no aparelho

1. Execute o frontend com `cd frontend` e `npm start`, com a API configurada.
2. Use o modo dispositivo do navegador em larguras de 320, 360, 390 e 768 px,
   além do desktop em 1280 px. Confira rolagem, zoom, foco e abertura do teclado.
3. Em homologação HTTPS, teste Android/Chrome e iPhone/Safari: entrar, abrir e
   fechar o menu, usar os atalhos, preencher uma denúncia, escolher fotos,
   permitir/negar GPS, enviar e consultar o andamento. Use dados fictícios.
4. Confira que a barra inferior e o botão de acessibilidade não cobrem o fim do
   conteúdo. Teste texto ampliado, alto contraste, modo escuro e orientação horizontal.
   Nos indicadores, inclua uma série com muitos meses, nomes longos e o board
   comunitário; a rolagem horizontal deve ficar somente dentro da tabela mensal.
5. Inspecione o manifest e os ícones no painel Application do navegador e teste
   adicionar à tela inicial conforme o suporte de cada navegador.

Para acesso pelo IP da máquina, configure a URL da API acessível pelo celular e
autorize a origem do frontend em `CORS_ORIGINS`. `localhost` no celular aponta
para o próprio aparelho. Prefira homologação HTTPS para validar geolocalização.

## Limites desta etapa

Não há service worker, envio offline, rascunhos persistentes, notificações push ou
projeto Android/iOS. A instalação depende do navegador; o manifest não oferece
funcionamento offline. Um futuro Capacitor poderá consumir o build web, com
configuração específica de origem, permissões e integração nativa.
