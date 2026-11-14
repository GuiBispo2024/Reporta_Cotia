# Etapa 2 — Navegação e experiência mobile

Entrega em 14/11/2026, branch `mrcatt`, baseada no commit da Etapa 1 `40e1119`. A árvore estava limpa ao iniciar. Somente a Etapa 2 foi executada. Sem push, merge, deploy, credenciais fictícias ou alteração de ambientes/produção. Não houve mudança de implementação backend, contrato público ou migration; a única alteração em `backend/` é um teste de integração.

## Navegação implementada

- **Início:** mantém `ReportsScreen`, o mesmo feed público e serviços existentes.
- **Denunciar:** ação destacada com a cor de destaque do tema, área mínima de 52 pontos e rótulo acessível. Intercepta o toque na aba e abre `CreateReportScreen` no stack existente. Nenhum segundo formulário ou feed foi criado; o componente sem conteúdo registrado na aba nunca é selecionado pelo toque.
- **Minhas:** reutiliza `ReportsScreen` com o escopo próprio, apenas quando autenticado. Visitantes não têm essa rota na barra. A própria tela também evita qualquer consulta caso receba o escopo privado sem sessão.
- **Conta:** mantém `ProfileScreen` e as telas existentes de gerenciamento/segurança.

Autenticados têm quatro destinos; visitantes têm três, sem Minhas. Para visitantes, Denunciar abre Login; após autenticar, abre o formulário existente sobre Início. A intenção existe somente em memória: voltar às abas cancela o encaminhamento, e reabrir o aplicativo não reabre um formulário por uma intenção antiga. Registro/recuperação de senha dentro desse fluxo não publicam denúncias anonimamente.

Voltar do formulário preserva a aba anterior, incluindo Minhas ou Conta. O stack continua separado por identidade da conta: login, logout, expiração e troca de usuário descartam o histórico de navegação anterior. Durante a restauração, aparece apenas o indicador de sessão; telas privadas aguardam a validação do AuthProvider. A autenticação, SecureStore e regras de permissões não foram reimplementados.

## Formulários e consistência visual

- `Screen` substitui o deslocamento fixo de teclado por `HeaderHeightContext`, acompanhando a altura real do cabeçalho e safe areas do navegador. Mantém `padding` no iOS e o redimensionamento nativo no Android, sem aplicar uma segunda redução de altura. Arrastar dispensa o teclado; tocar nos botões continua funcionando com teclado aberto.
- A barra inferior se oculta enquanto o teclado está aberto. Botões mantêm altura mínima de 48 pontos e ganharam margem de toque. Nenhum tema novo foi criado.
- `Field` suporta ajuda contextual e erro associado ao campo, com borda e texto de erro, rótulo e hint acessíveis. Os campos obrigatórios da denúncia mostram mensagens específicas e limpam seu erro ao editar.
- Login usa autocomplete de e-mail/senha e envio pelo teclado. Login, denúncia e comentários dispensam o teclado ao enviar.
- A denúncia mostra carregamento do rascunho e mantém o progresso de envio existente. Descartar o rascunho continua exigindo confirmação; agora erros de disco são tratados sem limpar o formulário nem deixar uma rejeição de Promise sem tratamento. A remoção das fotos atuais em uma correção também exige confirmação antes de marcar a exclusão.
- A confirmação de denúncia usa os mesmos `Hero` e `Surface` das demais telas. Detalhes continuam usando seus cards, status e histórico existentes. Comentários/respostas têm recuo limitado sem acumular contêineres estreitos em cada nível, evitando comprimir o texto em conversas longas.
- A lista própria não cai no feed público quando falta sessão. Se uma atualização reduzir o número de páginas, a lista retorna à última página disponível, evitando deixar o usuário preso numa página vazia sem paginação.

## Edição de comentários e respostas perdidas

O mobile reutiliza `PUT /denuncia/comentario/:id`, enviando somente `{ comentario }`. Texto vazio ou com mais de 255 caracteres é rejeitado no cliente; a validação e a autorização do backend continuam prevalecendo. Não se envia userId, texto original censurado ou campos administrativos.

A ação de edição só aparece para o autor e funciona também nas respostas. A edição usa um campo próprio, com foco, contador, salvar/cancelar, bloqueio contra cliques repetidos e confirmação para descartar texto alterado. O rascunho de um novo comentário e seu contexto de resposta permanecem separados da edição.

- **PUT confirmado:** informa atualização e consulta a lista novamente para exibir o conteúdo autorizado/moderado retornado pelo servidor.
- **401/403/validação:** não declara sucesso; conserva o texto. A sessão expirada/revogada continua sendo tratada pelo cliente e pelo navegador existentes.
- **Rede, timeout ou 5xx:** conserva o texto e bloqueia novos envios/alterações até “Conferir edição”. Não há retry automático de PUT.
- **Consulta confirma o mesmo texto:** encerra a edição e informa confirmação sem repetir o PUT.
- **Consulta retorna texto diferente:** mostra a versão publicada na lista, preserva o texto editado e permite uma tentativa manual após a conferência. Isso também cobre a possibilidade de moderação do texto: divergência não é tratada como prova de falha.
- **Consulta falha ou não encontra o comentário na página:** preserva o editor e não confirma sucesso. O usuário pode consultar novamente ou cancelar com confirmação. O endpoint é paginado, sem busca individual por comentário; não se varre toda a conversa automaticamente. Um comentário deslocado para outra página pode exigir cancelar a edição e localizá-lo novamente.

O teste backend acrescentado confirma 401 sem sessão, 403 para outra conta sem modificar o texto e sucesso para o autor no endpoint já existente.

## Arquivos modificados

| Área | Arquivos |
| --- | --- |
| Navegação | `mobile/src/navigation/MainTabs.tsx`, `RootNavigator.tsx`, `types.ts` |
| Componentes | `mobile/src/components/Screen.tsx`, `Field.tsx`, `Button.tsx`, `ReportComments.tsx` |
| Telas | `mobile/src/screens/AccountScreen.tsx`, `CreateReportScreen.tsx`, `ReportsScreen.tsx` |
| Serviço | `mobile/src/services/commentService.ts` |
| Dependências | `mobile/package.json`, `mobile/package-lock.json` |
| Testes mobile | `mobile/tests/navigation.test.tsx`, `Screen.test.tsx`, `ReportComments.test.tsx`, `ReportsScreen.test.tsx`, `commentService.test.ts`, `flows.test.tsx` |
| Teste backend | `backend/tests/integration/social.routes.test.js` |
| Documentação | `mobile/README.md`, este relatório |

`@react-navigation/elements` 2.9.44 já estava instalado como dependência transitiva dos navegadores. Foi declarado diretamente para importar seu contexto público de altura do cabeçalho; o lockfile mantém as versões existentes. Atualização feita offline, sem instalar outro módulo nativo ou atualizar SDK/React Native. Nenhuma dependência foi atualizada de versão nesta etapa.

## Testes e resultados

| Comando | Resultado |
| --- | --- |
| `cd mobile; npm run check` | TypeScript sem erros; 6 testes de configuração e 126 testes Jest aprovados em 23 suítes; 2 testes reais de API ignorados na suíte offline |
| `cd mobile; npx expo-doctor` | 21/21 verificações aprovadas |
| `cd mobile; npm run export` | Bundles Hermes Android e iOS gerados em `mobile/dist`, ambiente development |
| `cd backend; npm test -- --runInBand --runTestsByPath tests/integration/social.routes.test.js tests/integration/session-security.test.js tests/integration/access-control.routes.test.js` | 37 testes aprovados em 3 suítes Supertest/SQLite em memória |
| `git diff --check` | Sem erros de whitespace |

Os testes de navegação usam os navegadores reais de tabs/native stack com conteúdos de tela simulados, não apenas mocks de `navigate`. Cobrem iOS/Android, visitante → login → formulário, retorno à aba anterior, abas privadas, cancelamento da intenção, restauração e remoção do stack após mudança do estado de sessão. Os testes reais de AuthProvider continuam na suíte completa: refresh concorrente, SecureStore, restauração, 401/403, logout e respostas tardias. Os testes de Screen verificam a altura de cabeçalho e política de teclado nas duas plataformas.

Uma execução intermediária excedeu o timeout de 5 segundos num teste que combinava rejeição 403, nova falha de rede e cancelamento. Os cenários foram separados e a suíte completa foi repetida com os mesmos limites de tempo, passando integralmente. Não foram aumentados timeouts nem ignorados testes para encobrir falhas.

Não foram executados testes físicos, compilação nativa APK/AAB/IPA ou testes PostgreSQL/API remota nesta etapa. Os bundles e mocks de plataforma não comprovam instalação, animação nativa, teclado real, câmera, GPS ou acessibilidade em aparelho. A suíte web não foi repetida: seus arquivos e os handlers backend não foram alterados.

## Verificação manual pendente — Android e iOS

1. Como visitante, conferir feed e Conta; Denunciar deve abrir Login, e Minhas não deve aparecer. Voltar do login deve cancelar a intenção. Entrar depois pela Conta deve levar ao feed, sem abrir formulário inesperadamente.
2. Pelo atalho Denunciar, entrar com conta válida: deve aparecer o formulário já existente. Depois de voltar, navegar até Minhas/Conta, abrir Denunciar e voltar; a aba anterior deve continuar selecionada.
3. Em celular com recorte/área de gesto, abrir teclado nos campos mais baixos, rolar, editar textos longos e tocar nos botões. Conferir rotação suportada, texto ampliado, VoiceOver/TalkBack, contraste, foco e tamanho de toque. O app continua configurado para retrato.
4. Validar campos vazios e manter conteúdo após falha de envio. Cancelar descarte não deve apagar o texto. Na correção, cancelar a remoção de fotos deve mantê-las. Repetir permissões negadas de câmera e GPS sem impedir preenchimento manual.
5. Abrir denúncia aprovada, editar comentário próprio e resposta própria. Outra conta/visitante não deve ver edição do autor. Simular perda de resposta/rede ao salvar, restaurar a conexão e conferir antes de tentar novamente; confirmar que o PUT não se repete sozinho e que a versão moderada do servidor aparece na lista.
6. Sair ou aguardar expiração com formulário/detalhes privados abertos; o app deve voltar ao acesso público. Fechar/reabrir e verificar restauração segura sem reabrir formulário por intenção antiga. O rascunho de denúncia continua sob responsabilidade do mecanismo já existente.

## Riscos, privacidade e infraestrutura — separados do escopo implementado

- Mantêm-se os riscos registrados na Etapa 1 sobre URLs públicas de anexos, precisão/endereço do contrato público e rascunhos locais. Não foram alterados contratos, CDN/Cloudinary, armazenamento de imagens ou configurações de produção.
- Os alertas de dependências inventariados na Etapa 1 não foram reavaliados por `npm audit` nesta etapa. Doctor valida compatibilidade do SDK, não elimina vulnerabilidades de dependências.
- Requer API alcançável pelo celular para validação real. Não se iniciou banco/API nem se modificaram arquivos de ambiente ou segredos. Mapas Android nativos continuam dependendo da configuração real já documentada.
- A edição de comentário é mantida em memória enquanto a tela está aberta; não ganhou persistência em disco. Sair da tela, expirar sessão ou fechar o app pode perder esse texto local. Isso não interfere no rascunho persistente de denúncia.
- Não há controle de versão/ETag no endpoint de edição. Alterações simultâneas continuam seguindo a regra atual do backend; a consulta após falha ajuda a conferir a versão publicada, sem oferecer garantia de concorrência que o servidor não possui.
- O endpoint de edição existente pode aceitar mudanças em um comentário de denúncia que deixou de ser pública; a listagem pública continua retornando 404 nesse caso. O mobile informa o erro de consulta sem alargar permissões ou mudar esse contrato nesta etapa.

Mapa comunitário, boards e notificações push não foram implementados. Permanecem para as etapas seguintes, sem início automático.

## Commit local

Esta entrega acompanha o commit `feat: improve mobile navigation and comment editing`. Consulte `git log -1 --oneline -- mobile/delivery/stage-2-navigation.md` para o hash definitivo. Sem push, deploy ou merge.
