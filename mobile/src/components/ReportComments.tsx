import { Fragment, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Keyboard, Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getComments, postComment, deleteComment, updateComment, type ReportComment, type CommentPage } from '../services/commentService';
import { toApiError } from '../utils/ApiError';
import { Button } from './Button';
import { Field } from './Field';
import { theme } from '../theme';
function findComment(items: ReportComment[], id: number): ReportComment | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const child = findComment(item.replies, id);
    if (child) return child;
  }
}
export function ReportComments({ reportId }: { reportId: number }) {
  const { client, user } = useAuth();
  const [result, setResult] = useState<CommentPage | null>(null);
  const [page, setPage] = useState(1), [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [actionError, setActionError] = useState('');
  const [text, setText] = useState('');
  const [reply, setReply] = useState<ReportComment | null>(null);
  const [editing, setEditing] = useState<ReportComment | null>(null);
  const [editText, setEditText] = useState(''), [message, setMessage] = useState('');
  const [uncertain, setUncertain] = useState(false);
  const pendingEdit = useRef<{ id: number; text: string } | null>(null);
  const working = useRef(false);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError('');
    void getComments(client, reportId, page, controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        if (data.page > data.totalPages && page > 1) setPage(Math.max(1, data.totalPages));
        else {
          setResult(data);
          if (pendingEdit.current) {
            const saved = findComment(data.comments, pendingEdit.current.id);
            if (saved) {
              if (saved.comentario === pendingEdit.current.text.trim()) {
                setEditing(null); setEditText(''); setMessage('Edição confirmada na lista.');
              } else {
                setEditing(saved); setMessage('Lista atualizada. Confira o comentário publicado antes de salvar novamente. O texto da edição foi preservado.');
              }
              pendingEdit.current = null; setUncertain(false); setActionError('');
            } else setActionError('O comentário não está nesta página ou foi removido. Seu texto foi preservado; cancele a edição para navegar pela conversa.');
          }
        }
      }
    }).catch((reason) => { if (!controller.signal.aborted) setError(toApiError(reason).message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [client, reportId, page, attempt]);
  async function send() {
    if (working.current || !user || editing) return;
    working.current = true; setBusy(true); setActionError('');
    Keyboard.dismiss(); setMessage('');
    try { await postComment(client, reportId, text, reply?.id); setText(''); setReply(null); setPage(1); setAttempt((value) => value + 1); }
    catch (reason) { const failure = toApiError(reason); setActionError(`${failure.message}${!failure.status || failure.status >= 500 ? ' Atualize a lista antes de reenviar para conferir se o comentário foi publicado.' : ''}`); }
    finally { working.current = false; setBusy(false); }
  }
  async function remove(id: number) {
    if (working.current || editing || !user) return;
    working.current = true; setBusy(true); setActionError('');
    try { await deleteComment(client, id); if (reply?.id === id) setReply(null); setAttempt((value) => value + 1); }
    catch (reason) { setActionError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }
  function startEdit(item: ReportComment) {
    if (working.current || loading || editing || user?.id !== item.userId) return;
    setEditing(item); setEditText(item.comentario); setActionError(''); setMessage('');
  }
  function cancelEdit() {
    const cancel = () => { setEditing(null); setEditText(''); setUncertain(false); pendingEdit.current = null; setActionError(''); setMessage(''); };
    if (busy) return;
    if (uncertain || editText !== editing?.comentario) Alert.alert('Descartar edição?', 'O texto editado será descartado neste aparelho. Uma alteração já recebida pelo servidor continuará publicada.', [
      { text: 'Continuar editando', style: 'cancel' }, { text: 'Descartar edição', style: 'destructive', onPress: cancel },
    ]);
    else cancel();
  }
  async function saveEdit() {
    if (working.current || !editing || user?.id !== editing.userId || uncertain || loading) return;
    working.current = true; setBusy(true); setActionError(''); setMessage(''); Keyboard.dismiss();
    try {
      await updateComment(client, editing.id, editText);
      setEditing(null); setEditText(''); setMessage('Comentário atualizado.'); setAttempt((value) => value + 1);
    } catch (reason) {
      const failure = toApiError(reason);
      if (failure.code !== 'VALIDATION_ERROR' && (!failure.status || failure.status >= 500)) {
        pendingEdit.current = { id: editing.id, text: editText }; setUncertain(true);
        setActionError(`${failure.message} A edição pode ter sido salva. Confira a edição antes de tentar novamente.`);
      } else setActionError(failure.message);
    } finally { working.current = false; setBusy(false); }
  }
  function comment(item: ReportComment, depth = 0): React.ReactNode {
    return <Fragment key={item.id}><View style={{ gap: 8, padding: 12, marginLeft: Math.min(depth, 2) * 8, borderLeftWidth: depth ? 2 : 0, borderColor: theme.colors.border }}>
      <Text style={theme.typography.button}>{item.username}</Text><Text selectable>{item.comentario}</Text>
      <Text>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
      {!!user && <Button title={`Responder a ${item.username}`} disabled={busy || !!editing} onPress={() => setReply(item)} />}
      {user?.id === item.userId && <>
      <Button title={`Editar comentário #${item.id}`} icon="pencil-square" disabled={busy || loading || !!editing} onPress={() => startEdit(item)} />
      <Button title={`Excluir comentário #${item.id}`} icon="trash" variant="danger" disabled={busy || !!editing} onPress={() => Alert.alert('Excluir comentário?', 'Respostas associadas também podem ser removidas.', [
        { text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: () => void remove(item.id) },
      ])} /></>}
    </View>
      {item.replies.map((child) => comment(child, depth + 1))}
    </Fragment>;
  }
  return <View style={{ gap: 12 }}>
    <Text accessibilityRole="header" style={theme.typography.heading}>Comentários{result ? ` (${result.totalComments})` : ''}</Text>
    {loading && <ActivityIndicator accessibilityLabel="Carregando comentários" />}
    {!!error && <Text accessibilityRole="alert">{error}</Text>}
    {!loading && !error && result?.comments.length === 0 && <Text>Ainda não há comentários.</Text>}
    {!error && result?.comments.map((item) => comment(item))}
    <Button title={uncertain ? 'Conferir edição' : 'Atualizar comentários'} disabled={loading || busy} onPress={() => setAttempt((value) => value + 1)} />
    {!!result?.totalPages && <>
      <Text>Página de comentários {page} de {result.totalPages}</Text>
      <Button title="Comentários anteriores" disabled={loading || busy || !!editing || page <= 1} onPress={() => setPage((value) => value - 1)} />
      <Button title="Próximos comentários" disabled={loading || busy || !!editing || page >= result.totalPages} onPress={() => setPage((value) => value + 1)} />
    </>}
    {user && editing ? <>
      <Text accessibilityRole="header" style={theme.typography.heading}>Editando comentário #{editing.id}</Text>
      <Field label="Editar comentário" value={editText} onChangeText={setEditText} multiline autoFocus maxLength={255} editable={!busy && !uncertain} hint="Até 255 caracteres. A moderação de palavras continua ativa." />
      <Text>{editText.length}/255 caracteres</Text>
      <Button title="Salvar alteração" variant="primary" icon="check-circle-fill" loading={busy} disabled={uncertain || loading || !editText.trim() || editText.trim() === editing.comentario} onPress={() => void saveEdit()} />
      <Button title="Cancelar edição" disabled={busy} onPress={cancelEdit} />
    </> : user ? <>
      {reply && <><Text>Respondendo a {reply.username}</Text><Button title="Cancelar resposta" disabled={busy} onPress={() => setReply(null)} /></>}
      <Field label="Seu comentário" value={text} onChangeText={setText} multiline maxLength={255} editable={!busy} />
      <Text>{text.length}/255 caracteres</Text>
      <Button title="Publicar comentário" icon="send" variant="primary" loading={busy} disabled={!text.trim()} onPress={() => void send()} />
    </> : <Text>Entre na aba Conta para comentar.</Text>}
    {!!actionError && <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{actionError}</Text>}
    {!!message && <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.primary }}>{message}</Text>}
  </View>;
}
