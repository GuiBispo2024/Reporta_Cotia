import { createBottomTabNavigator, type BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Icon } from '../components/Icon';
import { Brand } from '../components/Brand';
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
// The action is intercepted before a tab can be selected. The form remains in the root stack.
function DenounceAction() { return null; }
export function MainTabs({ onDenounce }: { onDenounce: () => void }) {
  const { user } = useAuth();
  return <Tabs.Navigator screenOptions={({ route }) => ({
    headerTintColor: theme.colors.onPrimary, headerStyle: { backgroundColor: theme.colors.primaryDark }, headerShadowVisible: false,
    headerTitle: () => <Brand />, tabBarActiveTintColor: theme.colors.primaryDark,
    tabBarInactiveTintColor: theme.colors.muted, tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
    tabBarStyle: { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border },
    tabBarHideOnKeyboard: true,
    tabBarItemStyle: { paddingVertical: 4, minHeight: 52 }, tabBarActiveBackgroundColor: theme.colors.tint,
    tabBarIcon: ({ color, focused }) => <Icon name={route.name === 'Denounce' ? 'plus-lg' : route.name === 'Reports' ? focused ? 'house-fill' : 'house' : route.name === 'MyReports' ? 'clipboard2-check' : 'person-circle'} color={color} size={23} />,
  })}>
    <Tabs.Screen name="Reports" component={ReportTab} options={{ title: 'Reporta Cotia', tabBarLabel: 'Início', tabBarAccessibilityLabel: 'Aba Início' }} />
    <Tabs.Screen name="Denounce" component={DenounceAction} listeners={{ tabPress: (event) => { event.preventDefault(); onDenounce(); } }}
      options={{ title: 'Denunciar', tabBarAccessibilityLabel: 'Denunciar', tabBarItemStyle: { backgroundColor: theme.colors.accent, borderRadius: theme.radius.sm, marginHorizontal: 4, paddingVertical: 4, minHeight: 52 }, tabBarInactiveTintColor: theme.colors.primaryDark }} />
    {user && <Tabs.Screen name="MyReports" component={ReportTab} options={{ title: 'Minhas denúncias', tabBarLabel: 'Minhas', tabBarAccessibilityLabel: 'Aba Minhas denúncias' }} />}
    <Tabs.Screen name="Account" component={ProfileScreen} options={{ title: 'Conta', tabBarAccessibilityLabel: 'Aba Conta' }} />
  </Tabs.Navigator>;
}
