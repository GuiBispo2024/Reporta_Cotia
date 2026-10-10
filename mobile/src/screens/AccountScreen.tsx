import { useRef, useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { register } from '../services/authService';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';

export function AccountScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'Login' | 'Register'>) {
  const isRegister = route.name === 'Register';
  const { client, signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password
      || (isRegister && (!username.trim() || password.length < 6 || password !== confirmation))) {
      setError(isRegister ? 'Preencha o nome, um e-mail válido e uma senha de pelo menos 6 caracteres. As senhas devem ser iguais.' : 'Informe um e-mail válido e sua senha.');
      return;
    }
    submitting.current = true; setBusy(true); setError('');
    try {
      if (isRegister) { await register(client, username, email, password); setPassword(''); setConfirmation(''); setCreated(true); }
      else await signIn(email, password);
    } catch (reason) { setError(toApiError(reason).message); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Screen>
    <Text style={{ ...theme.typography.title, color: theme.colors.text }}>{isRegister ? 'Crie sua conta' : 'Bem-vindo de volta'}</Text>
    {created ? <>
      <Text accessibilityRole="alert">Conta criada. Entre para enviar sua primeira denúncia.</Text>
      <Button title="Entrar na conta" onPress={() => navigation.replace('Login')} />
    </> : <>
      {isRegister && <Field label="Nome de usuário" value={username} onChangeText={setUsername} maxLength={255} autoCapitalize="none" editable={!busy} />}
      <Field label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={255} editable={!busy} />
      <Field label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} />
      {isRegister && <Field label="Confirmar senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" editable={!busy} />}
      {!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>}
      <Button title={isRegister ? 'Criar conta' : 'Entrar'} loading={busy} onPress={() => void submit()} />
      <Button title={isRegister ? 'Já tenho conta' : 'Criar uma conta'} disabled={busy} onPress={() => navigation.replace(isRegister ? 'Login' : 'Register')} />
    </>}
  </Screen>;
}
