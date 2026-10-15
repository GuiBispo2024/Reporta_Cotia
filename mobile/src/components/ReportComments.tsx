import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getComments, postComment, deleteComment, type ReportComment, type CommentPage } from '../services/commentService';
import { toApiError } from '../utils/ApiError';
import { Button } from './Button';
import { Field } from './Field';
import { theme } from '../theme';
export function ReportComments({ reportId }: { reportId: number }) {
  const { client, user } = useAuth();
  const [result, setResult] = useState<CommentPage | null>(null);
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [actionError, setActionError] = useState('');
  const [text, setText] = useState('');
  const [reply, setReply] = useState<ReportComment | null>(null);
  const working = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    void getComments(client, reportId, page, controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        if (data.page > data.totalPages && page > 1) setPage(Math.max(1, data.totalPages));
        else setResult(data);
      }
    }).catch((reason) => { if (!controller.signal.aborted) setError(toApiError(reason).message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [client, reportId, page, attempt]);
  async function send() {
    if (working.current || !user) return;
    working.current = true; setBusy(true); setActionError('');
    try { await postComment(client, reportId, text, reply?.id); setText(''); setReply(null); setPage(1); setAttempt((value) => value + 1); }
    catch (reason) { const failure = toApiError(reason); setActionError(`${failure.message}${!failure.status || failure.status >= 500 ? ' Atualize a lista antes de reenviar para conferir se o comentário foi publicado.' : ''}`); }
    finally { working.current = false; setBusy(false); }
  }
  async function remove(id: number) {
    if (working.current) return;
    working.current = true; setBusy(true); setActionError('');
    try { await deleteComment(client, id); if (reply?.id === id) setReply(null); setAttempt((value) => value + 1); }
    catch (reason) { setActionError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }
  function comment(item: ReportComment, depth = 0): React.ReactNode {
    return <View key={item.id} style={{ gap: 8, padding: 12, marginLeft: depth ? 8 : 0, borderLeftWidth: depth ? 2 : 0, borderColor: theme.colors.border }}>
      <Text style={theme.typography.button}>{item.username}</Text><Text selectable>{item.comentario}</Text>
      <Text>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
      {!!user && <Button title={`Responder a ${item.username}`} disabled={busy} onPress={() => setReply(item)} />}
      {user?.id === item.userId && <Button title={`Excluir comentário #${item.id}`} disabled={busy} onPress={() => Alert.alert('Excluir comentário?', 'Respostas associadas também podem ser removidas.', [
        { text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => void remove(item.id) },
      ])} />}
      {item.replies.map((child) => comment(child, depth + 1))}
    </View>;
  }
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={theme.typography.heading}>Comentários{result ? ` (${result.totalComments})` : ''}</Text>
    {loading && <ActivityIndicator accessibilityLabel="Carregando comentários" />}
    {!!error && <Text accessibilityRole="alert">{error}</Text>}
    {!loading && !error && result?.comments.length === 0 && <Text>Ainda não há comentários.</Text>}
    {!error && result?.comments.map((item) => comment(item))}
    <Button title="Atualizar comentários" disabled={loading || busy} onPress={() => setAttempt((value) => value + 1)} />
    {!!result?.totalPages && <>
      <Text>Página de comentários {page} de {result.totalPages}</Text>
      <Button title="Comentários anteriores" disabled={loading || busy || page <= 1} onPress={() => setPage((value) => value - 1)} />
      <Button title="Próximos comentários" disabled={loading || busy || page >= result.totalPages} onPress={() => setPage((value) => value + 1)} />
    </>}
    {user ? <>
      {reply && <><Text>Respondendo a {reply.username}</Text><Button title="Cancelar resposta" disabled={busy} onPress={() => setReply(null)} /></>}
      <Field label="Seu comentário" value={text} onChangeText={setText} multiline maxLength={255} editable={!busy} />
      <Text>{text.length}/255 caracteres</Text>
      <Button title="Publicar comentário" icon="send" variant="primary" loading={busy} disabled={!text.trim()} onPress={() => void send()} />
    </> : <Text>Entre na aba Conta para comentar.</Text>}
    {!!actionError && <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{actionError}</Text>}
  </View>;
}
