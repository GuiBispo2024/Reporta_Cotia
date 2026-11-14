import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useReportDraft } from '../src/services/useReportDraft';
import { openDraftStore, type DraftContent } from '../src/services/draftService';
jest.mock('../src/services/draftService', () => ({ openDraftStore: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => 'f1768e55-b65c-4faf-a5cc-51ac3b095676') }));
const content: DraftContent = { input: { titulo: 'Buraco', descricao: 'Na rua', localizacao: 'Rua', bairro: '', categoria: 'Outros' }, latitude: '', longitude: '', photos: [] };
test('autosave durante preparação não apaga a chave idempotente', async () => {
  let finish!: (value: any) => void;
  const store = { load: jest.fn(async () => null),
    save: jest.fn(async (body: any) => body), discard: jest.fn(async () => {}) };
  store.save.mockImplementationOnce((body) => new Promise((resolve) => { finish = () => resolve(body); }));
  jest.mocked(openDraftStore).mockResolvedValue(store);
  const hook = renderHook(() => useReportDraft('api', 1, content, jest.fn()));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  let preparing!: ReturnType<typeof hook.result.current.prepareSubmission>;
  await act(async () => { preparing = hook.result.current.prepareSubmission(); });
  await act(async () => { await hook.result.current.flush(); });
  expect(store.save.mock.calls[1]?.[0].submissionKey).toBe('f1768e55-b65c-4faf-a5cc-51ac3b095676');
  await act(async () => { finish(undefined); await preparing; });
  hook.unmount();
});

test('falha ao preparar permite editar e tentar persistir novamente', async () => {
  const store = { load: jest.fn(async () => null), save: jest.fn(async (body: any) => body), discard: jest.fn(async () => {}) };
  store.save.mockRejectedValueOnce(new Error('Sem espaço'));
  jest.mocked(openDraftStore).mockResolvedValue(store);
  const hook = renderHook(() => useReportDraft('api', 1, content, jest.fn()));
  await waitFor(() => expect(hook.result.current.ready).toBe(true));
  await act(async () => { await expect(hook.result.current.prepareSubmission()).rejects.toThrow('Sem espaço'); });
  expect(hook.result.current.submissionKey).toBeUndefined();
  await act(async () => { await hook.result.current.flush(); });
  expect(store.save.mock.calls[1]?.[0].submissionKey).toBeUndefined();
  hook.unmount();
});

test('persiste identificador antes do envio e recupera a mesma chave após reabrir', async () => {
  let stored: any = null;
  const store = { load: jest.fn(async () => stored ? { draft: stored, missingPhotos: 0 } : null), save: jest.fn(async (body) => { stored = { ...body }; return stored; }), discard: jest.fn(async () => { stored = null; }) };
  jest.mocked(openDraftStore).mockResolvedValue(store);
  const first = renderHook(() => useReportDraft('api', 1, content, jest.fn()));
  await waitFor(() => expect(first.result.current.ready).toBe(true));
  let saved: any;
  await act(async () => { saved = await first.result.current.prepareSubmission(); });
  expect(stored.submissionKey).toBe(saved.submissionKey);
  first.unmount();
  const restore = jest.fn(); const second = renderHook(() => useReportDraft('api', 1, content, restore));
  await waitFor(() => expect(second.result.current.submissionKey).toBe(saved.submissionKey));
  await act(async () => { expect((await second.result.current.prepareSubmission()).submissionKey).toBe(saved.submissionKey); });
  await act(async () => { await second.result.current.discard(true); });
  second.unmount(); expect(stored).toBeNull();
});
