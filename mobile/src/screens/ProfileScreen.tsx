import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';
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
import { selectPhotos } from '../services/photoService';
import { uploadAvatar, removeAvatar } from '../services/avatarService';
import { resolveImageUrl } from '../utils/imageUrl';
import { Hero } from '../components/Hero';
import { Surface } from '../components/Surface';
import { Icon } from '../components/Icon';

export function ProfileScreen() {
  const { user, client, signOut, notice, updateAccount, reloadProfile } = useAuth();
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
  const avatar = user?.avatarUrl ? resolveImageUrl(user.avatarUrl, client.defaults.baseURL ?? '', __DEV__) : null;
  async function changePhoto(source: 'camera' | 'library' | 'remove' | 'refresh') {
    if (working.current || !user) return;
    working.current = true; setBusy(true); setError(''); setMessage('');
    try {
      if (source === 'remove') await removeAvatar(client);
      else if (source !== 'refresh') {
        const [photo] = await selectPhotos(source, 1);
        if (!photo) return;
        await uploadAvatar(client, photo);
      }
      await reloadProfile(); setMessage('Foto de perfil atualizada.');
    } catch (reason) { setError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }
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
    <Hero title="Sua conta" description="Gerencie seu perfil e participe das melhorias da cidade." icon="person-circle">
      {user && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        {avatar ? <Image source={{ uri: avatar }} accessibilityLabel="Sua foto de perfil" style={{ width: 72, height: 72, borderRadius: 36, borderWidth: 3, borderColor: theme.colors.onPrimary }} />
          : <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.tint }}><Icon name="person-circle" size={36} /></View>}
        <View style={{ flex: 1, gap: 4 }}><Text style={{ color: theme.colors.onPrimary, ...theme.typography.heading }}>{user.username}</Text><Text style={{ color: theme.colors.onDarkMuted, ...theme.typography.caption }}>{user.email}</Text></View>
      </View>}
    </Hero>
    <Surface>
    {!!notice && <Text accessibilityRole="alert">{notice}</Text>}
    {user ? <>
      <Text accessibilityRole="header" style={theme.typography.heading}>Dados do perfil</Text>
      <Button icon="camera" title="Fotografar para o perfil" disabled={busy} onPress={() => void changePhoto('camera')} />
      <Button icon="images" title="Escolher foto do perfil" disabled={busy} onPress={() => void changePhoto('library')} />
      {!!user.avatarUrl && <Button icon="trash" variant="danger" title="Remover foto do perfil" disabled={busy} onPress={() => Alert.alert('Remover foto?', 'Sua conta ficará sem foto de perfil.', [
        { text: 'Cancelar', style: 'cancel' }, { text: 'Remover', style: 'destructive', onPress: () => void changePhoto('remove') },
      ])} />}
      <Button icon="arrow-clockwise" variant="ghost" title="Atualizar perfil" disabled={busy} onPress={() => void changePhoto('refresh')} />
      <Field icon="person" label="Nome de usuário" value={username} onChangeText={setUsername} maxLength={255} editable={!busy} />
      <Field icon="envelope" label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" maxLength={255} editable={!busy} />
      <Text>A senha atual é necessária para alterar e-mail, senha ou excluir a conta.</Text>
      <Field icon="shield-check" label="Senha atual" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" editable={!busy} />
      <Field icon="lock" label="Nova senha (opcional)" value={newPassword} onChangeText={setNewPassword} secureTextEntry autoCapitalize="none" editable={!busy} />
      <Field label="Confirmar nova senha" value={confirmation} onChangeText={setConfirmation} secureTextEntry autoCapitalize="none" editable={!busy} />
      {!!message && <Text accessibilityRole="alert">{message}</Text>}
      {!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>}
      <Button title="Salvar conta" icon="check-circle-fill" variant="primary" loading={busy} onPress={() => void save()} />
      <Button icon="trash" variant="danger" title="Excluir minha conta" disabled={busy} onPress={() => {
        if (!password) { setError('Informe a senha atual para excluir a conta.'); return; }
        Alert.alert('Excluir sua conta?', 'A exclusão é permanente. Suas denúncias, interações e fotos serão removidas. Os rascunhos desta conta neste aparelho também serão apagados.', [
          { text: 'Cancelar', style: 'cancel' }, { text: 'Excluir definitivamente', style: 'destructive', onPress: () => void remove() },
        ]);
      }} />
      <Button icon="box-arrow-right" variant="ghost" title="Sair da conta" disabled={busy} onPress={() => { setBusy(true); void signOut().catch((reason) => setError(toApiError(reason).message)).finally(() => setBusy(false)); }} />
    </> : <>
      <Text>Entre para publicar e acompanhar suas denúncias.</Text>
      <Button title="Entrar" onPress={() => navigation.navigate('Login')} />
      <Button title="Criar conta" onPress={() => navigation.navigate('Register')} />
    </>}
    <Button icon="info-circle" variant="ghost" title="Sobre o aplicativo" onPress={() => navigation.navigate('About')} />
    </Surface>
  </Screen>;
}
