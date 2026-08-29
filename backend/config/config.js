require('dotenv').config();

const common = {
  dialect: process.env.DB_DIALECT || 'postgres',
  logging: false
};

module.exports = {
  development: {
    ...common,
    database: process.env.DB_NAME,
    username: process.env.DB_USER,
    password: process.env.DB_PASS,
    host: process.env.DB_HOST
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:'
  },
  production: {
    ...common,
    use_env_variable: 'DATABASE_URL',
    dialectOptions: {
      ssl: { require: true, rejectUnauthorized: false }
    }
  }
};
