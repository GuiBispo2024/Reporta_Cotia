import { useCallback, useEffect, useState, useContext } from "react";
import commentService from "../services/commentService";
import { AuthContext } from "../context/authContext";
import UserAvatar from './UserAvatar';
import { friendlyError } from '../utils/errorMessage';

export default function Comentarios({ denunciaId }) {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const loadComments = useCallback(async () => {
    try {
      const res = await commentService.listarPorDenuncia(denunciaId);
      setComments(res.comments);
      setTotal(res.totalComments);
    } catch (error) {
      setMessage(friendlyError(error, "Não foi possível carregar os comentários. Feche e abra esta conversa para tentar novamente."));
    }
  }, [denunciaId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const toggleComments = () => {
    setMessage("");
    setOpen(value => !value);
  };

  const enviarComentario = async () => {
    if (!text.trim() || sending) return;
    try {
      setSending(true);
      setMessage("");
      await commentService.create(denunciaId, { comentario: text.trim() });
      setText("");
      await loadComments();
    } catch (err) {
      setMessage(friendlyError(err, "Não foi possível publicar seu comentário. O texto foi mantido para você tentar novamente."));
    } finally { setSending(false); }
  };

  const iniciarEdicao = (comment) => {
    setEditingId(comment.id);
    setEditingText(comment.comentario);
  };

  const salvarEdicao = async () => {
    if (!editingText.trim()) return;
    try {
      await commentService.atualizar(editingId, { comentario: editingText.trim() });
      setEditingId(null);
      setEditingText("");
      await loadComments();
    } catch (err) {
      setMessage(friendlyError(err, "Não foi possível salvar a edição do comentário. Tente novamente."));
    }
  };

  const excluirComentario = async (comment) => {
    if (!window.confirm("Excluir este comentário permanentemente? Esta ação não poderá ser desfeita.")) return;
    try {
      await commentService.deletar(comment.id);
      await loadComments();
    } catch (err) {
      setMessage(friendlyError(err, "Não foi possível excluir o comentário. Tente novamente."));
    }
  };

  const revisarCensura = async (comment, manterCensura) => {
    try {
      await commentService.revisarCensura(comment.id, manterCensura);
      await loadComments();
    } catch (err) {
      setMessage(friendlyError(err, 'Não foi possível revisar a censura deste comentário.'));
    }
  };

  return (
    <div className="rc-comments mt-3">
      <button className="rc-comments-toggle" onClick={toggleComments} aria-expanded={open}>
        <span><i className="bi bi-chat-left-text me-2" />Comentários</span>
        <span className="rc-comments-count">{total}</span>
        <i className={`bi bi-chevron-${open ? "up" : "down"} ms-2`} />
      </button>

      {open && (
        <div className="rc-comments-panel">
          <div className="rc-comments-heading">
            <div><strong>Conversa</strong><small>{total ? `${total} ${total === 1 ? 'comentário' : 'comentários'}` : 'Nenhum comentário ainda'}</small></div>
          </div>

          <div className="rc-comment-list">
            {!comments.length ? (
              <div className="rc-comment-empty"><i className="bi bi-chat-square-dots" /><span>Seja o primeiro a comentar.</span></div>
            ) : comments.map(c => (
              <article className="rc-comment" key={c.id}>
                <UserAvatar user={c.User} className="rc-comment-avatar" />
                <div className="rc-comment-content">
                  <div className="rc-comment-meta">
                    <strong>{c.User?.username || "Usuário"}</strong>
                    <time>{new Date(c.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                  {editingId === c.id ? (
                    <div>
                      <textarea className="form-control form-control-sm" rows="2" maxLength="255" value={editingText} onChange={e => setEditingText(e.target.value)} />
                      <div className="d-flex gap-2 mt-2">
                        <button className="btn btn-primary btn-sm" disabled={!editingText.trim()} onClick={salvarEdicao}>Salvar</button>
                        <button className="btn btn-link btn-sm text-secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : <p>{c.comentario}</p>}
                  {user?.adm && c.comentarioOriginal && !c.censuraRevisada && <div className="rc-comment-review">
                    <small>Texto original para revisão</small>
                    <p>{c.comentarioOriginal}</p>
                    <div><button onClick={() => revisarCensura(c, true)}>Manter censura</button><button onClick={() => revisarCensura(c, false)}>Retirar censura</button></div>
                  </div>}
                  {editingId !== c.id && (user?.id === c.userId || user?.adm) && (
                    <div className="rc-comment-actions">
                      {user?.id === c.userId && <button onClick={() => iniciarEdicao(c)}><i className="bi bi-pencil" /> Editar</button>}
                      <button className="text-danger" onClick={() => excluirComentario(c)}><i className="bi bi-trash" /> Excluir</button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>

          {user ? (
            <div className="rc-comment-compose">
              <UserAvatar user={user} className="rc-comment-avatar" />
              <div className="flex-grow-1">
                <div className="rc-comment-input-wrap">
                  <textarea className="form-control" rows="2" maxLength="255" placeholder="Escreva um comentário..." value={text} onChange={e => setText(e.target.value)} />
                  <button aria-label="Publicar comentário" title="Publicar comentário" disabled={!text.trim() || sending} onClick={enviarComentario}><i className={`bi ${sending ? 'bi-hourglass-split' : 'bi-send-fill'}`} /></button>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small className="text-muted">Comente com respeito • {text.length}/255</small>
                  {sending && <small className="text-primary">Publicando...</small>}
                </div>
              </div>
            </div>
          ) : <div className="rc-comment-login"><i className="bi bi-info-circle me-2" />Entre na sua conta para participar da conversa.</div>}

          {message && <div className="alert alert-danger py-2 small mt-3 mb-0">{message}</div>}
        </div>
      )}
    </div>
  );
}
