import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import UserAvatar from '../components/UserAvatar';
import denunciaService from '../services/denunciaService';
import likeService from '../services/likeService';
import { friendlyError } from '../utils/errorMessage';

export default function CurtidasDenuncia() {
  const { id } = useParams();
  const [denuncia, setDenuncia] = useState(null);
  const [likes, setLikes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    denunciaService.buscarPorId(id)
      .then(async report => {
        if (!active) return;
        setDenuncia(report);
        if (report.status !== 'aprovada') {
          setError('O histórico de curtidas está disponível somente para denúncias aprovadas.');
          return;
        }
        const result = await likeService.listarPorDenuncia(id);
        if (!active) return;
        setLikes(Array.isArray(result) ? result : []);
      })
      .catch(err => active && setError(friendlyError(err, 'Não foi possível carregar o histórico de curtidas.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id]);

  return <div className="rc-page">
    <Navbar />
    <main className="container py-4 flex-grow-1">
      <section className="rc-history-page mx-auto">
        <Link className="btn btn-link px-0 mb-3" to={`/denuncia/${id}`}>← Voltar para a denúncia</Link>
        <header className="rc-history-header">
          <div><span className="rc-eyebrow">HISTÓRICO DA DENÚNCIA</span><h1>Quem curtiu</h1><p>{denuncia?.titulo || 'Carregando denúncia...'}</p></div>
          {!loading && !error && <div className="rc-history-total"><strong>{likes.length}</strong><span>{likes.length === 1 ? 'curtida' : 'curtidas'}</span></div>}
        </header>
        {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
        : error ? <div className="alert alert-danger">{error}</div>
        : likes.length === 0 ? <div className="rc-empty">Esta denúncia ainda não recebeu curtidas.</div>
        : <div className="rc-history-list">{likes.map(like => <article className="rc-history-item" key={like.id}>
          <UserAvatar user={like.User} className="rc-history-avatar" />
          <div><strong>{like.User?.username || 'Usuário'}</strong><time>Curtiu em {new Date(like.createdAt).toLocaleString('pt-BR')}</time></div>
          <i className="bi bi-hand-thumbs-up-fill rc-history-icon" aria-hidden="true" />
        </article>)}</div>}
      </section>
    </main>
    <Footer />
  </div>;
}
