import type { AxiosInstance } from 'axios';
import { ApiError } from '../utils/ApiError';
export const pushUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export type PushDevice = { id: string; platform: 'android' | 'ios'; enabled: boolean; version: number; lastSeenAt: string };
export type PushPreferences = { enabled: boolean; devices: PushDevice[] };
export type DeviceRegistration = { installationId: string; expoPushToken: string; platform: 'android' | 'ios'; consent: boolean };
function parseDevice(data: any): PushDevice {
  if (!data || typeof data.id !== 'string' || !pushUuid.test(data.id) || !['android', 'ios'].includes(data.platform) || typeof data.enabled !== 'boolean'
    || !Number.isSafeInteger(data.version) || data.version < 1 || !Number.isFinite(Date.parse(data.lastSeenAt))) throw new ApiError('Resposta de dispositivo inválida.', 'INVALID_RESPONSE');
  return { id: data.id, platform: data.platform, enabled: data.enabled, version: data.version, lastSeenAt: data.lastSeenAt };
}
const account = (id?: number) => id === undefined ? {} : { 'X-Push-Account': String(id) };
export async function getPushPreferences(client: AxiosInstance, userId?: number): Promise<PushPreferences> {
  const { data } = await client.get('notifications/preferences', { headers: account(userId) });
  if (!data || typeof data.enabled !== 'boolean' || !Array.isArray(data.devices)) throw new ApiError('Preferências inválidas.', 'INVALID_RESPONSE');
  return { enabled: data.enabled, devices: data.devices.map(parseDevice) };
}
export async function setPushPreference(client: AxiosInstance, enabled: boolean, userId?: number) { await client.patch('notifications/preferences', { enabled }, { headers: account(userId) }); }
export async function registerPushDevice(client: AxiosInstance, input: DeviceRegistration, userId?: number): Promise<PushDevice> {
  const { data } = await client.post('notifications/devices', input, { headers: account(userId) }); return parseDevice(data);
}
export async function removePushDevice(client: AxiosInstance, id: string, version: number, userId?: number) {
  await client.delete(`notifications/devices/${id}`, { headers: { 'If-Match': String(version), ...account(userId) } });
}
export async function resolvePushEvent(client: AxiosInstance, eventId: string, signal?: AbortSignal): Promise<number> {
  if (!pushUuid.test(eventId)) throw new ApiError('Notificação inválida.', 'INVALID_NOTIFICATION');
  const { data } = await client.get(`notifications/events/${eventId}`, { signal });
  if (data?.eventId !== eventId || !Number.isSafeInteger(data.denunciaId) || data.denunciaId < 1) throw new ApiError('Notificação inválida.', 'INVALID_RESPONSE');
  return data.denunciaId;
}
