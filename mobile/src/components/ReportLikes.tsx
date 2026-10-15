import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { getReport, type Report } from '../services/reportService';
import { setReportLike } from '../services/likeService';
import { toApiError } from '../utils/ApiError';
import { Button } from './Button';
export function ReportLikes({ report }: { report: Report }) {
  const { client, user } = useAuth();
  const [current, setCurrent] = useState(report);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const working = useRef(false);
  async function toggle(refresh = false) {
    if (working.current || (!refresh && !user)) return;
    working.current = true; setBusy(true); setError('');
    try { setCurrent(refresh ? await getReport(client, report.id) : await setReportLike(client, report.id, !current.likedByMe)); }
    catch (reason) { setError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }
  return <View style={{ gap: 8 }}>
    <Text accessibilityLiveRegion="polite">{current.likesCount ?? 0} curtidas</Text>
    {current.status === 'aprovada' ? <>
      <Button title={current.likedByMe ? 'Descurtir' : 'Curtir'} loading={busy} disabled={!user} onPress={() => void toggle()} />
      {!user && <Text>Entre na aba Conta para curtir.</Text>}
    </> : <Text>Esta denúncia não está mais publicada.</Text>}
    {!!error && <><Text accessibilityRole="alert">{error}</Text><Button title="Atualizar curtidas" disabled={busy} onPress={() => void toggle(true)} /></>}
  </View>;
}
