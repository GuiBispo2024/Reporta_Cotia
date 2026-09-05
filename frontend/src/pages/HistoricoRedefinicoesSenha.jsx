import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import passwordResetService from '../services/passwordResetService';
import { friendlyError } from '../utils/errorMessage';

export default function HistoricoRedefinicoesSenha() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [result, setResult] = useState({ data: [], page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = page => { setLoading(true); passwordResetService.historico({ page, limit: 30 }).then(setResult).catch(err => setError(friendlyError(err, 'Não foi possível carregar a rastreabilidade.'))).finally(() => setLoading(false)); };
  useEffect(() => { if (user?.adm) load(1); }, [user]);
  if (!user?.adm) return <div className="container py-5"><div className="alert alert-danger">Apenas administradores podem acessar esta página.</div></div>;
  return <div className="rc-page"><Navbar /><main className="container py-4 flex-grow-1"><button className="btn btn-link px-0 mb-3" onClick={() => navigate('/moderacao')}><i className="bi bi-arrow-left me-1" />Voltar para a moderação</button><header className="rc-history-page-header"><div><span className="rc-eyebrow">SEGURANÇA</span><h1>Redefinições de senha</h1><p>Rastreabilidade das solicitações e redefinições realizadas.</p></div><span className="badge rc-category">{result.total} registros</span></header>{loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div> : error ? <div className="alert alert-danger mt-3">{error}</div> : <section className="rc-history-page-table mt-4"><div className="table-responsive"><table className="table align-middle mb-0"><thead><tr><th>Evento</th><th>Conta/e-mail</th><th>Resultado</th><th>IP</th><th>Detalhes</th><th>Data e hora</th></tr></thead><tbody>{result.data.map(item => <tr key={item.id}><td>{item.evento.replace('_', ' ')}</td><td><strong>{item.User?.username || '—'}</strong><small className="d-block">{item.email}</small></td><td><span className={`badge ${item.sucesso ? 'bg-success' : 'bg-danger'}`}>{item.sucesso ? 'Sucesso' : 'Falha'}</span></td><td>{item.ip || '—'}</td><td>{item.detalhes || '—'}</td><td>{new Date(item.createdAt).toLocaleString('pt-BR')}</td></tr>)}</tbody></table></div></section>}{result.totalPages > 1 && <div className="d-flex justify-content-center gap-3 mt-3"><button className="btn btn-outline-primary" disabled={result.page <= 1} onClick={() => load(result.page - 1)}>Anterior</button><span className="align-self-center">Página {result.page} de {result.totalPages}</span><button className="btn btn-outline-primary" disabled={result.page >= result.totalPages} onClick={() => load(result.page + 1)}>Próxima</button></div>}</main><Footer /></div>;
}
