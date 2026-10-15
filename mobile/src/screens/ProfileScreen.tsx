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
  useEffect(() => { setUsername(user?.username ?? ''); }, [user?.id, user?.username]);
  async function save() {
    if (working.current || !user) return;
    if (!username.trim()) { setMessage(''); setError('Informe seu nome de usuário.'); return; }
    working.current = true; setBusy(true); setError(''); setMessage('');
    try {
      await updateAccount({ username: username.trim(), email: user.email });
      setMessage('Perfil atualizado.');
    } catch (reason) { setError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }
  return <Screen>
    <Hero title="Seu perfil" description="Como você aparece na comunidade." icon="person-circle">
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
      {!!message && <Text accessibilityRole="alert">{message}</Text>}
      {!!error && <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text>}
      <Button title="Salvar perfil" icon="check-circle-fill" variant="primary" loading={busy} onPress={() => void save()} />
    </> : <>
      <Text>Entre para publicar e acompanhar suas denúncias.</Text>
      <Button title="Entrar" onPress={() => navigation.navigate('Login')} />
      <Button title="Criar conta" onPress={() => navigation.navigate('Register')} />
    </>}
    </Surface>
    {user && <Surface>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Icon name="shield-check" /><Text accessibilityRole="header" style={theme.typography.heading}>Acesso e segurança</Text></View>
      <Text style={{ ...theme.typography.body, color: theme.colors.muted }}>Altere e-mail e senha ou gerencie a exclusão da conta em uma página separada.</Text>
      <Button icon="arrow-right" title="Segurança da conta" disabled={busy} onPress={() => navigation.navigate('AccountSecurity')} />
    </Surface>}
    <Surface>
      {user && <Button icon="box-arrow-right" variant="ghost" title="Sair da conta" disabled={busy} onPress={() => { setBusy(true); void signOut().catch((reason) => setError(toApiError(reason).message)).finally(() => setBusy(false)); }} />}
      <Button icon="info-circle" variant="ghost" title="Sobre o aplicativo" onPress={() => navigation.navigate('About')} />
    </Surface>
  </Screen>;
}
