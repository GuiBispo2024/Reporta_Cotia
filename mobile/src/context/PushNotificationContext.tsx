import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './AuthContext';
import { getEnvironment } from '../config/environment';
import { getPushPreferences, registerPushDevice, removePushDevice, setPushPreference, pushUuid, type PushPreferences } from '../services/notificationService';
import { clearPushBinding, installationId, loadPushBinding, savePushBinding, type PushBinding } from '../services/pushStorage';
type SDK = typeof import('expo-notifications');
type PushContext = { supported: boolean; busy: boolean; enabled: boolean; message: string; preferences: PushPreferences | null; enable: () => Promise<void>; disable: (all?: boolean) => Promise<void>; refresh: () => Promise<void>; pendingEvent: string | null; consumeEvent: (id: string) => void; notice: string; setNotice: (message: string) => void };
const noop = async () => {};
const Context = createContext<PushContext>({ supported: false, busy: false, enabled: false, message: '', preferences: null, enable: noop, disable: noop, refresh: noop, pendingEvent: null, consumeEvent: () => {}, notice: '', setNotice: () => {} });
export const usePushNotifications = () => useContext(Context);
export function parsePushIntent(data: unknown): string | null {
  const value = data as Record<string, unknown> | null;
  return value?.type === 'report_update' && typeof value.eventId === 'string' && pushUuid.test(value.eventId) ? value.eventId : null;
}
export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const { user, sessionId, client, restoring } = useAuth();
  const environment = useMemo(getEnvironment, []);
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  const supported = ['android', 'ios'].includes(Platform.OS) && Constants.executionEnvironment !== 'storeClient' && typeof projectId === 'string' && pushUuid.test(projectId);
  const [busy, setBusy] = useState(false), [enabled, setEnabled] = useState(false);
  const [preferences, setPreferences] = useState<PushPreferences | null>(null);
  const [message, setMessage] = useState(''), [notice, setNotice] = useState('');
  const [pendingEvent, setPendingEvent] = useState<string | null>(null);
  const userRef = useRef(user?.id); userRef.current = user?.id;
  const generation = useRef(0), alive = useRef(true), allowed = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const sdkRef = useRef<SDK | null>(null);
  // Lazy require keeps native registration out of authentication/Expo Go startup.
  const sdk = useCallback(async (): Promise<SDK> => { sdkRef.current ??= require('expo-notifications') as SDK; return sdkRef.current; }, []);
  const perform = useCallback((consent: boolean, disable = false, all = false): Promise<void> => {
    const owner = userRef.current, epoch = generation.current;
    const current = () => alive.current && userRef.current === owner && generation.current === epoch;
    const action = async () => {
      if (!owner || !current()) return;
      setBusy(true);
      try {
        let binding = await loadPushBinding(); if (!current()) return;
        if (binding?.apiBaseUrl !== environment.apiBaseUrl) binding = null;
        if (binding && (binding.userId !== owner || binding.pendingRemoval)) {
          if (binding.userId !== owner) {
            const device = await registerPushDevice(client, { installationId: binding.installationId, expoPushToken: binding.expoPushToken, platform: binding.platform, consent: false }, owner);
            binding = { ...binding, userId: owner, deviceId: device.id, version: device.version, enabled: false, pendingRemoval: true };
            await savePushBinding(binding);
          }
          await removePushDevice(client, binding.deviceId, binding.version, owner); await clearPushBinding(binding); binding = null;
          if (!current()) return;
        }
        if (disable) {
          allowed.current = false; setEnabled(false);
          if (all) await setPushPreference(client, false, owner);
          if (binding) {
            await savePushBinding({ ...binding, enabled: false, pendingRemoval: true });
            await removePushDevice(client, binding.deviceId, binding.version, owner); await clearPushBinding(binding);
          }
          if (supported) { const native = await sdk(); await native.dismissAllNotificationsAsync(); native.clearLastNotificationResponse(); }
          const updated = await getPushPreferences(client, owner);
          if (current()) { setPreferences(updated); setMessage('Notificações desativadas.'); }
          return;
        }
        const prefs = await getPushPreferences(client, owner); if (!current()) return;
        setPreferences(prefs);
        if (!supported) { setMessage('Configure um development build e o projeto Expo para ativar notificações.'); return; }
        if (!consent && !(binding?.enabled && prefs.enabled)) { setEnabled(false); return; }
        const native = await sdk();
        if (Platform.OS === 'android') await native.setNotificationChannelAsync('reports', { name: 'Atualizações de denúncias', importance: native.AndroidImportance.DEFAULT });
        let permission = await native.getPermissionsAsync();
        if (consent && !permission.granted) permission = await native.requestPermissionsAsync();
        if (!current()) return;
        if (!(permission.granted || permission.ios?.status === native.IosAuthorizationStatus.PROVISIONAL)) {
          allowed.current = false; setEnabled(false);
          if (binding) { await removePushDevice(client, binding.deviceId, binding.version, owner); await clearPushBinding(binding); }
          setMessage('Permissão desativada. Você pode alterá-la nas configurações do aparelho.'); return;
        }
        const install = await installationId();
        const token = (await native.getExpoPushTokenAsync({ projectId })).data;
        if (!current()) return;
        const device = await registerPushDevice(client, { installationId: install, expoPushToken: token, platform: Platform.OS as 'android' | 'ios', consent }, owner);
        const next: PushBinding = { apiBaseUrl: environment.apiBaseUrl, userId: owner, deviceId: device.id, version: device.version, installationId: install, expoPushToken: token, platform: device.platform, enabled: device.enabled, pendingRemoval: false };
        if (!current()) { await removePushDevice(client, device.id, device.version, owner).catch(() => {}); return; }
        try { await savePushBinding(next); } catch (error) { await removePushDevice(client, device.id, device.version, owner).catch(() => {}); throw error; }
        if (!current()) return;
        allowed.current = device.enabled; setEnabled(device.enabled);
        const updated = await getPushPreferences(client, owner);
        if (current()) { setPreferences(updated); setMessage(device.enabled ? 'Notificações ativadas neste aparelho.' : 'Ative as notificações para esta conta.'); }
      } catch { if (current()) setMessage('Não foi possível atualizar as notificações. Verifique sua conexão e tente novamente.'); }
      finally { if (current()) setBusy(false); }
    };
    const result = queue.current.then(action, action); queue.current = result.catch(() => {}); return result;
  }, [client, environment.apiBaseUrl, projectId, supported, sdk]);
  useEffect(() => {
    generation.current++; allowed.current = false; setEnabled(false); setBusy(false);
    if (!user) {
      setPreferences(null);
      if (sdkRef.current) { void sdkRef.current.dismissAllNotificationsAsync().catch(() => {}); sdkRef.current.clearLastNotificationResponse(); }
    } else if (!restoring) void perform(false);
  }, [user?.id, sessionId, restoring, perform]);
  useEffect(() => {
    alive.current = true;
    const listener = AppState.addEventListener('change', state => { if (state === 'active' && userRef.current) void perform(false); });
    return () => { alive.current = false; generation.current++; allowed.current = false; listener.remove(); };
  }, [perform]);
  useEffect(() => {
    if (!supported) return;
    let stopped = false; const subscriptions: { remove: () => void }[] = []; const seen = new Set<string>();
    void sdk().then(native => {
      if (stopped) return;
      native.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: allowed.current && !!userRef.current, shouldShowList: allowed.current && !!userRef.current, shouldPlaySound: false, shouldSetBadge: false }) });
      const receive = (response: ReturnType<SDK['getLastNotificationResponse']>) => {
        if (!response || response.actionIdentifier !== native.DEFAULT_ACTION_IDENTIFIER) return;
        const id = parsePushIntent(response.notification.request.content.data);
        native.clearLastNotificationResponse();
        if (id && !seen.has(id)) { seen.add(id); if (seen.size > 100) seen.delete(seen.values().next().value!); setPendingEvent(id); }
      };
      subscriptions.push(native.addNotificationResponseReceivedListener(receive));
      subscriptions.push(native.addPushTokenListener(() => { void perform(false); }));
      receive(native.getLastNotificationResponse());
    }).catch(() => { if (!stopped) setMessage('Notificações indisponíveis neste build.'); });
    return () => { stopped = true; subscriptions.forEach(s => s.remove()); sdkRef.current?.setNotificationHandler(null); };
  }, [supported, sdk, perform]);
  return <Context.Provider value={{ supported, busy, enabled, preferences, message, enable: () => perform(true), disable: all => perform(false, true, all), refresh: () => perform(false), pendingEvent, consumeEvent: id => setPendingEvent(current => current === id ? null : current), notice, setNotice }}>{children}</Context.Provider>;
}
