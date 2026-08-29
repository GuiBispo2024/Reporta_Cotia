import { useCallback, useContext, useEffect, useRef, useState } from "react";
import likeService from "../services/likeService";
import { AuthContext } from "../context/authContext";
import { friendlyError } from '../utils/errorMessage';
import UserAvatar from './UserAvatar';

export default function Like({ denunciaId }) {
  const { user } = useContext(AuthContext);
  const [likes, setLikes] = useState([]);
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const detailsRef = useRef(null);

  const curtido = !!user && likes.some(like => Number(like.userId) === Number(user.id));

  const loadLikes = useCallback(async () => {
    try {
      setLikes(await likeService.listarPorDenuncia(denunciaId));
    } catch {
      // A indisponibilidade da contagem não impede o uso do restante da página.
    }
  }, [denunciaId]);

  useEffect(() => { loadLikes(); }, [loadLikes]);

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
      if (curtido) await likeService.descurtir(denunciaId);
      else await likeService.curtir(denunciaId);
      await loadLikes();
    } catch (err) {
      alert(friendlyError(err, "Não foi possível atualizar sua curtida. Tente novamente."));
    } finally { setUpdating(false); }
  };

  return <div className="rc-social-action" ref={detailsRef}>
    <button onClick={toggleLike} disabled={updating} className={`btn btn-sm ${curtido ? "btn-primary" : "btn-outline-primary"}`}>
      <i className={`bi ${curtido ? 'bi-hand-thumbs-up-fill' : 'bi-hand-thumbs-up'}`} /> {likes.length}
    </button>
    {likes.length > 0 && <button className="rc-social-details-trigger" title="Ver quem curtiu" aria-label="Ver quem curtiu" aria-expanded={open} onClick={() => setOpen(value => !value)}><i className="bi bi-people" /></button>}
    {open && <div className="rc-engagement-popover">
      <strong>Quem curtiu</strong>
      <div className="rc-engagement-list">
        {likes.map(like => <div className="rc-engagement-person" key={like.id}>
          <UserAvatar user={like.User} className="rc-engagement-avatar" />
          <span>{like.User?.username || 'Usuário'}</span>
          {Number(like.userId) === Number(user?.id) && <small>Você</small>}
        </div>)}
      </div>
    </div>}
  </div>;
}
