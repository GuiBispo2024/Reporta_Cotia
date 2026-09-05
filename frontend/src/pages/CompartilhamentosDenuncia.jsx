import { useCallback, useContext, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import UserAvatar from '../components/UserAvatar';
import { AuthContext } from '../context/authContext';
import denunciaService from '../services/denunciaService';
import shareService from '../services/shareService';
import { friendlyError } from '../utils/errorMessage';

export default function CompartilhamentosDenuncia() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [denuncia, setDenuncia] = useState(null);
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const carregar = useCallback(async () => {
    const [report, result] = await Promise.all([
      denunciaService.buscarPorId(id),
      shareService.listarPorDenuncia(id)
    ]);
    setDenuncia(report);
    setShares(result.shares || []);
  }, [id]);

  useEffect(() => {
    let active = true;
    carregar()
      .catch(err => active && setError(friendlyError(err, 'Não foi possível carregar o histórico de compartilhamentos.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [carregar]);

  const remover = async share => {
    if (!window.confirm('Remover este registro do seu histórico? Isso não apaga envios feitos em outros aplicativos.')) return;
    try {
      await shareService.deletar(share.id);
      setShares(current => current.filter(item => item.id !== share.id));
      window.dispatchEvent(new CustomEvent('reporta:shares-changed', { detail: { denunciaId: id } }));
    } catch (err) {
      alert(friendlyError(err, 'Não foi possível remover este compartilhamento.'));
    }
  };

  return <div className="rc-page">
    <Navbar />
    <main className="container py-4 flex-grow-1">
      <section className="rc-history-page mx-auto">
        <Link className="btn btn-link px-0 mb-3" to={`/denuncia/${id}`}>← Voltar para a denúncia</Link>
        <header className="rc-history-header">
          <div><span className="rc-eyebrow">HISTÓRICO DA DENÚNCIA</span><h1>Compartilhamentos</h1><p>{denuncia?.titulo || 'Carregando denúncia...'}</p></div>
          {!loading && !error && <div className="rc-history-total"><strong>{shares.length}</strong><span>{shares.length === 1 ? 'compartilhamento' : 'compartilhamentos'}</span></div>}
        </header>
        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        : error ? <div className="alert alert-danger">{error}</div>
        : shares.length === 0 ? <div className="rc-empty">Esta denúncia ainda não foi compartilhada.</div>
        : <div className="rc-history-list">{shares.map(share => <article className="rc-history-item" key={share.id}>
          <UserAvatar user={share.User} className="rc-history-avatar" />
          <div><strong>{share.User?.username || 'Usuário'}{Number(share.userId) === Number(user?.id) ? ' (você)' : ''}</strong>{share.comentario && <p>“{share.comentario}”</p>}<time>Compartilhou em {new Date(share.createdAt).toLocaleString('pt-BR')}</time></div>
          {Number(share.userId) === Number(user?.id) ? <button className="rc-history-remove" onClick={() => remover(share)} title="Remover do meu histórico" aria-label="Remover do meu histórico"><i className="bi bi-trash" /></button> : <i className="bi bi-share-fill rc-history-icon" aria-hidden="true" />}
        </article>)}</div>}
      </section>
    </main>
    <Footer />
  </div>;
}
