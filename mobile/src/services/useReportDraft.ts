import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { openDraftStore, type DraftContent } from './draftService';

export function useReportDraft(api: string, userId: number, content: DraftContent, restore: (value: DraftContent) => void) {
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('Carregando rascunho…');
  const [submissionKey, setSubmissionKey] = useState<string | undefined>();
  const key = useRef<string | undefined>(undefined);
  const [missingPhotos, setMissingPhotos] = useState(0);
  const missing = useRef(0);
  const store = useRef<Awaited<ReturnType<typeof openDraftStore>> | null>(null);
  const latest = useRef(content); latest.current = content;
  const stopped = useRef(false);
  const active = useRef(true);
  async function save() {
    if (!store.current || stopped.current) return;
    if (key.current && missing.current) return;
    const snapshot = { ...latest.current, submissionKey: key.current };
    try { await store.current.save(snapshot); if (active.current) setNotice('Rascunho salvo neste aparelho.'); }
    catch { if (active.current) setNotice('Não foi possível salvar o rascunho. Confira o espaço disponível antes de sair.'); }
  }
  useEffect(() => {
    active.current = true;
    void openDraftStore(api, userId).then(async (value) => {
      store.current = value;
      const loaded = await value.load();
      if (!active.current) return;
      if (loaded) { key.current = loaded.draft.submissionKey; setSubmissionKey(key.current); missing.current = loaded.missingPhotos; setMissingPhotos(loaded.missingPhotos); restore(loaded.draft); setNotice(loaded.missingPhotos ? `Rascunho recuperado. ${loaded.missingPhotos} foto(s) indisponível(is); adicione novamente.` : 'Rascunho recuperado deste aparelho.'); }
      else setNotice('Seu rascunho será salvo neste aparelho.');
      setReady(true);
    }).catch(() => { if (active.current) { setNotice('Armazenamento indisponível. Não saia antes de concluir o envio.'); setReady(true); } });
    const subscription = AppState.addEventListener('change', (state) => { if (state !== 'active') void save(); });
    return () => { active.current = false; subscription.remove(); void save(); };
    // The screen is remounted when the authenticated owner changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, userId]);
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => void save(), 500);
    return () => clearTimeout(timer);
  }, [content.input, content.photos, content.latitude, content.longitude, ready]);
  async function discard(completed = false) {
    stopped.current = completed;
    await store.current?.discard();
    if (active.current) setNotice(completed ? '' : 'Rascunho descartado.');
  }
  async function prepareSubmission() {
    if (!store.current) throw Error('Armazenamento indisponível');
    const nextKey = key.current ?? randomUUID();
    // Persist the exact body and durable photos before any request can reach the server.
    const saved = await store.current.save({ ...latest.current, submissionKey: nextKey });
    key.current = nextKey; setSubmissionKey(nextKey); return saved;
  }
  async function releaseSubmission() {
    if (!store.current) return;
    await store.current.save({ ...latest.current, submissionKey: undefined });
    key.current = undefined; setSubmissionKey(undefined); missing.current = 0; setMissingPhotos(0);
  }
  return { ready, notice, discard, flush: save, submissionKey, missingPhotos, prepareSubmission, releaseSubmission };
}
