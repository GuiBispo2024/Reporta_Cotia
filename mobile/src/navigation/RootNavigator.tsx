import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { navigationTheme, theme } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerTintColor: theme.colors.primary, headerTitleStyle: theme.typography.heading }}>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Reporta Cotia' }} />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: 'Sobre o aplicativo' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
