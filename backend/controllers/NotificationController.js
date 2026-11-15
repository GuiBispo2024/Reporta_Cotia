const router = require('express').Router();
const auth = require('../middlewares/auth');
const NotificationService = require('../services/NotificationService');
router.use(auth, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (req.get('X-Push-Account') && req.get('X-Push-Account') !== String(req.user.id)) return res.status(409).json({ message: 'A conta mudou durante a operação.', code: 'PUSH_ACCOUNT_CHANGED' });
  next();
});
/**
 * @swagger
 * /notifications/preferences:
 *   get:
 *     summary: Consulta preferências e dispositivos da própria conta, sem tokens
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: enabled e devices (id, platform, enabled, lastSeenAt) }
 *       401: { description: Sessão ausente ou expirada }
 *   patch:
 *     summary: Altera enabled da própria conta; desativar cancela entregas pendentes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Preferências atualizadas }
 * /notifications/devices:
 *   post:
 *     summary: Registra instalação e token Expo na sessão autenticada
 *     description: Exige installationId UUID, expoPushToken, platform android/ios e consent booleano. consent true é ativação explícita; false renova vínculo existente ou transfere a instalação desativada para uma nova conta. Nunca recebe userId ou sessionId do cliente.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Dispositivo sem token na resposta }
 *       400: { description: Parâmetros inválidos }
 *       409: { description: Token vinculado a outra instalação }
 * /notifications/devices/{id}:
 *   delete:
 *     summary: Remove um dispositivo da própria conta (idempotente)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Sem conteúdo, inclusive para IDs de outra conta }
 * /notifications/events/{id}:
 *   get:
 *     summary: Resolve evento da própria conta para detalhes autorizados
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: eventId e denunciaId autorizados }
 *       404: { description: Evento de outra conta ou denúncia removida }
 */
router.get('/preferences', async (req, res, next) => {
  try { res.json(await NotificationService.preferences(req.user.id)); } catch (error) { next(error); }
});
router.patch('/preferences', async (req, res, next) => {
  try { res.json(await NotificationService.setPreferences(req.user.id, req.body)); } catch (error) { next(error); }
});
router.post('/devices', async (req, res, next) => {
  try { res.json(await NotificationService.register(req.user.id, req.authSession.id, req.body)); } catch (error) { next(error); }
});
router.delete('/devices/:id', async (req, res, next) => {
  try { await NotificationService.removeDevice(req.user.id, req.params.id, req.get('If-Match')); res.sendStatus(204); } catch (error) { next(error); }
});
router.get('/events/:id', async (req, res, next) => {
  try { res.json(await NotificationService.resolve(req.user.id, req.params.id)); } catch (error) { next(error); }
});
module.exports = router;
