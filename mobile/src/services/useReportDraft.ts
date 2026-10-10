import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { openDraftStore, type DraftContent } from './draftService';

export function useReportDraft(api: string, userId: number, content: DraftContent, restore: (value: DraftContent) => void) {
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('Carregando rascunho…');
  const store = useRef<Awaited<ReturnType<typeof openDraftStore>> | null>(null);
  const latest = useRef(content); latest.current = content;
  const stopped = useRef(false);
  const active = useRef(true);
  async function save() {
    if (!store.current || stopped.current) return;
    const snapshot = latest.current;
    try { await store.current.save(snapshot); if (active.current) setNotice('Rascunho salvo neste aparelho.'); }
    catch { if (active.current) setNotice('Não foi possível salvar o rascunho. Confira o espaço disponível antes de sair.'); }
  }
  useEffect(() => {
    active.current = true;
    void openDraftStore(api, userId).then(async (value) => {
      store.current = value;
      const loaded = await value.load();
      if (!active.current) return;
      if (loaded) { restore(loaded.draft); setNotice(loaded.missingPhotos ? `Rascunho recuperado. ${loaded.missingPhotos} foto(s) indisponível(is); adicione novamente.` : 'Rascunho recuperado deste aparelho.'); }
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
  return { ready, notice, discard, flush: save };
}
