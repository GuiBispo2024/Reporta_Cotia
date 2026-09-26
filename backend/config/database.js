function databaseConfig(env = process.env) {
  if (env.NODE_ENV === 'test') return { dialect: 'sqlite', storage: ':memory:', logging: false };
  const ssl = env.DB_SSL === 'true' || (env.DB_SSL !== 'false' && env.NODE_ENV === 'production');
  const port = Number(env.DB_PORT || 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('DB_PORT must be a valid TCP port.');
  return {
    dialect: env.DB_DIALECT || 'postgres',
    host: env.DB_HOST || 'localhost', port,
    database: env.DB_NAME, username: env.DB_USER,
    password: env.DB_PASS ?? env.DB_PASSWORD,
    logging: false,
    ...(ssl ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: env.DB_SSL_REJECT_UNAUTHORIZED === 'true' } } } : {})
  };
}
module.exports = { databaseConfig };
