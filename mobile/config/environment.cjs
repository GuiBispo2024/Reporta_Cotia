const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function loadEnvironment(variables = process.env, root = path.resolve(__dirname, '..')) {
  const appEnv = variables.APP_ENV || 'development';
  if (!['development', 'staging', 'production'].includes(appEnv)) {
    throw new Error('APP_ENV deve ser development, staging ou production.');
  }
  const read = (file) => fs.existsSync(file) ? dotenv.parse(fs.readFileSync(file)) : {};
  const values = {
    ...read(path.join(root, `.env.${appEnv}`)),
    ...read(path.join(root, `.env.${appEnv}.local`)),
    ...variables,
  };
  let url;
  try {
    url = new URL(values.API_BASE_URL);
  } catch {
    throw new Error(`Configure API_BASE_URL com uma URL válida para ${appEnv}.`);
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('API_BASE_URL deve ser HTTP(S), sem credenciais, query ou fragmento.');
  }
  if (appEnv !== 'development' && url.protocol !== 'https:') {
    throw new Error('Staging e production exigem uma API HTTPS.');
  }
  const apiTimeoutMs = Number(values.API_TIMEOUT_MS);
  if (!Number.isInteger(apiTimeoutMs) || apiTimeoutMs < 1000 || apiTimeoutMs > 120000) {
    throw new Error('API_TIMEOUT_MS deve ser um inteiro entre 1000 e 120000.');
  }
  return Object.freeze({ appEnv, apiBaseUrl: url.toString().replace(/\/+$/, ''), apiTimeoutMs });
}

module.exports = { loadEnvironment };
