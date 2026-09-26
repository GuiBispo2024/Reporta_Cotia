# Reporta Cotia

Plataforma web colaborativa para registrar, acompanhar e dar visibilidade a problemas urbanos de Cotia. Moradores podem publicar denúncias geolocalizadas, anexar imagens e interagir com outras publicações; moderadores acompanham o andamento e mantêm um histórico rastreável das alterações.

## Aplicação publicada

- Frontend: [reporta-cotia.vercel.app](https://reporta-cotia.vercel.app/)
- API: [reporta-cotia.onrender.com](https://reporta-cotia.onrender.com/)
- Swagger: [reporta-cotia.onrender.com/api-docs](https://reporta-cotia.onrender.com/api-docs/)

> Os endereços publicados podem ficar temporariamente indisponíveis conforme as políticas dos serviços de hospedagem.

## Funcionalidades

- Cadastro, autenticação JWT, edição de perfil e exclusão de conta protegida por senha.
- Controle de acesso por perfis cumulativos (`CITIZEN`, `MODERATOR`, `ANALYST` e `ADMIN`) e permissões consultadas no banco a cada requisição.
- Gerenciamento de perfis pela interface administrativa, com proteção contra autodespromoção e remoção do último administrador.
- Histórico paginado das alterações de perfis, identificando o usuário alterado, o responsável e os perfis anteriores e novos.
- Foto de perfil com recorte, substituição e remoção da imagem anterior.
- Redefinição de senha por e-mail com token próprio, uso único, expiração e trilha de auditoria.
- Criação e edição de denúncias com título, descrição, categoria, endereço, geolocalização e até quatro imagens.
- Carrossel de imagens e compatibilidade com denúncias antigas que possuem somente `imageUrl`.
- Busca, filtros recolhíveis e visualização das denúncias em mapa.
- Curtidas, compartilhamentos e comentários carregados sob demanda.
- Prévia de até três comentários nos cards da página inicial e lista completa nos detalhes da denúncia.
- Respostas a comentários em múltiplos níveis, com edição e exclusão pelo autor.
- Moderação com aprovação, rejeição, reabertura, situação e setor responsável.
- Setores sugeridos para encaminhamento, como Infraestrutura, Iluminação Pública, Limpeza Urbana, Trânsito e Meio Ambiente.
- Página exclusiva de histórico de alterações, com registro apenas quando há mudança efetiva.
- Páginas próprias para listar curtidas, compartilhamentos e perfis públicos.
- Recursos de acessibilidade visual e navegação responsiva.

## Tecnologias

### Frontend

- React 19 e React Router
- Axios
- Leaflet e OpenStreetMap/Nominatim
- CSS responsivo

### Backend

- Node.js e Express
- PostgreSQL e Sequelize
- JWT e bcrypt
- Multer e Cloudinary
- Swagger/OpenAPI
- Jest e Supertest

## Estrutura do projeto

```text
Reporta_Cotia/
├── backend/
│   ├── controllers/
│   ├── middlewares/
│   ├── migrations/
│   ├── models/
│   ├── repositories/
│   ├── services/
│   ├── tests/
│   ├── utils/
│   └── index.js
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── routes/
│       └── services/
└── README.md
```

A aplicação segue uma arquitetura em camadas no backend (`controllers`, `services`, `repositories` e `models`) e separa páginas, componentes, contexto e serviços HTTP no frontend.

## Requisitos

- Node.js 22.12 ou superior (CI em Node.js 24)
- npm
- PostgreSQL
- Conta no Cloudinary para armazenamento de imagens em produção
- Conta no Resend para envio real dos e-mails de redefinição de senha

## Instalação

```bash
git clone https://github.com/GuiBispo2024/Reporta_Cotia.git
cd Reporta_Cotia

cd backend
npm install

cd ../frontend
npm install
```

## Configuração

Crie `backend/.env`:

```env
PORT=5000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5432
DB_NAME=reporta_cotia
DB_USER=postgres
DB_PASS=sua_senha
DB_SSL=false
DB_SYNC=false
DB_SYNC_ALTER=false

JWT_SECRET=troque_por_uma_chave_forte
JWT_EXPIRES_IN=30m

CORS_ORIGINS=http://localhost:3000
PUBLIC_API_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

RESEND_API_KEY=
RESET_EMAIL_FROM=Reporta Cotia <onboarding@resend.dev>
```

Crie `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:5000
```

Quando `RESEND_API_KEY` e `RESET_EMAIL_FROM` não estão configurados em ambiente local, o link de redefinição é exibido no console do backend. Em produção, configure o remetente validado no Resend.

## Banco de dados

Execute as migrações antes de iniciar a API:

```bash
cd backend
npm run db:migrate
```

As migrações incluem controle de sessão, perfis e permissões, auditoria das mudanças de acesso, histórico das denúncias, setor responsável, respostas a comentários, tokens e histórico de redefinição de senha e suporte a múltiplas imagens.

Para inserir dados fictícios de demonstração em desenvolvimento, após as migrações:

```bash
npm run seed
```

O comando cria tabelas ausentes em bancos locais novos, preserva dados existentes e reutiliza os exemplos encontrados por e-mail e por título/autor, sem duplicá-los em execuções consecutivas. Tabelas existentes devem ser atualizadas pelas migrações. Não redefine senhas, perfis ou o andamento de exemplos já existentes. Não execute as seeds simultaneamente. Se o título de um exemplo for alterado, a próxima execução criará novamente o exemplo com o título original.

São criadas cinco contas com a senha `ReportaCotia123!`:

| E-mail | Perfis |
| --- | --- |
| `morador@reporta-cotia.example` | Cidadão |
| `moradora@reporta-cotia.example` | Cidadã |
| `moderador@reporta-cotia.example` | Cidadão e moderador |
| `analista@reporta-cotia.example` | Cidadão e analista |
| `admin@reporta-cotia.example` | Cidadão e administrador |

Os exemplos incluem as oito categorias, denúncias pendentes, aprovadas e rejeitadas, os três estados de resolução, setores responsáveis, históricos de moderação/resolução e de atribuição de perfis, comentários com resposta e censura para revisão, curtidas e compartilhamentos apenas em denúncias aprovadas. Endereços e ocorrências são fictícios. As denúncias ficam sem anexos para utilizar as imagens padrão por setor/categoria, sem gravá-las como fotos do usuário.

As seeds de demonstração são bloqueadas com `NODE_ENV=production`. O catálogo de perfis e permissões também é criado pelas migrações de controle de acesso, sem as contas de demonstração.

Evite `DB_SYNC_ALTER=true` em produção. Prefira migrações versionadas.

## Execução local

Em terminais separados:

```bash
cd backend
npm start
```

```bash
cd frontend
npm start
```

- Frontend local: `http://localhost:3000`
- API local: `http://localhost:5000`
- Swagger local: `http://localhost:5000/api-docs`
- Saúde da API: `GET http://localhost:5000/`

## Testes e build

```bash
cd backend
npm test
npm run test:all
```

```bash
cd frontend
npm test
npm run build
```

## Referência resumida da API

As rotas protegidas recebem o token no cabeçalho:

```http
Authorization: Bearer <token>
```

### Autenticação e usuários

| Método | Rota | Uso |
| --- | --- | --- |
| `POST` | `/users` | Cadastrar usuário |
| `POST` | `/users/login` | Autenticar |
| `POST` | `/users/logout` | Invalidar a sessão atual |
| `POST` | `/users/password/forgot` | Solicitar redefinição de senha |
| `POST` | `/users/password/reset` | Redefinir usando token de uso único |
| `GET` | `/users?withCounts=true` | Listar participantes e suas contribuições; o e-mail exige `users.view` |
| `GET` | `/users/me` | Consultar os dados, perfis e permissões atuais da própria sessão |
| `GET` | `/users/access/roles` | Listar os perfis disponíveis e suas permissões (`users.manage_roles`) |
| `GET` | `/users/access/role-history` | Consultar o histórico paginado de perfis (`users.audit.view`) |
| `PUT` | `/users/:id/roles` | Substituir os perfis de um usuário (`users.manage_roles`) |
| `GET` | `/users/:id` | Consultar perfil público, sem expor o e-mail |
| `PUT` | `/users/update` | Atualizar o próprio perfil |
| `PATCH` | `/users/avatar` | Substituir a foto de perfil |
| `DELETE` | `/users/avatar` | Remover a foto de perfil |
| `DELETE` | `/users/delete` | Excluir a própria conta com confirmação de senha |
| `GET` | `/users/denunciaCount` | Alias legado da listagem com contagens |

### Denúncias e moderação

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/denuncia` | Listar com paginação, busca, categoria, status e situação |
| `POST` | `/denuncia` | Criar denúncia com até quatro arquivos no campo `imagens` |
| `GET` | `/denuncia/:id` | Consultar detalhes |
| `PUT` | `/denuncia/:id` | Editar denúncia e suas imagens |
| `DELETE` | `/denuncia/:id` | Excluir denúncia autorizada |
| `GET` | `/denuncia/filter` | Compatibilidade com filtros legados |
| `GET` | `/denuncia/public/user/:userId` | Listar denúncias públicas de um usuário |
| `GET` | `/denuncia/moderacao` | Listar fila de moderação paginada |
| `PATCH` | `/denuncia/:id/moderar` | Aprovar, rejeitar ou reabrir |
| `PATCH` | `/denuncia/:id/resolucao` | Atualizar andamento e setor responsável |
| `GET` | `/denuncia/:id/historico` | Consultar a rastreabilidade das alterações |

Os envios multipart usam o campo `imagens` e aceitam no máximo quatro arquivos. As respostas incluem `imageUrl` como capa e `imageUrls` como coleção; URLs enviadas no corpo não são aceitas como uploads. JPEG, PNG e WebP são decodificados e convertidos para WebP, com limite de 25 megapixels.

### Interações sociais

| Método | Rota | Uso |
| --- | --- | --- |
| `GET` | `/denuncia/:denunciaId/comentarios` | Listar comentários paginados |
| `POST` | `/denuncia/:denunciaId/comentario` | Comentar ou responder com `parentCommentId` |
| `PUT` | `/denuncia/comentario/:id` | Editar comentário próprio |
| `DELETE` | `/denuncia/comentario/:id` | Excluir comentário próprio |
| `PATCH` | `/denuncia/comentario/:id/censura` | Moderar comentário (admin) |
| `GET` | `/denuncia/:denunciaId/likes` | Listar curtidas paginadas |
| `POST` | `/denuncia/:denunciaId/like` | Curtir denúncia |
| `DELETE` | `/denuncia/:denunciaId/like` | Remover curtida |
| `GET` | `/denuncia/:denunciaId/shares` | Listar compartilhamentos paginados |
| `POST` | `/denuncia/:denunciaId/share` | Registrar compartilhamento |
| `DELETE` | `/denuncia/share/:id` | Excluir registro próprio |

Comentários, curtidas e compartilhamentos retornam dados de resumo junto às denúncias e suas listas completas são carregadas apenas quando necessário. Compartilhamentos externos registram a intenção de compartilhar; a plataforma de destino não confirma a publicação.

## Perfis e permissões

Os perfis são cumulativos: todo usuário mantém o perfil `CITIZEN` e pode receber outros perfis conforme sua responsabilidade. A autorização considera as permissões efetivamente associadas no banco, sem depender de uma propriedade administrativa no token.

| Perfil | Responsabilidade principal |
| --- | --- |
| `CITIZEN` | Criar e administrar as próprias denúncias e consultar indicadores públicos |
| `MODERATOR` | Visualizar a fila, moderar denúncias, revisar censura, atualizar a resolução e consultar o histórico das denúncias |
| `ANALYST` | Consultar o dashboard completo e exportar dados analíticos |
| `ADMIN` | Gerenciar usuários e perfis, consultar auditorias e acessar as demais funções |

As mudanças de perfil passam a valer nas requisições seguintes. A interface também sincroniza a sessão ao abrir a aplicação e quando a janela volta ao foco.

## Regras de segurança e rastreabilidade

- Alterações sensíveis exigem autenticação e validação de autoria ou permissão específica.
- Endpoints protegidos verificam permissões específicas, como `moderation.review`, `denuncia.audit.view` e `users.audit.view`.
- O perfil `CITIZEN` é obrigatório; um administrador não pode remover o próprio perfil `ADMIN`, e a plataforma sempre preserva ao menos uma conta administradora.
- Mudanças de perfis são transacionais e registradas na trilha de auditoria somente quando há alteração efetiva.
- O logout invalida tokens emitidos anteriormente por meio do versionamento da sessão.
- Tokens de redefinição são armazenados como hash, expiram e não podem ser reutilizados.
- A moderação preserva o conteúdo original para permitir reabertura e nova análise.
- O histórico registra o autor, a ação, o estado anterior, o novo estado e a data, sem criar uma entrada quando o formulário é salvo sem alterações.
- Uploads validam tipo e tamanho antes do envio ao armazenamento configurado.

## Observações de produção

- O limitador de requisições em memória funciona por instância; ambientes distribuídos devem usar um armazenamento compartilhado, como Redis.
- A autenticação atual utiliza token de acesso JWT e não implementa refresh token.
- Geocodificação e mapas dependem dos serviços externos OpenStreetMap/Nominatim.
- Restrinja `CORS_ORIGINS`, use segredos fortes e mantenha `DB_SYNC_ALTER=false` em produção.

## Autores

- Guilherme Bispo
- Isabelly Silva
- Marcos Palacio
- Sabrina Santos

## Integridade e validação

A exclusão de conta preserva denúncias aprovadas e remove o vínculo com o autor. A troca de senha revoga as sessões anteriores. Moderação e histórico são gravados na mesma transação; resolver exige aprovação.

`DB_PASS` é a variável principal; `DB_PASSWORD` permanece como alias. `DB_DIALECT` assume `postgres`. `DATABASE_URL` pode substituir a conexão por campos. `DB_SSL` controla TLS; `DB_SSL_REJECT_UNAUTHORIZED=true` habilita validação do certificado. `TRUST_PROXY` aceita uma lista de IPs/sub-redes de proxies confiáveis; configure somente conforme a infraestrutura.

As migrations incluem uma baseline para bancos vazios e preservam tabelas legadas existentes. Não use `sync({ alter: true })` como substituto de migrations.

No backend, `npm run test:unit` e `npm run test:integration` selecionam suas respectivas pastas; `npm run test:all -- --runInBand` inclui cobertura dos arquivos de aplicação, mesmo quando não importados por testes. A verificação de migrations aceita `MIGRATIONS_TEST_URL`, exige banco vazio descartável e recusa bases preenchidas. O CI executa esse teste em PostgreSQL, além das suítes e do build.
