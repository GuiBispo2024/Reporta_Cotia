import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Button } from './Button';
import { getEnvironment } from '../config/environment';
import { resolveImageUrl } from '../utils/imageUrl';
import type { Report } from '../services/reportService';
import { theme } from '../theme';
import { Icon } from './Icon';

export function ReportImages({ report }: { report: Report }) {
  const environment = getEnvironment();
  const { width } = useWindowDimensions();
  const photoWidth = Math.max(140, Math.min(360, width - 94));
  const [selected, setSelected] = useState<string | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [retry, setRetry] = useState(0);
  const urls = [...new Set([...(report.imageUrls ?? []), ...(report.imageUrl ? [report.imageUrl] : [])])]
    .map((url) => resolveImageUrl(url, environment.apiBaseUrl, environment.appEnv === 'development')).filter((url): url is string => !!url);
  if (!urls.length) return null;
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon name="images" /><Text accessibilityRole="header" style={{ ...theme.typography.heading, flex: 1 }}>Fotos da denúncia</Text></View>
    <ScrollView horizontal contentContainerStyle={{ gap: 12 }}>{urls.map((uri, index) => <Pressable key={uri} accessibilityRole="button" accessibilityLabel={`Ampliar foto ${index + 1}`}
      onPress={() => setSelected(uri)} style={{ width: photoWidth, gap: 8 }}>
      {failed.includes(uri) ? <View style={{ width: photoWidth, aspectRatio: 1.5, padding: 16, borderRadius: 12, backgroundColor: theme.colors.tint, alignItems: 'center', justifyContent: 'center', gap: 8 }}><Icon name="image" /><Text>Foto indisponível. Toque para tentar abrir.</Text></View>
        : <Image source={{ uri }} accessibilityLabel={`Foto ${index + 1} da denúncia`} resizeMode="cover" style={{ width: photoWidth, aspectRatio: 1.5, borderRadius: 12 }} onError={() => setFailed((current) => [...current, uri])} />}
      <Text style={{ ...theme.typography.caption, color: theme.colors.muted }}>Foto {index + 1} de {urls.length}</Text>
    </Pressable>)}</ScrollView>
    <Modal visible={selected !== null} onRequestClose={() => setSelected(null)} animationType="fade">
      <View style={{ flex: 1, backgroundColor: theme.colors.background, padding: 24, paddingTop: 56, gap: 16 }}>
        <Button title="Fechar foto" onPress={() => setSelected(null)} />
        {selected && <>
          {failed.includes(selected) && <>
            <Text accessibilityRole="alert">Não foi possível carregar esta foto.</Text>
            <Button title="Tentar carregar foto" onPress={() => { setFailed((current) => current.filter((uri) => uri !== selected)); setRetry((value) => value + 1); }} />
          </>}
          <Image key={`${selected}-${retry}`} source={{ uri: selected }} accessibilityLabel="Foto ampliada da denúncia" resizeMode="contain" style={{ flex: 1 }}
            onError={() => setFailed((current) => current.includes(selected) ? current : [...current, selected])} />
        </>}
      </View>
    </Modal>
  </View>;
}
