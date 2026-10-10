import { useState } from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';

export function ProfileScreen() {
  const { user, signOut, notice } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [busy, setBusy] = useState(false);
  return <Screen>
    <Text accessibilityRole="header" style={{ ...theme.typography.title, color: theme.colors.text }}>Sua conta</Text>
    {!!notice && <Text accessibilityRole="alert">{notice}</Text>}
    {user ? <>
      <Text>{user.username}</Text><Text>{user.email}</Text>
      <Button title="Sair da conta" loading={busy} onPress={() => { setBusy(true); void signOut().finally(() => setBusy(false)); }} />
    </> : <>
      <Text>Entre para publicar e acompanhar suas denúncias.</Text>
      <Button title="Entrar" onPress={() => navigation.navigate('Login')} />
      <Button title="Criar conta" onPress={() => navigation.navigate('Register')} />
    </>}
    <Button title="Sobre o aplicativo" onPress={() => navigation.navigate('About')} />
  </Screen>;
}
