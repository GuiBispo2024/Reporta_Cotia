const { Share } = require('../models/rel');
const ShareService = require('../services/ShareService');

module.exports = async ({ users, reports }) => {
  for (const key of ['obras', 'limpeza']) {
    const report = reports[key];
    if (report.status !== 'aprovada') continue;
    const data = { denunciaId: report.id, comentario: 'Compartilhando para que os moradores acompanhem o atendimento.' };
    if (!await Share.findOne({ where: { ...data, userId: users.neighbor.id } })) {
      await ShareService.compartilhar(data, users.neighbor);
    }
  }
};
