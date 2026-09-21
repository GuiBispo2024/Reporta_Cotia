const router = require('express').Router();
const auth = require('../middlewares/auth');
const requirePermission = require('../middlewares/requirePermission');
const BoardService = require('../services/BoardService');
const { PERMISSIONS } = require('../constants/accessControl');

router.use(auth);

router.get('/mine', async (req, res, next) => {
  try { res.json(await BoardService.getBoard(req.user, req.query)); }
  catch (error) { next(error); }
});

router.get('/public', requirePermission(PERMISSIONS.DASHBOARD_PUBLIC_VIEW), async (req, res, next) => {
  try { res.json(await BoardService.getBoard(req.user, req.query, 'public')); }
  catch (error) { next(error); }
});

router.get('/analytics', requirePermission(PERMISSIONS.DASHBOARD_FULL_VIEW), async (req, res, next) => {
  try { res.json(await BoardService.getBoard(req.user, req.query, 'analytical')); }
  catch (error) { next(error); }
});

/**
 * @swagger
 * /boards/analytics/export:
 *   get:
 *     summary: Exporta as denúncias do board analítico em XLSX
 *     description: Requer as permissões dashboard.full.view e dashboard.export. Os filtros de categoria, setor, bairro e período são os mesmos do board analítico. Cada exportação concluída é registrada na auditoria.
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categoria
 *         schema: { type: string }
 *       - in: query
 *         name: setorResponsavel
 *         schema: { type: string }
 *       - in: query
 *         name: bairro
 *         schema: { type: string }
 *       - in: query
 *         name: dataInicio
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: dataFim
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Planilha Excel formatada com os registros filtrados
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema: { type: string, format: binary }
 *       400:
 *         description: Filtros inválidos
 *       401:
 *         description: Sessão não autenticada
 *       403:
 *         description: Permissão de exportação ausente
 */
router.get('/analytics/export',
  requirePermission(PERMISSIONS.DASHBOARD_FULL_VIEW),
  requirePermission(PERMISSIONS.DASHBOARD_EXPORT),
  async (req, res, next) => {
    try {
      const result = await BoardService.exportAnalytics(req.user, req.query);
      res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.attachment(result.filename);
      res.set('X-Total-Count', String(result.total));
      res.send(result.content);
    } catch (error) { next(error); }
  });

module.exports = router;
