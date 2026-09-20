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

module.exports = router;
