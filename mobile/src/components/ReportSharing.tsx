import { useRef, useState } from 'react';
import { Text, View } from 'react-native';
import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import { useAuth } from '../context/AuthContext';
import type { Report } from '../services/reportService';
import { openReportShare, recordShare } from '../services/shareService';
import { toApiError } from '../utils/ApiError';
import { Button } from './Button';
export function ReportSharing({ report }: { report: Report }) {
  const { client, user } = useAuth();
  const [count, setCount] = useState(report.sharesCount ?? 0);
  const [busy, setBusy] = useState(false), [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState(''), [message, setMessage] = useState('');
  const working = useRef(false);
  async function record(key: string) {
    setPending(key);
    const current = await recordShare(client, report.id, key);
    setCount(current.sharesCount ?? 0); setPending(null); setMessage('Compartilhamento registrado.');
  }
  async function open() {
    if (working.current || confirm || pending) return;
    working.current = true; setBusy(true); setError(''); setMessage('');
    try {
      const result = await openReportShare(report, Constants.expoConfig?.extra?.publicWebUrl);
      if (result === 'confirm' && user) setConfirm(true);
      else if (result === 'shared' && user) await record(randomUUID());
    } catch (reason) { setError(toApiError(reason).message); }
    finally { working.current = false; setBusy(false); }
  }
  async function confirmRecord() {
    if (working.current || !user) return;
    working.current = true; setBusy(true); setConfirm(false); setError('');
    try { await record(pending ?? randomUUID()); }
    catch (reason) { setError(`${toApiError(reason).message} O registro pode já ter sido recebido; confirme novamente para consultar o mesmo envio.`); }
    finally { working.current = false; setBusy(false); }
  }
  return <View style={{ gap: 8 }}>
    <Text accessibilityLiveRegion="polite">{count} compartilhamentos</Text>
    <Button title="Compartilhar denúncia" icon="share" loading={busy} disabled={confirm || !!pending} onPress={() => void open()} />
    {!user && <Text>Você pode compartilhar como visitante. O contador registra somente compartilhamentos de contas autenticadas.</Text>}
    {confirm && <>
      <Text>Você concluiu o compartilhamento no outro aplicativo? Confirme para registrá-lo no contador.</Text>
      <Button title="Concluí o compartilhamento" disabled={busy} onPress={() => void confirmRecord()} />
      <Button title="Não compartilhei" disabled={busy} onPress={() => setConfirm(false)} />
    </>}
    {!!pending && <Button title="Confirmar registro pendente" disabled={busy} onPress={() => void confirmRecord()} />}
    {!!error && <Text accessibilityRole="alert">{error}</Text>}
    {!!message && <Text accessibilityRole="alert">{message}</Text>}
  </View>;
}
