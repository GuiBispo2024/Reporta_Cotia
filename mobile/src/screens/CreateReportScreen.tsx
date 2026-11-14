import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Screen } from '../components/Screen';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { categories, createReport, getReport, getSubmission, updateReport, type Report, type ReportInput } from '../services/reportService';
import { ApiError, toApiError } from '../utils/ApiError';
import { theme } from '../theme';
import { selectPhotos, type ReportPhoto } from '../services/photoService';
import { getCurrentLocation, parseCoordinates } from '../services/locationService';
import { useReportDraft } from '../services/useReportDraft';
import { ReportImages } from '../components/ReportImages';
import { UploadProgress } from '../components/UploadProgress';
import type { ReportTransfer } from '../services/reportService';
import { Hero } from '../components/Hero';
import { Surface } from '../components/Surface';

export function CreateReportScreen({ navigation, initialReport }: { navigation: Pick<NativeStackNavigationProp<RootStackParamList>, 'replace' | 'popToTop'>; initialReport?: Report }) {
  const { client, user } = useAuth();
  const initialInput = { titulo: initialReport?.titulo ?? '', descricao: initialReport?.descricao ?? '', localizacao: initialReport?.localizacao ?? '', bairro: initialReport?.bairro ?? '', categoria: initialReport?.categoria ?? 'Outros' };
  const [input, setInput] = useState<ReportInput>(initialInput);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof ReportInput, string>>>({});
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [percent, setPercent] = useState<number | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const submitting = useRef(false);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [selecting, setSelecting] = useState(false);
  const picking = useRef(false);
  const [latitude, setLatitude] = useState(initialReport?.latitude != null ? String(initialReport.latitude) : '');
  const [longitude, setLongitude] = useState(initialReport?.longitude != null ? String(initialReport.longitude) : '');
  const [removeImages, setRemoveImages] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState('');
  const locatingRef = useRef(false);
  const draft = useReportDraft(client.defaults?.baseURL ?? '', user?.id ?? 0, { input, photos, latitude, longitude, removeImages }, (saved) => {
    setInput(saved.input); setPhotos(saved.photos); setLatitude(saved.latitude); setLongitude(saved.longitude); setRemoveImages(saved.removeImages ?? false);
  }, initialReport ? `report-${initialReport.id}` : 'new');
  const locked = busy || !draft.ready || !!draft.submissionKey;
  async function locate() {
    if (locatingRef.current || busy || picking.current) return;
    locatingRef.current = true; setLocating(true); setError(''); setLocationNotice('');
    try {
      const position = await getCurrentLocation();
      setLatitude(String(position.latitude)); setLongitude(String(position.longitude));
      setInput((current) => ({ ...current, localizacao: current.localizacao || position.address.slice(0, 255), bairro: current.bairro || position.neighborhood.slice(0, 120) }));
      setLocationNotice(`Localização obtida${position.accuracy != null ? ` (precisão aproximada de ${Math.round(position.accuracy)} m)` : ''}. Confira o endereço e ajuste as coordenadas se necessário.`);
    } catch (reason) { setError(toApiError(reason).message); }
    finally { locatingRef.current = false; setLocating(false); }
  }
  async function pick(source: 'camera' | 'library') {
    if (picking.current || busy || locatingRef.current) return;
    picking.current = true; setSelecting(true); setError('');
    try { const added = await selectPhotos(source, 4 - photos.length); setPhotos((current) => [...current, ...added].slice(0, 4)); }
    catch (reason) { setError(toApiError(reason).message); }
    finally { picking.current = false; setSelecting(false); }
  }
  const field = (name: keyof ReportInput) => (value: string) => {
    setInput((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };
  const canCreate = !!user?.permissions.includes(initialReport ? 'denuncia.update_own' : 'denuncia.create');
  async function discardDraft() {
    if (submitting.current || picking.current || locatingRef.current || !draft.ready || draft.submissionKey) return;
    submitting.current = true; setBusy(true); setPhase('Descartando rascunho…'); setPercent(null); setError('');
    try {
      await draft.discard();
      setInput(initialInput); setPhotos([]); setLatitude(initialReport?.latitude != null ? String(initialReport.latitude) : '');
      setLongitude(initialReport?.longitude != null ? String(initialReport.longitude) : ''); setRemoveImages(false); setFieldErrors({}); setLocationNotice('');
    } catch { setError('Não foi possível descartar o rascunho. Seus dados foram mantidos; tente novamente.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function submit() {
    if (!draft.ready || submitting.current || picking.current || locatingRef.current || !canCreate) return;
    if (![input.titulo, input.descricao, input.localizacao].every((value) => value.trim())) {
      setFieldErrors({ titulo: input.titulo.trim() ? undefined : 'Informe um título.', descricao: input.descricao.trim() ? undefined : 'Descreva o problema.', localizacao: input.localizacao.trim() ? undefined : 'Informe o endereço do problema.' });
      setError('Preencha título, descrição e endereço.'); return;
    }
    Keyboard.dismiss(); setFieldErrors({});
    submitting.current = true; setBusy(true); setError(''); setPercent(null); setPhase('Validando denúncia…');
    try {
      parseCoordinates(latitude, longitude);
      if (draft.submissionKey) {
        setPhase('Consultando confirmação do envio anterior…');
        try {
          const report = initialReport ? await getReport(client, initialReport.id) : await getSubmission(client, draft.submissionKey);
          if (!initialReport || report.status !== 'rejeitada') { setReportId(report.id); await draft.discard(true); return; }
        } catch (reason) { if (initialReport || toApiError(reason).status !== 404) throw reason; }
        if (draft.missingPhotos) throw new ApiError('Uma foto do envio pendente está indisponível. Consulte o protocolo antes de começar outro envio.', 'MISSING_SUBMISSION_PHOTO');
      }
      setPhase('Preservando dados e fotos neste aparelho…');
      const saved = await draft.prepareSubmission();
      setPhotos(saved.photos);
      const payload = { ...saved.input, ...parseCoordinates(saved.latitude, saved.longitude) };
      setPhase('Enviando denúncia…');
      const transfer: ReportTransfer = { onUploadProgress: (event) => {
        const ratio = event.total ? event.loaded / event.total : event.progress;
        if (ratio === undefined) return;
        const value = Math.min(100, Math.max(0, Math.floor(ratio * 100)));
        setPercent(value); setPhase(value === 100 ? 'Upload concluído. Aguardando confirmação do servidor…' : 'Enviando denúncia…');
      } };
      const report = initialReport ? await updateReport(client, initialReport.id, payload, saved.photos, saved.removeImages, transfer)
        : await createReport(client, payload, saved.photos, saved.submissionKey, transfer);
      setReportId(report.id); await draft.discard(true);
    }
    catch (reason) {
      const failure = toApiError(reason);
      if ([400, 403, 429].includes(failure.status ?? 0)) await draft.releaseSubmission().catch(() => {});
      setError(failure.message);
    }
    finally { submitting.current = false; setBusy(false); }
  }
  if (reportId !== null) return <Screen>
    <Hero title={initialReport ? 'Correção enviada' : 'Denúncia enviada'} description="Acompanhe o protocolo e as próximas atualizações." icon="check-circle-fill" />
    <Surface>
    <Text accessibilityRole="alert" style={styles.body}>Protocolo #{reportId}. Sua denúncia aguarda moderação e aparecerá na lista pública após aprovação.</Text>
    <Button title="Ver denúncia enviada" onPress={() => navigation.replace('ReportDetail', { id: reportId })} />
    <Button title="Voltar à lista" onPress={() => navigation.popToTop()} />
    </Surface>
  </Screen>;
  return <Screen>
    <Hero title={initialReport ? `Corrigir denúncia #${initialReport.id}` : 'O que precisa de atenção?'} description="Informe o problema e o endereço em Cotia. Sua denúncia será analisada antes da publicação." icon="pencil-square" />
    <Surface>
    {!!initialReport?.motivoRejeicao && <Text accessibilityRole="alert" style={styles.error}>Motivo da rejeição: {initialReport.motivoRejeicao}</Text>}
    {!draft.ready && <ActivityIndicator accessibilityLabel="Carregando rascunho" color={theme.colors.primary} />}
    <Text accessibilityLiveRegion="polite" style={styles.body}>{draft.notice}</Text>
    {!!draft.submissionKey && <Text accessibilityRole="alert" style={styles.body}>Envio aguardando confirmação. Os dados estão preservados; use o botão abaixo para consultar o protocolo e, se necessário, repetir o mesmo envio.</Text>}
    <Button title="Descartar rascunho" disabled={locked || selecting || locating} onPress={() => Alert.alert('Descartar rascunho?', 'Os textos e fotos salvos neste aparelho serão removidos.', [
      { text: 'Cancelar', style: 'cancel' }, { text: 'Descartar', style: 'destructive', onPress: () => void discardDraft() },
    ])} />
    <Field icon="pencil-square" label="Título" value={input.titulo} onChangeText={field('titulo')} error={fieldErrors.titulo} hint="Obrigatório. Resuma o problema em até 120 caracteres." maxLength={120} editable={!locked} />
    <Field label="Descrição" value={input.descricao} onChangeText={field('descricao')} error={fieldErrors.descricao} hint="Obrigatória. Descreva o problema sem incluir dados pessoais." maxLength={2000} multiline editable={!locked} />
    <Field icon="geo-alt-fill" label="Endereço / localização" value={input.localizacao} onChangeText={field('localizacao')} error={fieldErrors.localizacao} hint="Obrigatório. Confira o endereço antes de enviar." maxLength={255} editable={!locked} />
    <Field label="Bairro (opcional)" value={input.bairro} onChangeText={field('bairro')} maxLength={120} editable={!locked} />
    <Button icon="geo-alt-fill" title="Usar minha localização" loading={locating} disabled={locked || selecting} onPress={() => void locate()} />
    {!!locationNotice && <Text accessibilityRole="alert" style={styles.body}>{locationNotice}</Text>}
    <Field label="Latitude (opcional)" value={latitude} onChangeText={setLatitude} maxLength={24} editable={!locked && !locating} autoCapitalize="none" />
    <Field label="Longitude (opcional)" value={longitude} onChangeText={setLongitude} maxLength={24} editable={!locked && !locating} autoCapitalize="none" />
    <Button title="Remover coordenadas" disabled={locked || locating || (!latitude && !longitude)} onPress={() => { setLatitude(''); setLongitude(''); setLocationNotice(''); }} />
    <Text style={styles.body}>Categoria</Text>
    <View style={styles.categories}>{categories.map((category) => <Pressable key={category} accessibilityRole="radio"
      accessibilityLabel={category} accessibilityState={{ selected: input.categoria === category, disabled: locked }}
      disabled={locked} onPress={() => field('categoria')(category)} style={[styles.category, input.categoria === category && styles.selected]}>
      <Text style={{ color: input.categoria === category ? theme.colors.onPrimary : theme.colors.text }}>{category}</Text>
    </Pressable>)}</View>
    {initialReport && <>
      {!removeImages && !photos.length && <ReportImages report={initialReport} />}
      <Text style={styles.body}>{photos.length ? 'As novas fotos substituirão todas as fotos atuais.' : removeImages ? 'As fotos atuais serão removidas ao reenviar.' : 'As fotos atuais serão mantidas. Anexar novas fotos substitui todas as atuais.'}</Text>
      <Button title={removeImages ? 'Manter fotos atuais' : 'Remover todas as fotos atuais'} disabled={locked || !!photos.length || selecting} onPress={() => {
        if (removeImages) setRemoveImages(false);
        else Alert.alert('Remover fotos atuais?', 'As fotos atuais serão removidas quando você reenviar a correção.', [
          { text: 'Cancelar', style: 'cancel' }, { text: 'Remover fotos', style: 'destructive', onPress: () => setRemoveImages(true) },
        ]);
      }} />
    </>}
    <Text style={styles.body}>Fotos (opcional): {photos.length}/4</Text>
    <Button icon="camera" title="Tirar foto" disabled={locked || locating || selecting || photos.length >= 4} onPress={() => void pick('camera')} />
    <Button icon="images" title="Escolher da galeria" loading={selecting} disabled={locked || locating || photos.length >= 4} onPress={() => void pick('library')} />
    {photos.map((photo, index) => <View key={photo.uri} style={{ gap: 8 }}>
      <Image source={{ uri: photo.uri }} accessibilityLabel={`Anexo ${index + 1}`} style={{ width: '100%', height: 180, borderRadius: 8 }} />
      <Button title={`Remover foto ${index + 1}`} disabled={locked || selecting} onPress={() => setPhotos((current) => current.filter((item) => item.uri !== photo.uri))} />
    </View>)}
    {!canCreate && <Text accessibilityRole="alert">Sua conta não tem permissão para publicar denúncias.</Text>}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {busy && <UploadProgress phase={phase} percent={percent} />}
    <Button title={draft.submissionKey ? 'Confirmar envio pendente' : initialReport ? 'Reenviar para moderação' : 'Enviar denúncia'} icon="send" variant="primary" loading={busy} disabled={busy || !draft.ready || !canCreate || selecting || locating} onPress={() => void submit()} />
    </Surface>
  </Screen>;
}
const styles = StyleSheet.create({
  body: { ...theme.typography.body, color: theme.colors.muted },
  error: { color: theme.colors.danger }, categories: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  category: { padding: 12, minHeight: 48, justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  selected: { backgroundColor: theme.colors.primary },
});
