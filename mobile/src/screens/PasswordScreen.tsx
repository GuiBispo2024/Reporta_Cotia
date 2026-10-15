import { useRef, useState } from 'react';
import { Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { requestPasswordReset, resetPassword } from '../services/passwordService';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';
import { Hero } from '../components/Hero';
import { Surface } from '../components/Surface';
export function PasswordScreen({ route, navigation }: NativeStackScreenProps<RootStackParamList, 'ForgotPassword' | 'ResetPassword'>) {
  const resetting = route.name === 'ResetPassword';
  const { client, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [link, setLink] = useState(route.name === 'ResetPassword' ? route.params?.token ?? '' : '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function submit() {
    if (submitting.current) return;
    if (resetting ? password.length < 6 || password !== confirmation : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError(resetting ? 'Use pelo menos 6 caracteres e confirme a nova senha.' : 'Informe um e-mail válido.'); return;
    }
    submitting.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (resetting) {
        await resetPassword(client, link, password); setPassword(''); setConfirmation(''); setLink('');
        setMessage('Senha redefinida. Entre novamente com a nova senha.'); await signOut();
      } else {
        await requestPasswordReset(client, email);
        setMessage('Se existir uma conta com este e-mail, enviaremos as instruções de redefinição. Confira também o spam.');
      }
    } catch (reason) { setError(toApiError(reason).message); }
    finally { submitting.current = false; setBusy(false); }
  }
  return <Screen>
    <Hero title={resetting ? 'Redefinir senha' : 'Recuperar senha'} description="Recupere o acesso à sua conta com segurança." icon="shield-check" />
    <Surface>
    {!message || !resetting ? <>
      {resetting ? <>
        <Text>Copie o link recebido por e-mail e cole abaixo. Ele expira em 30 minutos e pode ser usado uma vez.</Text>
        <Field label="Link de redefinição" value={link} onChangeText={setLink} autoCapitalize="none" autoCorrect={false} secureTextEntry editable={!busy} />
        <Field icon="lock" label="Nova senha" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!busy} />
        <Field label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" editable={!busy} />
      </> : <Field icon="envelope" label="E-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} editable={!busy} />}
      <Button title={resetting ? 'Salvar nova senha' : 'Enviar instruções'} icon="send" variant="primary" loading={busy} onPress={() => void submit()} />
    </> : null}
    {!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>}
    {!!message && <Text accessibilityRole="alert">{message}</Text>}
    {!resetting && <Button title="Já recebi o link" disabled={busy} onPress={() => navigation.navigate('ResetPassword')} />}
    <Button title="Voltar" disabled={busy} onPress={() => navigation.goBack()} />
    </Surface>
  </Screen>;
}
