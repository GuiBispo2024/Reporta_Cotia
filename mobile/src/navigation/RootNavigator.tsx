import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { navigationTheme, theme } from '../theme';
import type { RootStackParamList } from './types';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AccountScreen } from '../screens/AccountScreen';
import { CreateReportScreen } from '../screens/CreateReportScreen';
import { ReportDetailScreen } from '../screens/ReportDetailScreen';
import { MainTabs } from './MainTabs';
import { PasswordScreen } from '../screens/PasswordScreen';
import Constants from 'expo-constants';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, restoring } = useAuth();
  if (restoring) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Restaurando sessão" color={theme.colors.primary} /></View>;
  return (
    <NavigationContainer theme={navigationTheme} linking={{
      prefixes: [`${typeof Constants.expoConfig?.scheme === 'string' ? Constants.expoConfig.scheme : 'reportacotia'}://`],
      config: { screens: { ResetPassword: 'redefinir-senha' } },
    }}>
      <Stack.Navigator key={user ? `user-${user.id}` : 'guest'} screenOptions={{ headerTintColor: theme.colors.primary, headerTitleStyle: theme.typography.heading }}>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        {!user ? <>
          <Stack.Screen name="Login" component={AccountScreen} options={{ title: 'Entrar' }} />
          <Stack.Screen name="Register" component={AccountScreen} options={{ title: 'Criar conta' }} />
        </> : <>
          <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ title: 'Nova denúncia' }} />
        </>}
        <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ title: 'Detalhes da denúncia' }} />
        <Stack.Screen name="ForgotPassword" component={PasswordScreen} options={{ title: 'Recuperar senha' }} />
        <Stack.Screen name="ResetPassword" component={PasswordScreen} options={{ title: 'Redefinir senha' }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Reporta Cotia' }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: 'Sobre o aplicativo' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
