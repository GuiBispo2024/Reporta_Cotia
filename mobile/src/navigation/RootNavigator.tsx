import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
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
import { EditReportScreen } from '../screens/EditReportScreen';
import { AccountSecurityScreen } from '../screens/AccountSecurityScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { user, restoring } = useAuth();
  const navigation = useNavigationContainerRef<RootStackParamList>();
  const pendingReport = useRef(false);
  useEffect(() => {
    if (user && pendingReport.current && navigation.isReady()) {
      pendingReport.current = false;
      navigation.navigate('CreateReport');
    }
  }, [user?.id, navigation]);
  if (restoring) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Restaurando sessão" color={theme.colors.primary} /></View>;
  return (
    <NavigationContainer ref={navigation} theme={navigationTheme} onStateChange={() => {
      // Returning to the public tabs cancels the login intent. It is never persisted.
      if (!user && navigation.getCurrentRoute()?.name !== 'Login' && navigation.getCurrentRoute()?.name !== 'Register'
        && navigation.getCurrentRoute()?.name !== 'ForgotPassword') pendingReport.current = false;
    }} linking={{
      prefixes: [`${typeof Constants.expoConfig?.scheme === 'string' ? Constants.expoConfig.scheme : 'reportacotia'}://`],
      config: { screens: { ResetPassword: 'redefinir-senha' } },
    }}>
      <Stack.Navigator key={user ? `user-${user.id}` : 'guest'} screenOptions={{ headerTintColor: theme.colors.onPrimary, headerStyle: { backgroundColor: theme.colors.primaryDark }, headerTitleStyle: { fontSize: 18, fontWeight: '700' }, headerShadowVisible: false }}>
        <Stack.Screen name="Main" options={{ headerShown: false }}>{() => <MainTabs onDenounce={() => {
          if (user) navigation.navigate('CreateReport');
          else { pendingReport.current = true; navigation.navigate('Login'); }
        }} />}</Stack.Screen>
        {!user ? <>
          <Stack.Screen name="Login" component={AccountScreen} options={{ title: 'Entrar' }} />
          <Stack.Screen name="Register" component={AccountScreen} options={{ title: 'Criar conta' }} />
        </> : <>
          <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} options={{ title: 'Segurança da conta' }} />
          <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ title: 'Nova denúncia' }} />
          <Stack.Screen name="EditReport" component={EditReportScreen} options={{ title: 'Corrigir denúncia' }} />
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
