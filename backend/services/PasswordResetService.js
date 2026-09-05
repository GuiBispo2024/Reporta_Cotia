const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { sequelize, User, PasswordResetToken, PasswordResetHistorico } = require('../models/rel');
const AppError = require('../utils/AppError');
const { sendPasswordResetEmail } = require('../utils/passwordResetEmail');

const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
const meta = request => ({
  ip: request.ip?.slice(0, 64) || null,
  userAgent: request.get('user-agent')?.slice(0, 500) || null
});

class PasswordResetService {
  static async request(emailValue, request) {
    const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : '';
    if (!email) throw new AppError('Informe um e-mail válido.', 400, 'VALIDATION_ERROR');
    const requestMeta = meta(request);
    const user = await User.findOne({ where: { email } });
    if (!user) {
      await PasswordResetHistorico.create({ email, evento: 'solicitacao', sucesso: false, detalhes: 'Conta não localizada', ...requestMeta });
      return { message: 'Se existir uma conta com este e-mail, enviaremos as instruções de redefinição.' };
    }

    await PasswordResetToken.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null } });
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      requestedIp: requestMeta.ip
    });

    try {
      await sendPasswordResetEmail(email, token);
      await PasswordResetHistorico.create({ userId: user.id, email, evento: 'solicitacao', sucesso: true, detalhes: 'Link emitido', ...requestMeta });
    } catch (error) {
      await PasswordResetHistorico.create({ userId: user.id, email, evento: 'envio_falhou', sucesso: false, detalhes: error.message.slice(0, 255), ...requestMeta });
    }

    return {
      message: 'Se existir uma conta com este e-mail, enviaremos as instruções de redefinição.',
      ...(process.env.NODE_ENV === 'test' ? { resetToken: token } : {})
    };
  }

  static async reset(token, password, request) {
    if (typeof token !== 'string' || token.length < 32) throw new AppError('Link de redefinição inválido ou expirado.', 400, 'INVALID_RESET_TOKEN');
    if (typeof password !== 'string' || password.length < 6) throw new AppError('A nova senha deve ter pelo menos 6 caracteres.', 400, 'VALIDATION_ERROR');
    const requestMeta = meta(request);
    const tokenHash = hashToken(token);

    const result = await sequelize.transaction(async transaction => {
      const resetToken = await PasswordResetToken.findOne({
        where: { tokenHash, usedAt: null, expiresAt: { [Op.gt]: new Date() } },
        include: [{ model: User }],
        transaction
      });
      if (!resetToken?.User) {
        return null;
      }

      const user = resetToken.User;
      await user.update({ password: await bcrypt.hash(password, 10), tokenVersion: (user.tokenVersion || 0) + 1 }, { transaction });
      await resetToken.update({ usedAt: new Date() }, { transaction });
      await PasswordResetToken.update({ usedAt: new Date() }, { where: { userId: user.id, usedAt: null }, transaction });
      await PasswordResetHistorico.create({ userId: user.id, email: user.email, evento: 'redefinicao', sucesso: true, detalhes: 'Senha redefinida; sessões revogadas', ...requestMeta }, { transaction });
      return { message: 'Senha redefinida com sucesso. Entre novamente com a nova senha.' };
    });
    if (!result) {
      await PasswordResetHistorico.create({ email: '[token inválido]', evento: 'redefinicao', sucesso: false, detalhes: 'Token inválido, usado ou expirado', ...requestMeta });
      throw new AppError('Link de redefinição inválido ou expirado.', 400, 'INVALID_RESET_TOKEN');
    }
    return result;
  }

  static async history(isAdm, { page = 1, limit = 30 } = {}) {
    if (!isAdm) throw new AppError('Apenas administradores podem consultar esta rastreabilidade.', 403, 'FORBIDDEN');
    const { rows, count } = await PasswordResetHistorico.findAndCountAll({
      include: [{ model: User, attributes: ['id', 'username', 'email'], required: false }],
      order: [['createdAt', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });
    return { data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
  }
}

module.exports = PasswordResetService;
