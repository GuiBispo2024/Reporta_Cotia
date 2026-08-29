<<<<<<< HEAD
# Reporta Cotia

Plataforma web para registrar, moderar e acompanhar denúncias de problemas urbanos em Cotia. O sistema conecta cidadãos e administração por meio de um fluxo completo: criação da denúncia, análise do conteúdo, moderação, publicação, participação da comunidade e acompanhamento da resolução.

## Estado atual

A aplicação está organizada como um monólito modular, com frontend e API separados no mesmo repositório:

```text
Reporta_Cotia_New/
├── frontend/   # aplicação React
└── backend/    # API Express, regras de negócio e banco de dados
```

Principais tecnologias:

- Frontend: React 19, React Router, Axios, Bootstrap e Bootstrap Icons.
- Backend: Node.js, Express 5 e Sequelize.
- Banco de dados: PostgreSQL em desenvolvimento/produção e SQLite em memória nos testes.
- Autenticação: JWT e bcrypt.
- Imagens: armazenamento local em desenvolvimento ou Cloudinary quando configurado.
- Testes: Jest, Supertest e Testing Library.

## Funcionalidades

### Denúncias

- Cadastro autenticado com título, descrição, categoria e endereço.
- Captura de latitude e longitude pelo navegador.
- Conversão das coordenadas em endereço e exibição do local até o estado.
- Evidência fotográfica opcional, com pré-visualização e limite de 5 MB.
- Inclusão, substituição e remoção da imagem.
- Edição e reenvio de denúncias rejeitadas.
- Página de detalhes com mapa do OpenStreetMap incorporado ao site.
- Paginação e filtros por título, descrição, localização, autor, categoria e status de resolução.
- Ordenação por mais recentes, mais curtidas ou mais compartilhadas.

### Moderação e resolução

O sistema trata moderação e resolução como processos independentes:

```text
Moderação: pendente → aprovada ou rejeitada
Resolução: aberta → em andamento → resolvida
```

- Apenas denúncias aprovadas aparecem na área pública.
- O administrador pode aprovar ou rejeitar uma denúncia.
- A rejeição pode conter um motivo opcional para orientar o autor.
- O autor visualiza o motivo, corrige a denúncia e a reenvia para análise.
- O administrador atualiza separadamente o andamento da resolução.
- Um administrador não pode retirar a própria permissão.
- A última conta administrativa também não pode ser despromovida.

### Censura automática

- Títulos, descrições e comentários passam por um filtro automático antes da publicação/moderação.
- O filtro reconhece acentos, substituições por números e símbolos, separadores e repetição de letras.
- O texto original fica disponível somente para a revisão administrativa.
- O moderador pode manter ou retirar a censura.
- Comentários identificados como impróprios são publicados censurados e ficam disponíveis para revisão.

> O filtro atual é heurístico e executado localmente. Ele não utiliza um serviço externo de inteligência artificial e não substitui a decisão humana da moderação.

### Comentários e participação

- Comentários carregados junto com a página, sem depender da abertura do painel.
- Campo de escrita abaixo da conversa, seguindo o padrão de redes sociais.
- Foto de perfil nos comentários.
- Edição e exclusão pelo próprio autor.
- Curtir e descurtir denúncias.
- Lista de usuários que curtiram, incluindo foto de perfil.
- Compartilhamento por WhatsApp, Facebook ou cópia do link.
- Mensagem opcional no compartilhamento.
- Histórico com usuário, mensagem e data.
- Remoção do próprio registro do histórico.

> Remover um registro de compartilhamento altera o histórico e a contagem do Reporta Cotia, mas não apaga mensagens já enviadas para plataformas externas.

### Conta e perfil

- Cadastro e login.
- Foto opcional durante a criação da conta.
- Visualização e edição dos dados do perfil.
- Inclusão, substituição e remoção da foto já salva.
- Avatar exibido na navbar, perfil, comentários, curtidas e compartilhamentos.
- Listagem da comunidade e contagem de denúncias aprovadas.
- Sessão revalidada pelo servidor.
- Logout com limpeza da sessão e recarregamento completo da aplicação.

### Segurança e estabilidade

- Autorização por usuário, autoria e função administrativa.
- Denúncias não aprovadas acessíveis somente pelo autor ou administrador.
- Dados originais censurados não são retornados em endpoints públicos.
- Tratamento centralizado dos erros da API.
- Mensagens amigáveis para erros de validação, permissão, conexão e limite de requisições.
- CORS configurável por ambiente.
- Headers básicos de segurança.
- Limites separados para leituras e alterações.
- Limite de 1 MB para JSON e 5 MB para imagens.
- Proteção da interface contra respostas antigas que poderiam sobrescrever filtros mais recentes.

## Fluxos principais

### Fluxo do cidadão

```text
Criar conta ou entrar
        ↓
Registrar denúncia
        ↓
Filtro automático de conteúdo
        ↓
Aguardar moderação
        ↓
Denúncia aprovada e publicada
        ↓
Acompanhar resolução e participação da comunidade
```

Caso a denúncia seja rejeitada:

```text
Consultar motivo → corrigir → reenviar para moderação
```

### Fluxo administrativo

```text
Acessar moderação
        ↓
Revisar conteúdo original e censurado
        ↓
Manter ou retirar censura
        ↓
Aprovar ou rejeitar com motivo opcional
        ↓
Atualizar resolução das denúncias aprovadas
```

## Estrutura do backend

```text
backend/
├── controllers/    # rotas HTTP
├── services/       # regras de negócio
├── repositories/   # consultas Sequelize
├── models/         # entidades e relacionamentos
├── migrations/     # evolução versionada do banco
├── middlewares/    # autenticação, segurança e erros
├── utils/          # upload, validação, Swagger e censura
├── seed/           # dados iniciais
└── tests/          # testes unitários e de integração
```

## Estrutura do frontend

```text
frontend/src/
├── api/            # cliente HTTP e interceptadores
├── components/     # navbar, filtros e interações
├── context/        # sessão e autenticação
├── pages/          # páginas da aplicação
├── routes/         # rotas públicas e privadas
├── services/       # comunicação com a API
└── utils/          # mensagens e formatação de endereço
```

## Requisitos

- Node.js e npm.
- PostgreSQL para execução local ou produção.
- Um banco de dados vazio ou existente com permissão para executar migrations.

## Configuração do backend

Instale as dependências:

```bash
cd backend
npm install
```

Crie `backend/.env`:

```env
NODE_ENV=development
PORT=8081

DB_DIALECT=postgres
DB_HOST=localhost
DB_NAME=reporta_cotia
DB_USER=postgres
DB_PASS=sua_senha

JWT_SECRET=troque-por-uma-chave-segura
CORS_ORIGINS=http://localhost:3000
PUBLIC_API_URL=http://localhost:8081

DB_SYNC=false
DB_SYNC_ALTER=false
```

Em produção, configure também `DATABASE_URL`. Não utilize a chave JWT de exemplo.

### Banco de dados e migrations

Execute todas as migrations pendentes:

```bash
npm run db:migrate
```

As migrations atuais adicionam:

- Categoria, coordenadas, imagem e resolução das denúncias.
- Reparação dos campos cívicos em bancos que retornaram ao estado anterior.
- Foto de perfil dos usuários.
- Campos de revisão de censura e motivo de rejeição.

Para desfazer somente a migration mais recente:

```bash
npm run db:migrate:undo
```

`DB_SYNC=true` existe apenas para compatibilidade em desenvolvimento. O fluxo recomendado é manter `DB_SYNC=false` e versionar toda alteração de estrutura por migration.

### Iniciar a API

```bash
npm start
```

A API usa por padrão `http://localhost:8081`.

## Configuração do frontend

Instale as dependências:

```bash
cd frontend
npm install
```

Crie `frontend/.env`:

```env
REACT_APP_API_URL=http://localhost:8081
```

Inicie a aplicação:

```bash
npm start
```

O frontend usa por padrão `http://localhost:3000`.

## Imagens

### Armazenamento local

Sem Cloudinary, os arquivos são gravados em:

```text
backend/uploads/
```

`PUBLIC_API_URL` deve apontar para a URL pública da API para que o frontend consiga carregar os arquivos.

### Cloudinary

Para armazenamento externo, adicione ao `backend/.env`:

```env
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Quando as três credenciais estão presentes, novos uploads são enviados automaticamente ao Cloudinary.

## Seeds

Para carregar os dados de demonstração:

```bash
cd backend
npm run seed
```

As seeds devem ser utilizadas somente em ambientes controlados.

## Testes e verificação

Backend:

```bash
cd backend
npm test
```

Com cobertura:

```bash
npm run test:all
```

Frontend:

```bash
cd frontend
npm test
npm run build
```

Os testes do backend utilizam SQLite em memória e não apagam os dados do PostgreSQL configurado para desenvolvimento.

## Endpoints principais

| Área | Método e rota | Acesso |
|---|---|---|
| Cadastro | `POST /users` | Público |
| Login | `POST /users/login` | Público |
| Sessão atual | `GET /users/me` | Autenticado |
| Foto do perfil | `PATCH /users/avatar` | Autenticado |
| Remover foto | `DELETE /users/avatar` | Autenticado |
| Criar denúncia | `POST /denuncia` | Autenticado |
| Listar publicadas | `GET /denuncia` | Público |
| Filtrar denúncias | `GET /denuncia/filter` | Público |
| Detalhes | `GET /denuncia/:id` | Público ou proprietário/admin |
| Moderação | `GET /denuncia/moderacao` | Administrador |
| Aprovar/rejeitar | `PATCH /denuncia/:id/moderar` | Administrador |
| Revisar censura | `PATCH /denuncia/:id/censura` | Administrador |
| Atualizar resolução | `PATCH /denuncia/:id/resolucao` | Administrador |
| Comentários | `GET /denuncia/:id/comentarios` | Público |
| Curtidas | `GET /denuncia/:id/likes` | Público |
| Compartilhamentos | `GET /denuncia/:id/shares` | Público |

As rotas de criação, alteração e exclusão de comentários, curtidas e compartilhamentos exigem autenticação.

## Documentação da API

Com o backend em execução, o Swagger fica disponível em:

```text
http://localhost:8081/api-docs
```

## Limitações conhecidas e próximas evoluções

- O rate limit atual é mantido em memória; ambientes distribuídos devem utilizar Redis ou o serviço da infraestrutura.
- O JWT não possui refresh token.
- A censura automática usa regras locais e deve continuar acompanhada de moderação humana.
- A geocodificação reversa depende da disponibilidade do Nominatim/OpenStreetMap.
- A remoção de uma URL de imagem no banco não elimina automaticamente o arquivo físico local ou o recurso no Cloudinary.
- O compartilhamento externo não permite confirmar se o usuário concluiu o envio depois que outra plataforma foi aberta.
- Logs estruturados, métricas, notificações e processamento assíncrono ainda são evoluções recomendadas.
=======
# Reporta Cotia
O Reporta Cotia é uma aplicação para a denúncia de problemas de infraestrutura, visando melhor interação entre cidadãos e órgãos municipais.

## Tecnologias utilizadas
- React
- Node.js/Express
- PostgreSQL
- Bootstrap

## Instalação
1. Clonar o repositório
```bash
https://github.com/GuiBispo2024/Reporta_Cotia.git
```
2. Entrar na pasta do projeto
```bash
cd Reporta_Cotia
```
3. Instalar as dependências
```bash
npm install
```

## Variáveis de ambiente
Crie um .env na raiz do backend com as seguintes informações:
- **JWT_SECRET** → Chave secreta usada para gerar e validar tokens JWT.
- **DB_NAME** → Nome do banco de dados PostgreSQL.
- **DB_USER** → Usuário do banco.
- **DB_PASS** → Senha do banco.
- **DB_HOST** → Host onde o banco está rodando (local ou remoto).
- **DB_DIALECT** → Dialeto do Sequelize (ex: postgres, mysql, sqlite).
- **PORT** → Porta onde o servidor Node.js irá rodar.
- **NODE_ENV** → Ambiente de execução (development, production, test).

Crie um .env na raiz do frontend com as seguintes informações:
- **REACT_APP_API_URL** → Host onde o servidor Node está rodando (ex:http://localhost:8585).

## Injetar seeds no banco de dados
Na raiz do backend rodar:
```bash
npm run seed
```
  
## Como executar
1. Abrir a pasta backend e rodar o servidor
```bash
cd backend
node index.js
```
2. Abrir a pasta frontend e rodar a aplicação
```bash
cd frontend
npm start
```

## URL aplicação:
https://reporta-cotia.vercel.app/

## URL API:
https://reporta-cotia.onrender.com

## Documentação Swagger:
https://reporta-cotia.onrender.com/api-docs

## Autores
- Guilherme Bispo
- Isabelly Silva
- Marcos Palacio
- Sabrina Santos
>>>>>>> aa0c1df7e8cc93dc47d4f0e200b82634b092b09e
