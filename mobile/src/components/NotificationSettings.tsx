import { Linking, Text } from 'react-native';
import { usePushNotifications } from '../context/PushNotificationContext';
import { Surface } from './Surface';
import { Button } from './Button';
import { theme } from '../theme';
export function NotificationSettings() {
  const push = usePushNotifications();
  return <Surface>
    <Text accessibilityRole="header" style={theme.typography.heading}>Notificações</Text>
    <Text>Receba atualizações de aprovação e atendimento das suas denúncias. A ativação é opcional.</Text>
    <Text accessibilityLiveRegion="polite">{push.enabled ? 'Ativas neste aparelho' : 'Desativadas neste aparelho'}</Text>
    {!!push.message && <Text accessibilityRole="alert">{push.message}</Text>}
    {!!push.preferences && <Text>Dispositivos ativos: {push.preferences.devices.filter(device => device.enabled).length}</Text>}
    <Button title="Ativar notificações" disabled={push.busy || !push.supported || push.enabled} loading={push.busy} onPress={() => void push.enable()} />
    <Button title="Desativar neste aparelho" disabled={push.busy} onPress={() => void push.disable()} />
    <Button title="Desativar em todos os aparelhos" disabled={push.busy} onPress={() => void push.disable(true)} />
    <Button title="Atualizar notificações" disabled={push.busy} onPress={() => void push.refresh()} />
    <Button title="Configurações do aparelho" onPress={() => { void Linking.openSettings().catch(() => push.setNotice('Não foi possível abrir as configurações.')); }} />
  </Surface>;
}
