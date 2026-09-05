import { useCallback, useContext, useEffect, useRef, useState } from "react";
import likeService from "../services/likeService";
import { AuthContext } from "../context/authContext";
import { friendlyError } from '../utils/errorMessage';
import UserAvatar from './UserAvatar';
import { Link } from 'react-router-dom';

export default function Like({ denunciaId, initialCount = 0, initialLiked = false }) {
  const { user } = useContext(AuthContext);
  const [likes, setLikes] = useState([]);
  const [count, setCount] = useState(Number(initialCount) || 0);
  const [liked, setLiked] = useState(Boolean(initialLiked));
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const detailsRef = useRef(null);

  const curtido = !!user && liked;
  const recentLikes = likes.slice(0, 3);
  const remainingLikes = Math.max(likes.length - recentLikes.length, 0);

  const loadLikes = useCallback(async () => {
    try {
      const result = await likeService.listarPorDenuncia(denunciaId);
      const items = Array.isArray(result) ? result : result.data || [];
      setLikes(items);
      setCount(result.total ?? items.length);
      setLiked(!!user && items.some(item => Number(item.userId) === Number(user.id)));
    } catch {
      // A indisponibilidade da contagem não impede o uso do restante da página.
    }
  }, [denunciaId, user]);

  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (!detailsRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const toggleLike = async () => {
    if (!user) return alert("Entre na sua conta para curtir esta denúncia.");
    if (updating) return;
    try {
      setUpdating(true);
      if (curtido) {
        await likeService.descurtir(denunciaId);
        setLiked(false);
        setCount(value => Math.max(0, value - 1));
      } else {
        await likeService.curtir(denunciaId);
        setLiked(true);
        setCount(value => value + 1);
      }
      if (open) await loadLikes();
    } catch (err) {
      alert(friendlyError(err, "Não foi possível atualizar sua curtida. Tente novamente."));
    } finally { setUpdating(false); }
  };

  return <div className="rc-social-action" ref={detailsRef}>
    <button onClick={toggleLike} disabled={updating} className={`btn btn-sm ${curtido ? "btn-primary" : "btn-outline-primary"}`}>
      <i className={`bi ${curtido ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`} /> {count}
    </button>
    {count > 0 && <button className="rc-social-details-trigger" title="Ver quem curtiu" aria-label="Ver quem curtiu" aria-expanded={open} onClick={() => { const next = !open; setOpen(next); if (next && !likes.length) loadLikes(); }}><i className="bi bi-people" /></button>}
    {open && <div className="rc-engagement-popover">
      <strong>Quem curtiu</strong>
      <div className="rc-engagement-list">
        {recentLikes.map(like => <div className="rc-engagement-person" key={like.id}>
          <UserAvatar user={like.User} className="rc-engagement-avatar" />
          <span>{like.User?.username || 'Usuário'}</span>
          {Number(like.userId) === Number(user?.id) && <small>Você</small>}
        </div>)}
      </div>
      {remainingLikes > 0 && <p className="rc-engagement-more">Mais {remainingLikes} {remainingLikes === 1 ? 'pessoa curtiu' : 'pessoas curtiram'}.</p>}
      <Link className="rc-engagement-link" to={`/denuncia/${denunciaId}/curtidas`} onClick={() => setOpen(false)}>Clique aqui para ver todas</Link>
    </div>}
  </div>;
}
