const { createHash } = require('crypto');
const { User, ReportSubmission, sequelize } = require('../models/rel');
const DenunciaService = require('./DenunciaService');
const { validateDenuncia } = require('../utils/validateDenuncia');
const { storeImages, deleteImage } = require('../utils/upload');
const AppError = require('../utils/AppError');

function validateKey(key) {
  if (typeof key !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
    throw new AppError('Idempotency-Key deve ser um UUID v4.', 400, 'INVALID_IDEMPOTENCY_KEY');
  }
  return key.toLowerCase();
}
function fingerprint(data, files) {
  const normalized = Object.fromEntries(['titulo', 'descricao', 'localizacao', 'bairro'].map((field) => [field, data[field]?.trim() || '']));
  normalized.categoria = data.categoria || 'Outros';
  for (const field of ['latitude', 'longitude']) normalized[field] = data[field] == null || data[field] === '' ? null : Number(data[field]);
  normalized.photos = files.map((file) => createHash('sha256').update(file.buffer).digest('hex'));
  return createHash('sha256').update(JSON.stringify(normalized)).digest('hex');
}
function response(receipt) {
  if (receipt.denunciaId === null) throw new AppError('A denúncia deste envio foi removida.', 410, 'SUBMISSION_REMOVED');
  return receipt.response;
}
class ReportSubmissionService {
  static async get(userId, key) {
    const receipt = await ReportSubmission.findOne({ where: { userId, key: validateKey(key) } });
    if (!receipt) throw new AppError('Envio ainda não confirmado.', 404, 'SUBMISSION_NOT_FOUND');
    return response(receipt);
  }
  static async create(data, files, user, key) {
    if (key !== undefined) key = validateKey(key);
    validateDenuncia(data);
    if (data.imageUrl || data.imageUrls) throw new AppError('Use o upload de imagens.', 400, 'INVALID_IMAGE_REFERENCE');
    const hash = fingerprint(data, files);
    let imageUrls = [];
    try {
      return await sequelize.transaction(async (transaction) => {
        // Database lock works across API instances; report and receipt commit together.
        const owner = await User.findByPk(user.id, { transaction, lock: transaction.LOCK.UPDATE });
        if (!owner) throw new AppError('Conta indisponível.', 401, 'SESSION_REVOKED');
        if (key) {
          const receipt = await ReportSubmission.findOne({ where: { userId: user.id, key }, transaction });
          if (receipt) {
            if (receipt.fingerprint !== hash) throw new AppError('Este identificador já foi usado com outro conteúdo.', 409, 'IDEMPOTENCY_CONFLICT');
            return response(receipt);
          }
        }
        imageUrls = await storeImages(files);
        const result = await DenunciaService.create({ ...data, imageUrls, imageUrl: imageUrls[0] || null }, user, { uploadedImages: true, transaction });
        if (key) await ReportSubmission.create({ userId: user.id, key, fingerprint: hash, denunciaId: result.denuncia.id, response: JSON.parse(JSON.stringify(result)) }, { transaction });
        return result;
      });
    } catch (error) {
      await Promise.all(imageUrls.map((url) => deleteImage(url).catch(() => {})));
      throw error;
    }
  }
}
module.exports = ReportSubmissionService;
