import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { navigationTheme, theme } from '../theme';
import type { RootStackParamList } from './types';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { ReportsScreen } from '../screens/ReportsScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { CreateReportScreen } from '../screens/CreateReportScreen';
import { ReportDetailScreen } from '../screens/ReportDetailScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, restoring } = useAuth();
  if (restoring) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Restaurando sessão" color={theme.colors.primary} /></View>;
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator key={user ? `user-${user.id}` : 'guest'} screenOptions={{ headerTintColor: theme.colors.primary, headerTitleStyle: theme.typography.heading }}>
        <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reporta Cotia' }} />
        {!user ? <>
          <Stack.Screen name="Login" component={AccountScreen} options={{ title: 'Entrar' }} />
          <Stack.Screen name="Register" component={AccountScreen} options={{ title: 'Criar conta' }} />
        </> : <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ title: 'Nova denúncia' }} />}
        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: 'Detalhes da denúncia' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Reporta Cotia' }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: 'Sobre o aplicativo' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
