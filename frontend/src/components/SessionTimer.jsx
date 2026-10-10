import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/authContext';
import './SessionTimer.css';
export default function SessionTimer() {
  const { isAuthenticated, remainingSeconds = 0, continueSession, notice = '' } = useContext(AuthContext);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const warning = remainingSeconds <= 60;
  const visible = isAuthenticated || (!!notice && !dismissed);
  useEffect(() => { document.body.classList.toggle('rc-session-active', visible); return () => document.body.classList.remove('rc-session-active'); }, [visible]);
  useEffect(() => { if (isAuthenticated) setDismissed(false); }, [isAuthenticated]);
  if (!visible) return null;
  if (!isAuthenticated) return <div className="rc-session-timer is-warning" role="alert"><span>{notice}</span><button onClick={() => setDismissed(true)}>Fechar</button></div>;
  const time = `${Math.floor(remainingSeconds / 60).toString().padStart(2, '0')}:${(remainingSeconds % 60).toString().padStart(2, '0')}`;
  return <div className={`rc-session-timer${warning ? ' is-warning' : ''}`}>
    <span title="A sessão termina após 15 minutos sem atividade ou 8 horas de uso.">{warning ? 'Sua sessão vai expirar' : 'Tempo restante da sessão'} · <span role="timer" aria-live="off">{time}</span></span>
    {warning && <button disabled={busy} onClick={async () => { setBusy(true); setError(''); try { await continueSession(); } catch { setError('Não foi possível confirmar a sessão. Tente novamente.'); } finally { setBusy(false); } }}>Continuar conectado</button>}
    {error && <span role="alert">{error}</span>}
  </div>;
}
