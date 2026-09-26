const { Denuncia, DenunciaHistorico } = require('../models/rel');
const { refreshAnalytics } = require('./process');

// Coalesce changes outside HTTP requests; retain dirty state when processing fails.
function startAnalyticsWorker({ debounceMs = 500, retryMs = 30000, reconcileMs = 300000, refresh = refreshAnalytics } = {}) {
  let dirty = true, stopped = false, timer, current;
  const schedule = delay => {
    if (stopped || timer || current) return;
    timer = setTimeout(() => { timer = null; void flush(); }, delay);
    timer.unref?.();
  };
  const invalidate = () => { dirty = true; schedule(debounceMs); };
  const changed = (...args) => {
    const options = args[args.length - 1];
    if (options?.transaction) options.transaction.afterCommit(invalidate);
    else invalidate();
  };
  const flush = () => {
    if (stopped) return Promise.resolve();
    if (current) return current;
    clearTimeout(timer);
    timer = null;
    if (!dirty) return Promise.resolve();
    dirty = false;
    let failed = false;
    current = Promise.resolve().then(refresh).catch(error => {
      dirty = true;
      failed = true;
      // Detailed run metadata is recorded by the processor; do not log SQL or source data.
      console.warn('Atualização analítica pendente.', error.code === 'ANALYTICS_BUSY' ? 'ANALYTICS_BUSY' : 'PROCESSING_FAILED');
    }).finally(() => {
      current = null;
      if (dirty) schedule(failed ? retryMs : debounceMs);
    });
    return current;
  };
  const hooks = ['afterCreate', 'afterUpdate', 'afterDestroy', 'afterBulkCreate', 'afterBulkUpdate', 'afterBulkDestroy'];
  for (const model of [Denuncia, DenunciaHistorico]) {
    for (const hook of hooks) model.addHook(hook, 'analytics-refresh', changed);
  }
  // Reconcile external SQL changes or changes made by another application instance.
  const interval = setInterval(invalidate, reconcileMs);
  interval.unref?.();
  schedule(0);
  return {
    flush,
    async stop() {
      stopped = true;
      clearTimeout(timer);
      clearInterval(interval);
      for (const model of [Denuncia, DenunciaHistorico]) {
        for (const hook of hooks) model.removeHook(hook, 'analytics-refresh');
      }
      await current;
    }
  };
}
module.exports = { startAnalyticsWorker };
