import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { Button } from './Button';
import { getEnvironment } from '../config/environment';
import { resolveImageUrl } from '../utils/imageUrl';
import type { Report } from '../services/reportService';
import { theme } from '../theme';

export function ReportImages({ report }: { report: Report }) {
  const environment = getEnvironment();
  const [selected, setSelected] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const urls = [...new Set([...(report.imageUrls ?? []), ...(report.imageUrl ? [report.imageUrl] : [])])]
    .map((url) => resolveImageUrl(url, environment.apiBaseUrl, environment.appEnv === 'development')).filter((url): url is string => !!url);
  if (!urls.length) return null;
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={theme.typography.heading}>Fotos da denúncia</Text>
    <ScrollView horizontal>{urls.map((uri, index) => <Pressable key={uri} accessibilityRole="button" accessibilityLabel={`Ampliar foto ${index + 1}`}
      onPress={() => setSelected(uri)} style={{ marginRight: 12 }}>
      {failed.includes(uri) ? <Text style={{ width: 180 }}>Foto indisponível. Toque para tentar abrir.</Text>
        : <Image source={{ uri }} accessibilityLabel={`Foto ${index + 1} da denúncia`} style={{ width: 180, height: 140, borderRadius: 8 }} onError={() => setFailed((current) => [...current, uri])} />}
    </Pressable>)}</ScrollView>
    <Modal visible={selected !== null} onRequestClose={() => setSelected(null)} animationType="fade">
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24, paddingTop: 56, gap: 16 }}>
        <Button title="Fechar foto" onPress={() => setSelected(null)} />
        {selected && <Image source={{ uri: selected }} accessibilityLabel="Foto ampliada da denúncia" resizeMode="contain" style={{ flex: 1 }} />}
      </View>
    </Modal>
  </View>;
}
