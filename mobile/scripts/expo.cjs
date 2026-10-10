const { spawn } = require('node:child_process');
const path = require('node:path');
const { loadEnvironment } = require('../config/environment.cjs');

const [appEnv = 'development', ...args] = process.argv.slice(2);
const env = { ...process.env, APP_ENV: appEnv, EXPO_NO_DOTENV: '1' };
try {
  loadEnvironment(env);
  const child = spawn(process.execPath, [require.resolve('expo/bin/cli'), ...(args.length ? args : ['start'])], {
    cwd: path.resolve(__dirname, '..'), env, stdio: 'inherit',
  });
  child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
  child.on('exit', (code) => { process.exitCode = code ?? 1; });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
