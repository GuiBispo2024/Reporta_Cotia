import * as Picker from 'expo-image-picker';
import { ImageManipulator } from 'expo-image-manipulator';
import { selectPhotos } from '../src/services/photoService';
import { resolveImageUrl } from '../src/utils/imageUrl';

jest.mock('expo-image-picker', () => ({ requestCameraPermissionsAsync: jest.fn(), requestMediaLibraryPermissionsAsync: jest.fn(), launchCameraAsync: jest.fn(), launchImageLibraryAsync: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({ ImageManipulator: { manipulate: jest.fn() }, SaveFormat: { JPEG: 'jpeg' } }));
test('permissão negada não abre a câmera', async () => {
  jest.mocked(Picker.requestCameraPermissionsAsync).mockResolvedValue({ granted: false } as Awaited<ReturnType<typeof Picker.requestCameraPermissionsAsync>>);
  await expect(selectPhotos('camera', 4)).rejects.toMatchObject({ code: 'PERMISSION_DENIED' });
  expect(Picker.launchCameraAsync).not.toHaveBeenCalled();
});
test('cancelamento da galeria preserva os anexos existentes', async () => {
  jest.mocked(Picker.requestMediaLibraryPermissionsAsync).mockResolvedValue({ granted: true } as Awaited<ReturnType<typeof Picker.requestMediaLibraryPermissionsAsync>>);
  jest.mocked(Picker.launchImageLibraryAsync).mockResolvedValue({ canceled: true, assets: null });
  await expect(selectPhotos('library', 2)).resolves.toEqual([]);
});
test('seleção respeita vagas e converte imagem grande para JPEG', async () => {
  jest.mocked(Picker.launchImageLibraryAsync).mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///original.heic', width: 4000, height: 3000 }] });
  const resize = jest.fn(); const release = jest.fn(); const saveAsync = jest.fn().mockResolvedValue({ uri: 'file:///prepared.jpg' });
  jest.mocked(ImageManipulator.manipulate).mockReturnValue({ resize, release, renderAsync: jest.fn().mockResolvedValue({ saveAsync, release }) } as unknown as ReturnType<typeof ImageManipulator.manipulate>);
  await expect(selectPhotos('library', 1)).resolves.toMatchObject([{ uri: 'file:///prepared.jpg', type: 'image/jpeg' }]);
  expect(resize).toHaveBeenCalledWith({ width: 2048 });
  expect(Picker.launchImageLibraryAsync).toHaveBeenLastCalledWith(expect.objectContaining({ selectionLimit: 1 }));
  await expect(selectPhotos('library', 0)).rejects.toMatchObject({ code: 'IMAGE_LIMIT' });
});
test('URLs de uploads locais usam o host alcançável e imagens externas são preservadas', () => {
  expect(resolveImageUrl('http://localhost:5000/uploads/a.webp', 'http://192.168.15.16:8081', true)).toBe('http://192.168.15.16:8081/uploads/a.webp');
  expect(resolveImageUrl('/uploads/a.webp', 'https://api.example.org', false)).toBe('https://api.example.org/uploads/a.webp');
  expect(resolveImageUrl('https://res.cloudinary.com/a.webp', 'https://api.example.org', false)).toBe('https://res.cloudinary.com/a.webp');
  expect(resolveImageUrl('javascript:alert(1)', 'https://api.example.org', false)).toBeNull();
});
