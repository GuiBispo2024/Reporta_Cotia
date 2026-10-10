const { spawnSync } = require('node:child_process');
const { loadEnvironment } = require('../config/environment.cjs');

try {
  const config = loadEnvironment();
  const result = spawnSync(process.execPath, [require.resolve('jest/bin/jest'), '--runInBand', '--runTestsByPath', 'tests/api.integration.test.ts'], {
    cwd: require('node:path').resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, REPORTA_API_SMOKE: '1', API_BASE_URL: config.apiBaseUrl, API_TIMEOUT_MS: String(config.apiTimeoutMs) },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
