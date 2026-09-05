import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import passwordResetService from '../services/passwordResetService';
import { friendlyError } from '../utils/errorMessage';

export default function RedefinirSenha() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async event => {
    event.preventDefault();
    if (password !== confirmation) return setError('As senhas informadas não coincidem.');
    try {
      setLoading(true); setError('');
      const result = await passwordResetService.redefinir(token, password);
      setMessage(result.message);
    } catch (err) { setError(friendlyError(err, 'O link é inválido ou expirou. Solicite um novo.')); }
    finally { setLoading(false); }
  };

  return <div className="rc-page"><Navbar /><main className="rc-account-page"><section className="rc-account-card rc-reset-card"><div className="rc-account-icon"><i className="bi bi-key" /></div><h1>Crie uma nova senha</h1>{!token ? <div className="alert alert-danger">O link não possui um token válido.</div> : message ? <><div className="alert alert-success">{message}</div><Link className="btn btn-primary w-100" to="/login">Entrar com a nova senha</Link></> : <form onSubmit={submit}><label className="form-label fw-semibold">Nova senha</label><input className="form-control form-control-lg mb-3" type="password" minLength="6" required value={password} onChange={event => setPassword(event.target.value)} /><label className="form-label fw-semibold">Confirmar nova senha</label><input className="form-control form-control-lg mb-3" type="password" minLength="6" required value={confirmation} onChange={event => setConfirmation(event.target.value)} />{error && <div className="alert alert-danger">{error}</div>}<button className="btn btn-primary btn-lg w-100" disabled={loading}>{loading ? 'Redefinindo...' : 'Redefinir senha'}</button></form>}<Link className="d-block text-center mt-3" to="/esqueci-senha">Solicitar outro link</Link></section></main><Footer /></div>;
}
