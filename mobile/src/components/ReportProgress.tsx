import { Text, View } from 'react-native';
import { Icon } from './Icon';
import { theme } from '../theme';

/** As etapas refletem o estado atual; não estimam prazo nem percentual de atendimento. */
export function ReportProgress({ status, resolution }: { status: string; resolution: string }) {
  if (!['pendente', 'rejeitada', 'aprovada'].includes(status)) return null;
  const rejected = status === 'rejeitada';
  const resolved = status === 'aprovada' && resolution === 'resolvida';
  const current = status !== 'aprovada' ? 1 : resolved ? 3 : 2;
  return <View style={{ flexDirection: 'row', gap: 4 }}>
    {['Enviada', 'Moderação', 'Atendimento', 'Resolvida'].map((label, index) => {
      const done = index < current || resolved;
      const active = index === current;
      const color = active && rejected ? theme.colors.danger : done || active ? theme.colors.primary : theme.colors.muted;
      const state = done ? 'concluída' : active ? rejected ? 'rejeitada' : 'etapa atual' : 'ainda não alcançada';
      return <View key={label} accessible accessibilityLabel={`Etapa ${index + 1} de 4: ${label}, ${state}`} style={{ flex: 1, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? theme.colors.primary : active && rejected ? theme.colors.dangerTint : theme.colors.tint, borderWidth: active ? 2 : 0, borderColor: color }}>
            {done ? <Icon name="check-circle-fill" size={18} color={theme.colors.onPrimary} />
              : active ? <Icon name={rejected ? 'exclamation-triangle' : 'clock'} size={16} color={color} />
                : <Text style={{ fontSize: 13, color }}>{index + 1}</Text>}
          </View>
          {index < 3 && <View style={{ flex: 1, height: 2, backgroundColor: index < current ? theme.colors.primary : theme.colors.border }} />}
        </View>
        <Text style={{ fontSize: 11, lineHeight: 16, fontWeight: active ? '700' : '500', color }}>{label}</Text>
      </View>;
    })}
  </View>;
}
