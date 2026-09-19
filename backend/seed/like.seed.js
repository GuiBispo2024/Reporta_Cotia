const { Like } = require('../models/rel');
const LikeService = require('../services/LikeService');

module.exports = async ({ users, reports }) => {
  for (const key of ['obras', 'iluminacao', 'limpeza', 'transito', 'arvore']) {
    const report = reports[key];
    if (report.status !== 'aprovada') continue;
    for (const user of [users.citizen, users.neighbor]) {
      if (!await Like.findOne({ where: { userId: user.id, denunciaId: report.id } })) {
        await LikeService.curtir({ denunciaId: report.id }, user);
      }
    }
  }
};
