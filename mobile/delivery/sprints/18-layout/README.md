# 18 — Identidade visual da Web no mobile

## O que mudou

Logo original de frontend/public/icon-192.png no cabeçalho. Paleta e hierarquia baseadas em frontend/src/index.css: verde #176b4d, verde escuro #0f4f39, dourado #e6b84a, fundo claro e superfícies brancas. Cabeçalhos em gradiente, botão de nova denúncia dourado, ações principais verdes, ações secundárias suaves e exclusões em vermelho.

Os ícones são os SVGs oficiais do Bootstrap Icons, a mesma família usada pela Web, renderizados com react-native-svg. Somente os desenhos selecionados entram no bundle; não há fonte de ícones nem download de ícones durante o uso. A licença MIT está em mobile/assets/brand/BOOTSTRAP-ICONS-LICENSE.txt. Abas, campos, câmera/galeria, curtidas, compartilhamento e navegação usam essa família.

Cards possuem foto ou a mesma ilustração padrão da Web, categoria, situação, título, descrição, endereço, setor e acesso aos detalhes. Imagem ilustrativa é identificada no próprio desenho; não é apresentada como evidência. Imagens indisponíveis usam a ilustração sem bloquear o acesso aos dados. Login, perfil, criação, recuperação de senha e detalhes usam cabeçalhos e painéis consistentes.

A composição foi adaptada para uma coluna e abas inferiores; os tamanhos mínimos de toque e a escala de fonte do sistema foram mantidos. A tipografia usa fontes nativas, com pesos e tamanhos próximos à Web; não há dependência da fonte Inter remota.

## Testar

1. Execute npm ci em mobile e reinicie o Metro com npm run start:lan -- --clear. Abra o projeto no Expo Go compatível com SDK 57.
2. Confira a logo e os ícones nas abas, Início, Minhas, Conta e ações. Os ícones devem aparecer já sem conexão, pois estão no bundle.
3. Na lista, confira denúncia com foto, sem foto e com URL de imagem indisponível. Toque no card e confira os detalhes, mapa, comentários, curtidas e compartilhamento.
4. Confira login, cadastro, recuperação de senha, foto do perfil, edição da conta e formulário de denúncia. Os rótulos e as validações devem permanecer disponíveis.
5. Teste Android com fonte grande e leitor de tela. Verifique rolagem, teclado, títulos longos, nomes grandes de categoria e situação. Ícones decorativos não devem duplicar a leitura dos rótulos. Confirme contraste dos avisos e visibilidade dos botões.

Foram adicionados react-native-svg e expo-linear-gradient, compatíveis com o SDK 57. Um development build existente precisa ser recriado para incluir as dependências nativas. A conferência visual em Android real permanece pendente; testes Jest, Doctor, Prebuild e exportação não comprovam o layout físico.

## Manter os assets alinhados

Execute npm run assets:sync em mobile após mudar a logo da Web ou as ilustrações em backend/imagens_padrao. O script gera os módulos de SVG e copia a logo e a licença. bootstrap-icons é dependência de desenvolvimento; o app não importa o pacote completo em runtime.
