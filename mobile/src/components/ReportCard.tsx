import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Report } from '../services/reportService';
import { resolveImageUrl } from '../utils/imageUrl';
import { theme } from '../theme';
import { illustrations } from '../theme/illustrations';
import { Icon } from './Icon';
import { ReportStatus } from './ReportStatus';
import { publicAddress } from '../utils/publicAddress';

const categoryImages: Record<string, string> = { 'Buraco e pavimentação': 'obras', 'Iluminação pública': 'iluminacao', 'Limpeza urbana': 'limpeza', Saneamento: 'saneamento', 'Água e esgoto': 'saneamento', 'Trânsito e sinalização': 'transito', 'Árvore e área verde': 'meio-ambiente' };
const sectorImages: Record<string, string> = { 'Secretaria de Infraestrutura e Obras': 'obras', 'Secretaria de Mobilidade e Trânsito': 'transito', 'Secretaria do Verde e Meio Ambiente': 'meio-ambiente', 'Secretaria de Saúde': 'saude', 'Secretaria de Educação': 'educacao', 'Secretaria de Segurança Pública': 'seguranca', 'Serviço de Iluminação Pública': 'iluminacao', 'Limpeza Urbana e Zeladoria': 'limpeza', 'Defesa Civil': 'defesa-civil' };
export function ReportCard({ report, apiBaseUrl, onPress }: { report: Report; apiBaseUrl: string; onPress: () => void }) {
  const [failed, setFailed] = useState(false);
  const source = report.imageUrls?.[0] || report.imageUrl;
  const uri = source ? resolveImageUrl(source, apiBaseUrl, __DEV__) : null;
  const illustration = illustrations[sectorImages[report.setorResponsavel ?? ''] ?? categoryImages[report.categoria] ?? 'servicos-publicos'];
  return <Pressable accessibilityRole="button" accessibilityLabel={`Ver denúncia: ${report.titulo}`} onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
    <View style={styles.cover} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {uri && !failed ? <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" onError={() => setFailed(true)} />
        : <SvgXml xml={illustration ?? ''} width="100%" height="100%" />}
      {(!uri || failed) && <Text style={{ position: 'absolute', left: 10, top: 10, color: theme.colors.primaryDark, backgroundColor: theme.colors.surface, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11 }}>{failed ? 'Foto indisponível • Ilustração' : 'Imagem ilustrativa'}</Text>}
    </View>
    <View style={styles.body}>
      <View style={styles.top}><Text style={styles.category}>{report.categoria}</Text><ReportStatus status={report.status} resolution={report.resolucaoStatus} /></View>
      <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>{report.titulo}</Text>
      <Text numberOfLines={3} style={styles.description}>{report.descricao}</Text>
      <View style={styles.row}><Icon name="geo-alt-fill" size={17} /><Text numberOfLines={2} style={[styles.description, { flex: 1 }]}>{publicAddress(report.localizacao)}{report.bairro ? ` · ${report.bairro}` : ''}</Text></View>
      {!!report.setorResponsavel && <View style={styles.sector}><Icon name="building" size={16} /><Text style={{ ...theme.typography.caption, color: theme.colors.primaryDark, flex: 1 }}>{report.setorResponsavel}</Text></View>}
      <View style={styles.meta}><View style={[styles.row, { flex: 1 }]}><Icon name="person-circle" size={15} color={theme.colors.muted} /><Text numberOfLines={1} style={styles.metaText}>{report.User?.username || 'Cidadão'}</Text></View>
        <Text style={styles.metaText}>{report.createdAt && Number.isFinite(Date.parse(report.createdAt)) ? new Date(report.createdAt).toLocaleDateString('pt-BR') : `Protocolo #${report.id}`}</Text></View>
      <View style={styles.details}><Text style={{ color: theme.colors.primaryDark, fontWeight: '700', flex: 1 }}>Ver detalhes</Text><Icon name="arrow-right" size={18} /></View>
    </View>
  </Pressable>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, ...theme.shadow },
  cover: { width: '100%', aspectRatio: 16 / 9, overflow: 'hidden', borderTopLeftRadius: 17, borderTopRightRadius: 17, backgroundColor: theme.colors.tint },
  body: { padding: 18, gap: 12 }, top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  category: { backgroundColor: theme.colors.tint, borderWidth: 1, borderColor: theme.colors.tintBorder, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, fontSize: 12, fontWeight: '700', color: theme.colors.primaryDark },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '800', color: theme.colors.text }, description: { fontSize: 15, lineHeight: 23, color: theme.colors.muted },
  row: { flexDirection: 'row', gap: 7, alignItems: 'center' }, sector: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: theme.colors.tint },
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 }, metaText: { color: theme.colors.muted, fontSize: 12, flexShrink: 1 },
  details: { flexDirection: 'row', alignItems: 'center', minHeight: 46, padding: 12, borderWidth: 1, borderColor: theme.colors.tintBorder, borderRadius: 10, backgroundColor: theme.colors.tint },
});
