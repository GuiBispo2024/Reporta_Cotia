import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';
import type { AxiosInstance } from 'axios';
import { getEnvironment } from '../config/environment';
import { pushUuid } from './notificationService';
export type PushBinding = { apiBaseUrl: string; userId: number; deviceId: string; version: number; installationId: string; expoPushToken: string; platform: 'android' | 'ios'; enabled: boolean; pendingRemoval: boolean };
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(action: () => Promise<T>): Promise<T> { const result = queue.then(action, action); queue = result.catch(() => {}); return result; }
const key = () => `reporta-push-${getEnvironment().appEnv}`;
async function read(): Promise<PushBinding | null> {
  const raw = await SecureStore.getItemAsync(key());
  if (!raw) return null;
  let value: PushBinding;
  try { value = JSON.parse(raw) as PushBinding; } catch { return null; }
  if (!value || !Number.isSafeInteger(value.userId) || !pushUuid.test(value.deviceId) || !pushUuid.test(value.installationId) || !Number.isSafeInteger(value.version) || value.version < 1
    || typeof value.expoPushToken !== 'string' || typeof value.apiBaseUrl !== 'string' || !['android', 'ios'].includes(value.platform) || typeof value.enabled !== 'boolean' || typeof value.pendingRemoval !== 'boolean') return null;
  return value;
}
export function loadPushBinding() { return serial(read); }
export function savePushBinding(value: PushBinding) { return serial(() => SecureStore.setItemAsync(key(), JSON.stringify(value))); }
export function clearPushBinding(value: PushBinding) {
  return serial(async () => {
    const current = await read();
    if (current?.userId === value.userId && current.deviceId === value.deviceId && current.version === value.version) await SecureStore.deleteItemAsync(key());
  });
}
export function installationId() {
  return serial(async () => {
    const storageKey = `reporta-installation-${getEnvironment().appEnv}`;
    const stored = await SecureStore.getItemAsync(storageKey);
    if (stored && pushUuid.test(stored)) return stored;
    const value = randomUUID(); await SecureStore.setItemAsync(storageKey, value); return value;
  });
}
// No native Notifications import here: authentication must work in Expo Go and
// without push credentials. The tombstone is retained if the network is offline.
export async function detachPushOnLogout(raw: AxiosInstance, accessToken: string | undefined, userId: number | undefined, apiBaseUrl: string) {
  const binding = await serial(async () => {
    const current = await read();
    if (!current || current.apiBaseUrl !== apiBaseUrl || current.userId !== userId) return null;
    const next = { ...current, enabled: false, pendingRemoval: true };
    await SecureStore.setItemAsync(key(), JSON.stringify(next)); return next;
  });
  if (!binding || !accessToken) return;
  try {
    await raw.delete(`notifications/devices/${binding.deviceId}`, { headers: { Authorization: `Bearer ${accessToken}`, 'If-Match': String(binding.version) } });
    await clearPushBinding(binding);
  } catch { /* Retried by the push provider after the next authentication. */ }
}
