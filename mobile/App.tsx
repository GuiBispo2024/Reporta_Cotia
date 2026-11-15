import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { PushNotificationProvider } from './src/context/PushNotificationContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StatusBar style="dark" />
        <AuthProvider><PushNotificationProvider><RootNavigator /></PushNotificationProvider></AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
