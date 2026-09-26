jest.mock('../../models/rel', () => ({
  Denuncia: { addHook: jest.fn(), removeHook: jest.fn() },
  DenunciaHistorico: { addHook: jest.fn(), removeHook: jest.fn() }
}));
jest.mock('../../analytics/process', () => ({ refreshAnalytics: jest.fn() }));
const { Denuncia } = require('../../models/rel');
const { startAnalyticsWorker } = require('../../analytics/worker');
let worker;
beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(async () => { await worker?.stop(); jest.useRealTimers(); jest.restoreAllMocks(); });
const changed = () => Denuncia.addHook.mock.calls.find(([name]) => name === 'afterUpdate')[2];

test('processa ao iniciar e agrupa alterações próximas sem bloquear a escrita', async () => {
  const refresh = jest.fn().mockResolvedValue();
  worker = startAnalyticsWorker({ refresh });
  await jest.advanceTimersByTimeAsync(0);
  expect(refresh).toHaveBeenCalledTimes(1);
  changed()({}, {});
  changed()({}, {});
  await jest.advanceTimersByTimeAsync(499);
  expect(refresh).toHaveBeenCalledTimes(1);
  await jest.advanceTimersByTimeAsync(1);
  expect(refresh).toHaveBeenCalledTimes(2);
});

test('aguarda o commit e reconcilia alterações externas periodicamente', async () => {
  const refresh = jest.fn().mockResolvedValue();
  worker = startAnalyticsWorker({ refresh });
  await worker.flush();
  let commit;
  changed()({}, { transaction: { afterCommit: callback => { commit = callback; } } });
  await jest.advanceTimersByTimeAsync(1000);
  expect(refresh).toHaveBeenCalledTimes(1);
  commit();
  await jest.advanceTimersByTimeAsync(500);
  expect(refresh).toHaveBeenCalledTimes(2);
  await jest.advanceTimersByTimeAsync(300000);
  expect(refresh).toHaveBeenCalledTimes(3);
});

test('não perde alterações recebidas durante processamento', async () => {
  let finish;
  const refresh = jest.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue();
  worker = startAnalyticsWorker({ refresh });
  const first = worker.flush();
  await Promise.resolve();
  changed()({}, {});
  finish();
  await first;
  await jest.advanceTimersByTimeAsync(500);
  expect(refresh).toHaveBeenCalledTimes(2);
});

test('falhas são repetidas e parar remove hooks e timers', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const refresh = jest.fn().mockRejectedValueOnce(new Error('private SQL')).mockResolvedValue();
  worker = startAnalyticsWorker({ refresh });
  await worker.flush();
  await jest.advanceTimersByTimeAsync(30000);
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(console.warn).toHaveBeenCalledWith('Atualização analítica pendente.', 'PROCESSING_FAILED');
  await worker.stop();
  await jest.advanceTimersByTimeAsync(600000);
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(Denuncia.removeHook).toHaveBeenCalledWith('afterUpdate', 'analytics-refresh');
});
