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

/**
 * @swagger
 * /boards/public/heatmap:
 *   get:
 *     summary: Consulta o mapa de calor público das denúncias
 *     description: Retorna somente células geográficas agregadas de denúncias aprovadas. Células com menos de três registros são omitidas e nenhum endereço, título ou identificador é exposto.
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: categoria, schema: { type: string } }
 *       - { in: query, name: setorResponsavel, schema: { type: string } }
 *       - { in: query, name: bairro, schema: { type: string } }
 *       - { in: query, name: dataInicio, schema: { type: string, format: date } }
 *       - { in: query, name: dataFim, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Células agregadas do mapa de calor público }
 *       400: { description: Filtros inválidos }
 *       401: { description: Sessão não autenticada }
 *       403: { description: Permissão dashboard.public.view ausente }
 */
router.get('/public/heatmap',
  requirePermission(PERMISSIONS.DASHBOARD_PUBLIC_VIEW),
  async (req, res, next) => {
    try { res.json(await BoardService.getHeatmap(req.user, req.query, 'public')); }
    catch (error) { next(error); }
  });

/**
 * @swagger
 * /boards/public/map-points:
 *   get:
 *     summary: Consulta denúncias aprovadas como pontos no mapa público
 *     description: Retorna até 500 denúncias aprovadas com coordenadas e dados públicos para abertura dos detalhes. Respeita os mesmos filtros do board comunitário e requer dashboard.public.view.
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: categoria, schema: { type: string } }
 *       - { in: query, name: setorResponsavel, schema: { type: string } }
 *       - { in: query, name: bairro, schema: { type: string } }
 *       - { in: query, name: dataInicio, schema: { type: string, format: date } }
 *       - { in: query, name: dataFim, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Denúncias aprovadas localizadas no mapa }
 *       400: { description: Filtros inválidos }
 *       401: { description: Sessão não autenticada }
 *       403: { description: Permissão dashboard.public.view ausente }
 */
router.get('/public/map-points',
  requirePermission(PERMISSIONS.DASHBOARD_PUBLIC_VIEW),
  async (req, res, next) => {
    try { res.json(await BoardService.getMapPoints(req.user, req.query, 'public')); }
    catch (error) { next(error); }
  });

router.get('/public', requirePermission(PERMISSIONS.DASHBOARD_PUBLIC_VIEW), async (req, res, next) => {
  try { res.json(await BoardService.getBoard(req.user, req.query, 'public')); }
  catch (error) { next(error); }
});

/**
 * @swagger
 * /boards/analytics/heatmap:
 *   get:
 *     summary: Consulta o mapa de calor analítico das denúncias
 *     description: Retorna células geográficas agregadas do recorte analítico. Células com menos de três registros são omitidas e nenhum endereço, título ou identificador é exposto.
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: categoria, schema: { type: string } }
 *       - { in: query, name: setorResponsavel, schema: { type: string } }
 *       - { in: query, name: bairro, schema: { type: string } }
 *       - { in: query, name: dataInicio, schema: { type: string, format: date } }
 *       - { in: query, name: dataFim, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Células agregadas do mapa de calor analítico }
 *       400: { description: Filtros inválidos }
 *       401: { description: Sessão não autenticada }
 *       403: { description: Permissão dashboard.full.view ausente }
 */
router.get('/analytics/heatmap',
  requirePermission(PERMISSIONS.DASHBOARD_FULL_VIEW),
  async (req, res, next) => {
    try { res.json(await BoardService.getHeatmap(req.user, req.query, 'analytical')); }
    catch (error) { next(error); }
  });

/**
 * @swagger
 * /boards/analytics/map-points:
 *   get:
 *     summary: Consulta denúncias como pontos no mapa analítico
 *     description: Retorna até 500 denúncias do recorte autorizado com coordenadas e dados necessários para abertura dos detalhes. Respeita os filtros do board e requer dashboard.full.view.
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - { in: query, name: categoria, schema: { type: string } }
 *       - { in: query, name: setorResponsavel, schema: { type: string } }
 *       - { in: query, name: bairro, schema: { type: string } }
 *       - { in: query, name: dataInicio, schema: { type: string, format: date } }
 *       - { in: query, name: dataFim, schema: { type: string, format: date } }
 *     responses:
 *       200: { description: Denúncias autorizadas localizadas no mapa }
 *       400: { description: Filtros inválidos }
 *       401: { description: Sessão não autenticada }
 *       403: { description: Permissão dashboard.full.view ausente }
 */
router.get('/analytics/map-points',
  requirePermission(PERMISSIONS.DASHBOARD_FULL_VIEW),
  async (req, res, next) => {
    try { res.json(await BoardService.getMapPoints(req.user, req.query, 'analytical')); }
    catch (error) { next(error); }
  });

router.get('/analytics', requirePermission(PERMISSIONS.DASHBOARD_FULL_VIEW), async (req, res, next) => {
  try { res.json(await BoardService.getBoard(req.user, req.query, 'analytical')); }
  catch (error) { next(error); }
});

/**
 * @swagger
 * /boards/analytics/export-history:
 *   get:
 *     summary: Consulta a auditoria de exportações do board
 *     description: Lista metadados das exportações XLSX. Requer a permissão dashboard.audit.view, atribuída por padrão somente ao perfil ADMIN.
 *     tags: [Boards]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 50, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, oldest], default: newest }
 *     responses:
 *       200:
 *         description: Histórico paginado sem conteúdo das planilhas
 *       400: { description: Paginação ou ordenação inválida }
 *       401: { description: Sessão não autenticada }
 *       403: { description: Permissão dashboard.audit.view ausente }
 */
router.get('/analytics/export-history',
  requirePermission(PERMISSIONS.DASHBOARD_AUDIT_VIEW),
  async (req, res, next) => {
    try { res.json(await BoardService.getExportHistory(req.user, req.query)); }
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
