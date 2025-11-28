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

## Injetar seeds no bando de dados
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