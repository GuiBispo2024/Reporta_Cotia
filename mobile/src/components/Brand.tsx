import { Image, Text, View } from 'react-native';
import { theme } from '../theme';
export function Brand() {
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessible accessibilityLabel="Reporta Cotia, participação cidadã">
    <Image source={require('../../assets/brand/reporta-cotia.png')} style={{ width: 36, height: 36, borderRadius: 10 }} accessible={false} />
    <View><Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.onPrimary }}>Reporta Cotia</Text>
      <Text style={{ fontSize: 11, color: theme.colors.onDarkMuted, marginTop: 2 }}>Participação cidadã</Text></View>
  </View>;
}
