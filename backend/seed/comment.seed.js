const { Comment } = require('../models/rel');
const CommentService = require('../services/CommentService');
const filterBadWords = require('../utils/filterBadWords');

module.exports = async ({ users, reports }) => {
  const report = reports.obras;
  if (report.status !== 'aprovada') return;
  async function ensureComment(user, comentario, parentCommentId = null) {
    const where = { userId: user.id, denunciaId: report.id, parentCommentId };
    // O texto filtrado é a identidade do comentário de demonstração.
    const { filteredText } = filterBadWords(comentario);
    const existing = await Comment.findOne({ where: { ...where, comentario: filteredText } });
    if (existing) return existing;
    return (await CommentService.create({ comentario, denunciaId: report.id, parentCommentId }, user)).Comentario;
  }
  const parent = await ensureComment(users.neighbor, 'Também passo por este ponto. O buraco dificulta o acesso ao ônibus.');
  await ensureComment(users.citizen, 'Obrigado por confirmar. O local já foi encaminhado para acompanhamento.', parent.id);
  await ensureComment(users.neighbor, 'Essa merda de buraco atrapalha a passagem todos os dias.');
};
