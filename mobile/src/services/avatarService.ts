import type { AxiosInstance } from 'axios';
import type { ReportPhoto } from './photoService';
export async function uploadAvatar(client: AxiosInstance, photo: ReportPhoto) {
  const form = new FormData();
  form.append('avatar', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
  await client.post('users/avatar', form);
}
export async function removeAvatar(client: AxiosInstance) { await client.delete('users/avatar'); }
