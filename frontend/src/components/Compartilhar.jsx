import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import shareService from '../services/shareService';
import { AuthContext } from '../context/authContext';
import { friendlyError } from '../utils/errorMessage';
import UserAvatar from './UserAvatar';

export default function Compartilhar({ denunciaId, titulo }) {
  const { user } = useContext(AuthContext);
  const [shares, setShares] = useState([]);
  const [open, setOpen] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [comentario, setComentario] = useState('');
  const menuRef = useRef(null);

  const carregar = useCallback(async () => {
    try {
      const result = await shareService.listarPorDenuncia(denunciaId);
      setShares(result.shares || []);
    } catch {
      // O histórico não deve impedir a navegação pela página.
    }
  }, [denunciaId]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!open) return undefined;
    const close = event => {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const escolher = async type => {
    if (!user) return alert('Entre na sua conta para compartilhar esta denúncia.');
    if (sharing) return;
    const url = `${window.location.origin}/denuncia/${denunciaId}`;
    const encodedUrl = encodeURIComponent(url);
    const shareText = [comentario.trim(), `${titulo} — Reporta Cotia`].filter(Boolean).join(' — ');
    const encodedText = encodeURIComponent(shareText);

    try {
      setSharing(true);
      if (type === 'copy') await navigator.clipboard.writeText([comentario.trim(), titulo, url].filter(Boolean).join('\n'));
      else if (type === 'whatsapp') window.open(`https://wa.me/?text=${encodedText}%20${encodedUrl}`, '_blank', 'noopener,noreferrer');
      else if (type === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank', 'noopener,noreferrer');
      await shareService.compartilhar(denunciaId, { comentario: comentario.trim() });
      setComentario('');
      await carregar();
      window.dispatchEvent(new CustomEvent('reporta:shares-changed', { detail: { denunciaId } }));
      if (type === 'copy') alert('Link copiado e compartilhamento registrado.');
    } catch (error) {
      alert(friendlyError(error, 'Não foi possível compartilhar esta denúncia. Tente novamente.'));
    } finally { setSharing(false); }
  };

  const remover = async share => {
    if (!window.confirm('Remover este registro do seu histórico de compartilhamentos? Isso não apaga envios já feitos em outros aplicativos.')) return;
    try {
      await shareService.deletar(share.id);
      setShares(current => current.filter(item => item.id !== share.id));
      window.dispatchEvent(new CustomEvent('reporta:shares-changed', { detail: { denunciaId } }));
    } catch (error) {
      alert(friendlyError(error, 'Não foi possível remover este registro do histórico. Tente novamente.'));
    }
  };

  return <div className="rc-share" ref={menuRef}>
    <button className="btn btn-outline-secondary btn-sm" onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <i className="bi bi-share me-1" /> Compartilhar ({shares.length})
    </button>
    {open && <div className="rc-share-menu rc-share-menu-expanded">
      <div className="rc-share-title">Compartilhar denúncia</div>
      {user ? <>
        <textarea maxLength="255" rows="2" value={comentario} onChange={event => setComentario(event.target.value)} placeholder="Adicione uma mensagem (opcional)" />
        <div className="rc-share-options">
          <button disabled={sharing} onClick={() => escolher('whatsapp')}><i className="bi bi-whatsapp" /> WhatsApp</button>
          <button disabled={sharing} onClick={() => escolher('facebook')}><i className="bi bi-facebook" /> Facebook</button>
          <button disabled={sharing} onClick={() => escolher('copy')}><i className="bi bi-link-45deg" /> Copiar link</button>
        </div>
      </> : <p className="rc-share-login">Entre na sua conta para registrar um compartilhamento.</p>}

      <div className="rc-share-history">
        <strong>Histórico ({shares.length})</strong>
        {shares.length === 0 ? <small>Ainda não há compartilhamentos.</small> : shares.map(share => <div className="rc-share-history-item" key={share.id}>
          <UserAvatar user={share.User} className="rc-engagement-avatar" />
          <div><span>{share.User?.username || 'Usuário'}{Number(share.userId) === Number(user?.id) ? ' (você)' : ''}</span>{share.comentario && <small>“{share.comentario}”</small>}<time>{new Date(share.createdAt).toLocaleDateString('pt-BR')}</time></div>
          {Number(share.userId) === Number(user?.id) && <button className="rc-share-remove" title="Remover do meu histórico" aria-label="Remover do meu histórico" onClick={() => remover(share)}><i className="bi bi-trash" /></button>}
        </div>)}
      </div>
      <button className="rc-share-cancel" onClick={() => setOpen(false)}>Fechar</button>
    </div>}
  </div>;
}
