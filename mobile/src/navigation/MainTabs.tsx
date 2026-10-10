import { createBottomTabNavigator, type BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { ReportsScreen } from '../screens/ReportsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import type { MainTabParamList, RootStackParamList } from './types';

const Tabs = createBottomTabNavigator<MainTabParamList>();
function ReportTab({ navigation, route }: BottomTabScreenProps<MainTabParamList, 'Reports' | 'MyReports'>) {
  return <ReportsScreen navigation={navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()}
    route={{ name: route.name }} />;
}
export function MainTabs() {
  const { user } = useAuth();
  return <Tabs.Navigator screenOptions={({ route }) => ({
    headerTintColor: theme.colors.primary, tabBarActiveTintColor: theme.colors.primary,
    tabBarInactiveTintColor: theme.colors.muted, tabBarLabelStyle: { fontSize: 12 },
    tabBarIcon: ({ color }) => <Text accessibilityElementsHidden importantForAccessibility="no" style={{ color, fontSize: 23 }}>{route.name === 'Reports' ? '⌂' : route.name === 'MyReports' ? '▤' : '●'}</Text>,
  })}>
    <Tabs.Screen name="Reports" component={ReportTab} options={{ title: 'Reporta Cotia', tabBarLabel: 'Início', tabBarAccessibilityLabel: 'Aba Início' }} />
    {user && <Tabs.Screen name="MyReports" component={ReportTab} options={{ title: 'Minhas denúncias', tabBarLabel: 'Minhas', tabBarAccessibilityLabel: 'Aba Minhas denúncias' }} />}
    <Tabs.Screen name="Account" component={ProfileScreen} options={{ title: 'Conta', tabBarAccessibilityLabel: 'Aba Conta' }} />
  </Tabs.Navigator>;
}
