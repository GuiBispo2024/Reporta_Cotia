const router = require('express').Router();
const CommunityService = require('../services/CommunityService');

// Deliberately separate from the authenticated /boards router. Same minimal
// approved-only response for visitors and accounts; no user-specific data.
/**
 * @swagger
 * /community:
 *   get:
 *     summary: Consulta indicadores atuais e pontos aproximados da comunidade
 *     description: Leitura anônima de denúncias aprovadas. Sem endereço, coordenadas exatas ou dados da conta. Pontos na grade de 0.01 grau, no máximo 500 dos mais recentes com coordenadas válidas. Summary inclui também aprovadas sem GPS; categorias e resumo respeitam os mesmos filtros.
 *     tags: [Comunidade]
 *     security: []
 *     parameters:
 *       - { in: query, name: categoria, schema: { type: string, maxLength: 120 } }
 *       - { in: query, name: resolucaoStatus, schema: { type: string, enum: [aberta, em_andamento, resolvida] } }
 *     responses:
 *       200: { description: scope=community, generatedAt, source=live, summary, categories, points, total, limit=500, truncated, filters e privacy }
 *       400: { description: Filtro desconhecido, inválido ou tentativa de selecionar status privado }
 */
router.get('/', async (req, res, next) => {
  try { res.set('Cache-Control', 'no-store'); res.json(await CommunityService.get(req.query)); }
  catch (error) { next(error); }
});
module.exports = router;
