import { Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { theme } from '../theme';
export function ReportStatus({ status, resolution }: { status: string; resolution: string }) {
  const label = status === 'pendente' ? 'Aguardando moderação' : status === 'rejeitada' ? 'Rejeitada' : resolution === 'resolvida' ? 'Resolvida' : resolution === 'em_andamento' ? 'Em andamento' : 'Aberta';
  const color = status === 'rejeitada' ? theme.colors.danger : resolution === 'resolvida' && status === 'aprovada' ? theme.colors.primary : resolution === 'em_andamento' ? theme.colors.info : theme.colors.warning;
  const icon: IconName = status === 'rejeitada' ? 'exclamation-triangle' : resolution === 'resolvida' && status === 'aprovada' ? 'check-circle-fill' : 'clock';
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}><Icon name={icon} size={14} color={color} /><Text style={{ fontSize: 12, lineHeight: 18, fontWeight: '700', color, flexShrink: 1 }}>{label}</Text></View>;
}
