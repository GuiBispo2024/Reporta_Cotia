import { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/authContext';
import denunciaService from '../services/denunciaService';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { friendlyError } from '../utils/errorMessage';

const STATUS = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  resolvida: 'Resolvida'
};

export default function HistoricoDenuncia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [denuncia, setDenuncia] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.adm) return;
    Promise.all([
      denunciaService.buscarPorId(id),
      denunciaService.buscarHistorico(id)
    ])
      .then(([report, entries]) => {
        setDenuncia(report);
        setHistory(entries);
      })
      .catch(err => setError(friendlyError(err, 'Não foi possível carregar a rastreabilidade desta denúncia.')))
      .finally(() => setLoading(false));
  }, [id, user]);

  if (!user?.adm) return <div className="container py-5"><div className="alert alert-danger">Apenas administradores podem acessar esta página.</div></div>;

  return (
    <div className="rc-page">
      <Navbar />
      <main className="container py-4 flex-grow-1">
        <button className="btn btn-link px-0 mb-3" onClick={() => navigate('/moderacao')}><i className="bi bi-arrow-left me-1" />Voltar para a moderação</button>

        <header className="rc-history-page-header">
          <div><span className="rc-eyebrow">RASTREABILIDADE ADMINISTRATIVA</span><h1>Histórico de alterações</h1><p>Consulte todas as decisões registradas para esta denúncia.</p></div>
          {denuncia && <span className="badge rc-category">Denúncia #{denuncia.id}</span>}
        </header>

        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        : error ? <div className="alert alert-danger">{error}</div>
        : <>
          <section className="rc-history-report-summary">
            <div><small>Denúncia</small><strong>{denuncia.titulo}</strong><span>{denuncia.localizacao}</span></div>
            <div><small>Moderação</small><strong>{STATUS[denuncia.status] || denuncia.status}</strong></div>
            <div><small>Andamento</small><strong>{STATUS[denuncia.resolucaoStatus] || denuncia.resolucaoStatus}</strong></div>
            <div><small>Setor atual</small><strong>{denuncia.setorResponsavel || 'Ainda não definido'}</strong></div>
          </section>

          <section className="rc-history-page-table mt-4">
            <div className="rc-history-table-title"><div><h2>Registros encontrados</h2><p>{history.length} {history.length === 1 ? 'alteração registrada' : 'alterações registradas'}</p></div><i className="bi bi-clock-history" /></div>
            {!history.length ? <div className="rc-empty">Esta denúncia ainda não possui alterações registradas.</div>
            : <div className="table-responsive"><table className="table align-middle mb-0">
              <thead><tr><th>Tipo</th><th>Status anterior</th><th>Status novo</th><th>Motivo</th><th>Setor responsável</th><th>Administrador</th><th>Data e hora</th></tr></thead>
              <tbody>{history.map(item => <tr key={item.id}>
                <td><span className={`rc-history-type is-${item.tipo}`}>{item.tipo === 'moderacao' ? 'Moderação' : 'Andamento'}</span></td>
                <td>{STATUS[item.statusAnterior] || item.statusAnterior || '—'}</td>
                <td><strong>{STATUS[item.statusNovo] || item.statusNovo}</strong></td>
                <td>{item.motivo || '—'}</td>
                <td>{item.responsavel || '—'}</td>
                <td>{item.User?.username || 'Usuário removido'}</td>
                <td><time>{new Date(item.createdAt).toLocaleString('pt-BR')}</time></td>
              </tr>)}</tbody>
            </table></div>}
          </section>
        </>}
      </main>
      <Footer />
    </div>
  );
}
