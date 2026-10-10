const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadEnvironment: resolveEnvironment } = require('../config/environment.cjs');

// Não carregar overrides da máquina do desenvolvedor nos testes de configuração.
const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'reporta-env-defaults-'));
const defaults = {
  development: 'API_BASE_URL=http://localhost:5000\nAPI_TIMEOUT_MS=15000',
  staging: 'API_BASE_URL=\nAPI_TIMEOUT_MS=15000',
  production: 'API_BASE_URL=https://reporta-cotia.onrender.com\nAPI_TIMEOUT_MS=15000',
};
for (const [environment, content] of Object.entries(defaults)) {
  fs.writeFileSync(path.join(fixtureRoot, `.env.${environment}`), content);
}
after(() => {
  for (const environment of Object.keys(defaults)) fs.unlinkSync(path.join(fixtureRoot, `.env.${environment}`));
  fs.rmdirSync(fixtureRoot);
});
const loadEnvironment = (variables, root = fixtureRoot) => resolveEnvironment(variables, root);

test('development carrega a API local', () => {
  assert.equal(loadEnvironment({}).apiBaseUrl, 'http://localhost:5000');
});
test('production carrega HTTPS independentemente de NODE_ENV', () => {
  assert.equal(loadEnvironment({ APP_ENV: 'production', NODE_ENV: 'development' }).appEnv, 'production');
  assert.match(loadEnvironment({ APP_ENV: 'production' }).apiBaseUrl, /^https:\/\//);
});
test('staging exige uma URL e não usa produção silenciosamente', () => {
  assert.throws(() => loadEnvironment({ APP_ENV: 'staging' }), /API_BASE_URL/);
  assert.equal(loadEnvironment({ APP_ENV: 'staging', API_BASE_URL: 'https://homologacao.example.org/' }).appEnv, 'staging');
});
test('rejeita ambiente, protocolo, credenciais e timeout inválidos', () => {
  assert.throws(() => loadEnvironment({ APP_ENV: 'invalid' }), /APP_ENV/);
  for (const API_BASE_URL of ['ftp://example.org', 'https://user:pass@example.org', 'https://example.org?token=1', 'https://example.org/#hash']) {
    assert.throws(() => loadEnvironment({ API_BASE_URL }), /API_BASE_URL/);
  }
  assert.throws(() => loadEnvironment({ APP_ENV: 'production', API_BASE_URL: 'http://example.org' }), /HTTPS/);
  for (const API_TIMEOUT_MS of ['NaN', '0', '1.5', '120001']) {
    assert.throws(() => loadEnvironment({ API_TIMEOUT_MS }), /API_TIMEOUT_MS/);
  }
});
test('precedência: processo > arquivo local do ambiente > arquivo do ambiente', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reporta-env-'));
  try {
    fs.writeFileSync(path.join(root, '.env.staging'), 'API_BASE_URL=https://base.example.org\nAPI_TIMEOUT_MS=15000');
    fs.writeFileSync(path.join(root, '.env.staging.local'), 'API_BASE_URL=https://local.example.org');
    fs.writeFileSync(path.join(root, '.env.development.local'), 'API_BASE_URL=http://localhost:5000');
    assert.equal(loadEnvironment({ APP_ENV: 'staging' }, root).apiBaseUrl, 'https://local.example.org');
    assert.equal(loadEnvironment({ APP_ENV: 'staging', API_BASE_URL: 'https://ci.example.org' }, root).apiBaseUrl, 'https://ci.example.org');
  } finally {
    for (const name of ['.env.staging', '.env.staging.local', '.env.development.local']) fs.unlinkSync(path.join(root, name));
    fs.rmdirSync(root);
  }
});
