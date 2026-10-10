import { Directory, File, Paths } from 'expo-file-system';
import { digestStringAsync, CryptoDigestAlgorithm, randomUUID } from 'expo-crypto';
import type { ReportInput } from './reportService';
import type { ReportPhoto } from './photoService';

export type Draft = { version: 1; id: string; revision: number; input: ReportInput;
  latitude: string; longitude: string; photos: ReportPhoto[]; updatedAt: string; submissionKey?: string; ownerKey?: string };
export type DraftContent = Pick<Draft, 'input' | 'latitude' | 'longitude' | 'photos' | 'submissionKey'>;
const queues = new Map<string, Promise<unknown>>();
export async function openDraftStore(api: string, userId: number, scope = 'new') {
  const ownerKey = await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${api}|${userId}`);
  const key = await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${api}|${userId}|${scope}`);
  const directory = new Directory(Paths.document, 'report-drafts', key);
  const prefix = `${directory.uri.replace(/\/+$/, '')}/`;
  directory.create({ intermediates: true, idempotent: true });
  const slots = [new File(directory, '0.json'), new File(directory, '1.json')];
  function serialized<T>(action: () => Promise<T>): Promise<T> {
    const result = (queues.get(key) ?? Promise.resolve()).then(action, action);
    queues.set(key, result.catch(() => {})); return result;
  }
  async function records() {
    const values = await Promise.all(slots.map(async (file) => {
      try {
        if (!file.exists) return null;
        const draft = await file.json() as Draft;
        if (draft.version !== 1 || typeof draft.id !== 'string' || !Number.isSafeInteger(draft.revision)
          || !draft.input || !['titulo', 'descricao', 'localizacao', 'bairro', 'categoria'].every((field) => typeof draft.input[field as keyof ReportInput] === 'string')
          || typeof draft.latitude !== 'string' || typeof draft.longitude !== 'string'
          || (draft.submissionKey !== undefined && !/^[0-9a-f-]{36}$/i.test(draft.submissionKey))
          || !Array.isArray(draft.photos) || draft.photos.length > 4
          || draft.photos.some((photo) => typeof photo.uri !== 'string' || !photo.uri.startsWith(prefix) || photo.uri.slice(prefix.length).includes('/') || photo.type !== 'image/jpeg' || typeof photo.name !== 'string')) return null;
        return draft;
      } catch { return null; }
    }));
    return values.filter((draft): draft is Draft => draft !== null).sort((a, b) => b.revision - a.revision);
  }
  return {
    load: () => serialized(async () => {
      const draft = (await records())[0];
      if (!draft) return null;
      const photos = draft.photos.filter((photo) => new File(photo.uri).exists);
      return { draft: { ...draft, photos }, missingPhotos: draft.photos.length - photos.length };
    }),
    save: (content: DraftContent) => serialized(async () => {
      directory.create({ intermediates: true, idempotent: true });
      const previous = (await records())[0];
      const photos = content.photos.map((photo) => {
        if (photo.uri.startsWith(prefix) && new File(photo.uri).exists) return photo;
        const destination = new File(directory, `${randomUUID()}.jpg`);
        new File(photo.uri).copy(destination);
        return { ...photo, uri: destination.uri };
      });
      const draft: Draft = { ...content, photos, version: 1, ownerKey, id: previous?.id ?? randomUUID(),
        revision: (previous?.revision ?? 0) + 1, updatedAt: new Date().toISOString() };
      slots[draft.revision % 2]!.write(JSON.stringify(draft));
      // Preserve both snapshots, including their photos, for recovery from an interrupted write.
      const keep = new Set((await records()).flatMap((record) => record.photos.map((photo) => photo.uri)));
      directory.list().forEach((file) => { if (file instanceof File && file.name.endsWith('.jpg') && !keep.has(file.uri)) file.delete(); });
      return draft;
    }),
    discard: () => serialized(async () => { if (directory.exists) directory.delete(); }),
  };
}
export async function clearAccountDrafts(api: string, userId: number) {
  await (await openDraftStore(api, userId)).discard();
  const ownerKey = await digestStringAsync(CryptoDigestAlgorithm.SHA256, `${api}|${userId}`);
  const root = new Directory(Paths.document, 'report-drafts');
  if (!root.exists) return;
  for (const directory of root.list()) {
    if (!(directory instanceof Directory)) continue;
    for (const slot of ['0.json', '1.json']) {
      try {
        const file = new File(directory, slot);
        if (file.exists && (await file.json()).ownerKey === ownerKey) { directory.delete(); break; }
      } catch { /* Other accounts or invalid files are never removed. */ }
    }
  }
}
