import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import passwordResetService from '../services/passwordResetService';
import { friendlyError } from '../utils/errorMessage';

export default function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async event => {
    event.preventDefault();
    try {
      setLoading(true); setError(''); setMessage('');
      const result = await passwordResetService.solicitar(email);
      setMessage(result.message);
    } catch (err) { setError(friendlyError(err, 'Não foi possível solicitar a redefinição.')); }
    finally { setLoading(false); }
  };

  return <div className="rc-page"><Navbar /><main className="rc-account-page"><section className="rc-account-card rc-reset-card"><div className="rc-account-icon"><i className="bi bi-envelope-lock" /></div><h1>Esqueceu sua senha?</h1><p className="text-muted">Informe seu e-mail para receber um link seguro, válido por 30 minutos.</p><form onSubmit={submit}><label className="form-label fw-semibold">E-mail da conta</label><input className="form-control form-control-lg mb-3" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="seu@email.com" />{message && <div className="alert alert-success">{message}</div>}{error && <div className="alert alert-danger">{error}</div>}<button className="btn btn-primary btn-lg w-100" disabled={loading}>{loading ? 'Enviando...' : 'Enviar instruções'}</button></form><Link className="d-block text-center mt-3" to="/login">Voltar para o login</Link></section></main><Footer /></div>;
}
