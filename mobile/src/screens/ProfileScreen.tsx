import { useEffect, useRef, useState } from 'react';
import { Alert, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../components/Screen';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { theme } from '../theme';
import { Field } from '../components/Field';
import { deleteAccount } from '../services/authService';
import { clearAccountDrafts } from '../services/draftService';
import { toApiError } from '../utils/ApiError';

export function ProfileScreen() {
  const { user, client, signOut, notice, updateAccount } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setUsername(user?.username ?? ''); setEmail(user?.email ?? ''); }, [user?.id, user?.username, user?.email]);
  async function save() {
    if (working.current || !user) return;
    if (!username.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || (newPassword && (newPassword.length < 6 || newPassword !== confirmation))) {
      setError('Confira nome, e-mail e confirmação da nova senha (mínimo 6 caracteres).'); return;
    }
    if ((email.trim().toLowerCase() !== user.email || newPassword) && !password) { setError('Informe a senha atual para alterar e-mail ou senha.'); return; }
    working.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await updateAccount({ username: username.trim(), email: email.trim().toLowerCase(), ...(password ? { senhaAtual: password } : {}), ...(newPassword ? { novaSenha: newPassword } : {}) });
      setPassword(''); setNewPassword(''); setConfirmation(''); setMessage('Conta atualizada.');
    } catch (reason) { setError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }
  async function remove() {
    if (working.current || !user) return;
    working.current = true; setBusy(true); setError('');
    try {
      await deleteAccount(client, password);
      await clearAccountDrafts(client.defaults.baseURL ?? '', user.id).catch(() => {});
      await signOut();
    } catch (reason) { setError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }
  return <Screen>
    <Text accessibilityRole="header" style={{ ...theme.typography.title, color: theme.colors.text }}>Sua conta</Text>
    {!!notice && <Text accessibilityRole="alert">{notice}</Text>}
    {user ? <>
      <Text>{user.username}</Text><Text>{user.email}</Text>
      <Field label="Nome de usuário" value={username} onChangeText={setUsername} maxLength={255} editable={!busy} />
      <Field label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={255} editable={!busy} />
      <Text>A senha atual é necessária para alterar e-mail, senha ou excluir a conta.</Text>
      <Field label="Senha atual" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!busy} />
      <Field label="Nova senha (opcional)" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" editable={!busy} />
      <Field label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" editable={!busy} />
      {!!message && <Text accessibilityRole="alert">{message}</Text>}
      {!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>}
      <Button title="Salvar conta" loading={busy} onPress={() => void save()} />
      <Button title="Excluir minha conta" disabled={busy} onPress={() => {
        if (!password) { setError('Informe a senha atual para excluir a conta.'); return; }
        Alert.alert('Excluir sua conta?', 'A exclusão é permanente. Suas denúncias, interações e fotos serão removidas. Os rascunhos desta conta neste aparelho também serão apagados.', [
          { text: 'Cancelar', style: 'cancel' }, { text: 'Excluir definitivamente', style: 'destructive', onPress: () => void remove() },
        ]);
      }} />
      <Button title="Sair da conta" disabled={busy} onPress={() => { setBusy(true); void signOut().catch((reason) => setError(toApiError(reason).message)).finally(() => setBusy(false)); }} />
    </> : <>
      <Text>Entre para publicar e acompanhar suas denúncias.</Text>
      <Button title="Entrar" onPress={() => navigation.navigate('Login')} />
      <Button title="Criar conta" onPress={() => navigation.navigate('Register')} />
    </>}
    <Button title="Sobre o aplicativo" onPress={() => navigation.navigate('About')} />
  </Screen>;
}
