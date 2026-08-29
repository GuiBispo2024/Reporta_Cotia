const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  if (err && err.name === 'MulterError') {
    return res.status(400).json({
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'A imagem ultrapassa o limite de 5 MB. Escolha um arquivo menor e tente novamente.'
        : 'Não foi possível processar esta imagem. Use um arquivo JPG, PNG ou outro formato de imagem válido.',
      code: 'UPLOAD_ERROR'
    });
  }
  const isKnown = err instanceof AppError;
  const status = isKnown ? err.statusCode : 500;

  if (!isKnown) {
    console.error(err);
  }

  res.status(status).json({
    message: isKnown ? err.message : 'Não conseguimos concluir esta operação agora. Tente novamente em alguns instantes.',
    code: isKnown ? err.code : 'INTERNAL_ERROR'
  });
}

module.exports = errorHandler;
