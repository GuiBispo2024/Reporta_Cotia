const AppError = require('./AppError');

function validateAccount(data, { partial = false } = {}) {
  const result = {};
  if (!partial || Object.hasOwn(data, 'username')) {
    if (typeof data.username !== 'string' || !data.username.trim() || data.username.trim().length > 255) {
      throw new AppError('Informe um nome de usuário válido.', 400, 'VALIDATION_ERROR');
    }
    result.username = data.username.trim();
  }
  if (!partial || Object.hasOwn(data, 'email')) {
    if (typeof data.email !== 'string' || data.email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      throw new AppError('Informe um e-mail válido.', 400, 'VALIDATION_ERROR');
    }
    result.email = data.email.trim().toLowerCase();
  }
  if (!partial && (typeof data.password !== 'string' || data.password.length < 6)) {
    throw new AppError('A senha deve ter pelo menos 6 caracteres.', 400, 'VALIDATION_ERROR');
  }
  return result;
}

module.exports = { validateAccount };
