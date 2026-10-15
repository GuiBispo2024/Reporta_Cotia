import { useRef, useState } from 'react';
import { Alert, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Hero } from '../components/Hero';
import { Surface } from '../components/Surface';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { deleteAccount } from '../services/authService';
import { clearAccountDrafts } from '../services/draftService';
import { toApiError } from '../utils/ApiError';
import { theme } from '../theme';

export function AccountSecurityScreen() {
  const { user, client, updateAccount, signOut } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const working = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function save() {
    if (working.current || !user) return;
    setMessage('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Informe um e-mail válido.'); return; }
    if ((newPassword || confirmation) && (newPassword.length < 6 || newPassword !== confirmation)) {
      setError('A nova senha deve ter ao menos 6 caracteres e as senhas devem coincidir.'); return;
    }
    if ((email.trim().toLowerCase() !== user.email.toLowerCase() || newPassword) && !password) {
      setError('Informe a senha atual para alterar e-mail ou senha.'); return;
    }
    working.current = true; setBusy(true); setError('');
    try {
      await updateAccount({ username: user.username, email: email.trim().toLowerCase(), ...(password ? { senhaAtual: password } : {}), ...(newPassword ? { novaSenha: newPassword } : {}) });
      setPassword(''); setNewPassword(''); setConfirmation(''); setMessage('Conta atualizada.');
    } catch (reason) { setError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }
  async function remove() {
    if (working.current || !user) return;
    working.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await deleteAccount(client, password);
      await clearAccountDrafts(client.defaults.baseURL ?? '', user.id).catch(() => {});
      await signOut();
    } catch (reason) { setError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }

  if (!user) return null;
  return <Screen>
    <Hero title="Segurança da conta" description="Atualize seu acesso com a confirmação da senha atual." icon="shield-check" />
    <Surface>
      <Text accessibilityRole="header" style={theme.typography.heading}>E-mail e senha</Text>
      <Field icon="envelope" label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={255} editable={!busy} />
      <Field icon="shield-check" label="Senha atual" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!busy} />
      <Text style={{ ...theme.typography.caption, color: theme.colors.muted }}>Para trocar apenas o e-mail, deixe os campos da nova senha vazios.</Text>
      <Field icon="lock" label="Nova senha (opcional)" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" editable={!busy} />
      <Field icon="lock" label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" editable={!busy} />
      {!!message && <Text accessibilityRole="alert" style={{ color: theme.colors.primary }}>{message}</Text>}
      {!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>}
      <Button title="Salvar conta" icon="check-circle-fill" variant="primary" loading={busy} onPress={() => void save()} />
    </Surface>
    <Surface>
      <Text accessibilityRole="header" style={{ ...theme.typography.heading, color: theme.colors.danger }}>Excluir conta</Text>
      <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>A exclusão é permanente e remove suas denúncias, interações, fotos e os rascunhos desta conta no aparelho. Informe a senha atual acima para continuar.</Text>
      <Button icon="trash" variant="danger" title="Excluir minha conta" disabled={busy} onPress={() => {
        if (!password) { setMessage(''); setError('Informe a senha atual para excluir a conta.'); return; }
        Alert.alert('Excluir sua conta?', 'A exclusão é permanente. Suas denúncias, interações e fotos serão removidas. Os rascunhos desta conta neste aparelho também serão apagados.', [
          { text: 'Cancelar', style: 'cancel' }, { text: 'Excluir definitivamente', style: 'destructive', onPress: () => void remove() },
        ]);
      }} />
    </Surface>
  </Screen>;
}
