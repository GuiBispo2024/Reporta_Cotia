import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { ApiError } from '../utils/ApiError';

export type ReportPhoto = { uri: string; name: string; type: 'image/jpeg' };
export async function selectPhotos(source: 'camera' | 'library', remaining: number): Promise<ReportPhoto[]> {
  if (remaining <= 0) throw new ApiError('Você pode anexar até quatro fotos.', 'IMAGE_LIMIT');
  const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new ApiError('Permita o acesso nas configurações do celular ou envie a denúncia sem fotos.', 'PERMISSION_DENIED');
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
    : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 1 });
  if (result.canceled) return [];
  const photos: ReportPhoto[] = [];
  for (const asset of result.assets.slice(0, remaining)) {
    const context = ImageManipulator.manipulate(asset.uri);
    if (Math.max(asset.width, asset.height) > 2048) context.resize(asset.width >= asset.height ? { width: 2048 } : { height: 2048 });
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75 });
      photos.push({ uri: saved.uri, name: `denuncia-${Date.now()}-${photos.length}.jpg`, type: 'image/jpeg' });
    } finally { image.release(); context.release(); }
  }
  return photos;
}
