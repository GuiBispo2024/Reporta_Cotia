const { databaseConfig } = require('../../config/database');
test('supports documented database settings and legacy password alias', () => {
  const config = databaseConfig({ DB_HOST: 'db', DB_PORT: '5544', DB_PASSWORD: 'example', DB_SSL: 'true' });
  expect(config).toMatchObject({ dialect: 'postgres', host: 'db', port: 5544, password: 'example', dialectOptions: { ssl: { require: true } } });
  expect(databaseConfig({ DB_PASS: 'preferred', DB_PASSWORD: 'alias' }).password).toBe('preferred');
  expect(() => databaseConfig({ DB_PORT: 'invalid' })).toThrow('DB_PORT');
  expect(databaseConfig({ NODE_ENV: 'test' })).toMatchObject({ dialect: 'sqlite', storage: ':memory:' });
});
