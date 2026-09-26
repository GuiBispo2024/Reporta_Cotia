require('dotenv').config();
const { databaseConfig } = require('./database');
const config = mode => ({ ...databaseConfig({ ...process.env, NODE_ENV: mode }), ...(mode !== 'test' && process.env.DATABASE_URL ? { use_env_variable: 'DATABASE_URL' } : {}) });
module.exports = { development: config('development'), test: config('test'), production: config('production') };
