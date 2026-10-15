import { ActivityIndicator, Text, View } from 'react-native';
export function UploadProgress({ phase, percent }: { phase: string; percent: number | null }) {
  return <View style={{ gap: 8 }} accessibilityRole="progressbar" accessibilityLabel={phase}
    accessibilityValue={{ min: 0, max: 100, ...(percent === null ? {} : { now: percent }) }}>
    <ActivityIndicator />
    <Text accessibilityLiveRegion="polite">{phase}{percent !== null && percent < 100 ? ` (${percent}%)` : ''}</Text>
    {percent !== null && <View style={{ height: 8, backgroundColor: '#ddd', borderRadius: 4 }}><View style={{ height: 8, width: `${percent}%`, backgroundColor: '#176848', borderRadius: 4 }} /></View>}
  </View>;
}
