const AppError = require('./AppError');

const CATEGORIAS = [
  'Buraco e pavimentação',
  'Iluminação pública',
  'Limpeza urbana',
  'Saneamento',
  'Água e esgoto',
  'Trânsito e sinalização',
  'Árvore e área verde',
  'Outros'
];

function validateText(value, field, max, required = true) {
  if (required && (!value || typeof value !== 'string' || !value.trim())) {
    throw new AppError(`${field} é obrigatório.`, 400, 'VALIDATION_ERROR');
  }
  if (value != null && typeof value !== 'string') {
    throw new AppError(`${field} deve ser um texto.`, 400, 'VALIDATION_ERROR');
  }
  if (value && value.trim().length > max) {
    throw new AppError(`${field} deve ter no máximo ${max} caracteres.`, 400, 'VALIDATION_ERROR');
  }
}

function validateDenuncia(data, { partial = false } = {}) {
  validateText(data.titulo, 'Título', 120, !partial);
  validateText(data.descricao, 'Descrição', 2000, !partial);
  validateText(data.localizacao, 'Localização', 255, !partial);

  if (data.categoria != null && data.categoria !== '' && !CATEGORIAS.includes(data.categoria)) {
    throw new AppError('Categoria inválida.', 400, 'VALIDATION_ERROR');
  }

  for (const key of ['latitude', 'longitude']) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      const value = Number(data[key]);
      if (!Number.isFinite(value)) {
        throw new AppError(`${key} deve ser um número válido.`, 400, 'VALIDATION_ERROR');
      }
      if (key === 'latitude' && (value < -90 || value > 90)) {
        throw new AppError('Latitude deve estar entre -90 e 90.', 400, 'VALIDATION_ERROR');
      }
      if (key === 'longitude' && (value < -180 || value > 180)) {
        throw new AppError('Longitude deve estar entre -180 e 180.', 400, 'VALIDATION_ERROR');
      }
    }
  }

  if (data.imageUrl != null && data.imageUrl !== '') {
    if (typeof data.imageUrl !== 'string' || data.imageUrl.length > 1000) {
      throw new AppError('URL da imagem inválida.', 400, 'VALIDATION_ERROR');
    }
  }
}

module.exports = { validateDenuncia, CATEGORIAS };
