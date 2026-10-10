import { openDraftStore } from '../src/services/draftService';
import { File } from 'expo-file-system';
jest.mock('expo-crypto', () => ({ CryptoDigestAlgorithm: { SHA256: 'sha256' }, digestStringAsync: async (_: string, key: string) => encodeURIComponent(key), randomUUID: () => `uuid-${Math.random()}` }));
jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(...parts: any[]) { this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/'); }
    get exists() { return files.has(this.uri); }
    get name() { return this.uri.split('/').pop(); }
    async json() { return JSON.parse(files.get(this.uri)!); }
    write(value: string) { files.set(this.uri, value); }
    copy(target: File) { if (!this.exists) throw Error('missing'); files.set(target.uri, files.get(this.uri)!); }
    delete() { files.delete(this.uri); }
  }
  class Directory {
    uri: string; exists = true;
    constructor(...parts: any[]) { this.uri = parts.map((part) => typeof part === 'string' ? part : part.uri).join('/'); }
    create() { this.exists = true; }
    list() { return [...files.keys()].filter((uri) => uri.startsWith(`${this.uri}/`)).map((uri) => new File(uri)); }
    delete() { this.list().forEach((file) => file.delete()); this.exists = false; }
  }
  return { File, Directory, Paths: { document: 'file://documents' } };
});
const content = { input: { titulo: 'Buraco', descricao: 'Descrição', localizacao: 'Rua', bairro: '', categoria: 'Outros' }, latitude: '', longitude: '', photos: [] };
test('rascunho sobrevive à reabertura e fica isolado por conta e API', async () => {
  const store = await openDraftStore('api-a', 1); await store.save(content);
  expect((await (await openDraftStore('api-a', 1)).load())?.draft.input.titulo).toBe('Buraco');
  expect(await (await openDraftStore('api-a', 2)).load()).toBeNull();
  expect(await (await openDraftStore('api-b', 1)).load()).toBeNull();
  await store.discard(); expect(await store.load()).toBeNull();
});
test('copia foto do cache e recupera snapshot anterior se a escrita mais recente corromper', async () => {
  const source = new File('file://cache/photo.jpg'); source.write('jpeg');
  const store = await openDraftStore('api', 3);
  const first = await store.save({ ...content, photos: [{ uri: source.uri, name: 'photo.jpg', type: 'image/jpeg' }] });
  source.delete(); expect((await store.load())?.draft.photos).toHaveLength(1);
  const second = await store.save({ ...first, input: { ...first.input, titulo: 'Novo' } });
  const folder = first.photos[0]!.uri.slice(0, first.photos[0]!.uri.lastIndexOf('/'));
  new File(folder, `${second.revision % 2}.json`).write('{broken');
  expect((await store.load())?.draft.input.titulo).toBe('Buraco');
  new File(first.photos[0]!.uri).delete(); expect((await store.load())?.missingPhotos).toBe(1);
});
