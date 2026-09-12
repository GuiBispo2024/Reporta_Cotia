import { useCallback, useEffect, useState, useContext } from "react";
import { Link } from 'react-router-dom';
import commentService from "../services/commentService";
import { AuthContext } from "../context/authContext";
import UserAvatar from './UserAvatar';
import { friendlyError } from '../utils/errorMessage';
import { hasPermission, PERMISSIONS } from '../utils/accessControl';

export default function Comentarios({ denunciaId, initialCount = 0, preview = false, initiallyOpen = false }) {
  const { user } = useContext(AuthContext);
  const [comments, setComments] = useState([]);
  const [open, setOpen] = useState(initiallyOpen);
  const [total, setTotal] = useState(Number(initialCount) || 0);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sort, setSort] = useState('newest');
  const canReviewCensorship = hasPermission(user, PERMISSIONS.CENSORSHIP_REVIEW);

  const loadComments = useCallback(async (requestedSort = sort) => {
    try {
      const res = await commentService.listarPorDenuncia(
        denunciaId,
        preview ? { page: 1, limit: 3, sort: 'newest' } : { sort: requestedSort }
      );
      setComments(res.comments);
      setTotal(res.totalComments);
      setLoaded(true);
    } catch (error) {
      setMessage(friendlyError(error, "Não foi possível carregar os comentários. Feche e abra esta conversa para tentar novamente."));
    }
  }, [denunciaId, preview, sort]);

  const changeSort = async event => {
    const nextSort = event.target.value;
    setSort(nextSort);
    await loadComments(nextSort);
  };

  useEffect(() => {
    if (initiallyOpen && !loaded) loadComments();
  }, [initiallyOpen, loaded, loadComments]);

  const toggleComments = () => {
    setMessage("");
    setOpen(value => {
      const next = !value;
      if (next && !loaded) loadComments();
      return next;
    });
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

  const enviarResposta = async parentCommentId => {
    if (!replyText.trim() || sending) return;
    try {
      setSending(true);
      setMessage('');
      await commentService.create(denunciaId, { comentario: replyText.trim(), parentCommentId });
      setReplyText('');
      setReplyingTo(null);
      await loadComments();
    } catch (err) {
      setMessage(friendlyError(err, 'Não foi possível publicar sua resposta.'));
    } finally { setSending(false); }
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

  const visibleComments = preview
    ? comments.reduce((result, comment) => {
        const usedSlots = result.reduce((totalItems, item) => totalItems + 1 + item.Replies.length, 0);
        const remainingSlots = 3 - usedSlots;
        if (remainingSlots <= 0) return result;
        result.push({ ...comment, Replies: (comment.Replies || []).slice(0, remainingSlots - 1) });
        return result;
      }, [])
    : comments;

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
            {!preview && total > 1 && <label className="rc-comment-order"><span>Ordenar</span><select value={sort} onChange={changeSort} aria-label="Ordenar comentários"><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option></select></label>}
          </div>

          <div className="rc-comment-list">
            {!comments.length ? (
              <div className="rc-comment-empty"><i className="bi bi-chat-square-dots" /><span>Seja o primeiro a comentar.</span></div>
            ) : visibleComments.map(c => (
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
                  {canReviewCensorship && c.comentarioOriginal && !c.censuraRevisada && <div className="rc-comment-review">
                    <small>Texto original para revisão</small>
                    <p>{c.comentarioOriginal}</p>
                    <div><button onClick={() => revisarCensura(c, true)}>Manter censura</button><button onClick={() => revisarCensura(c, false)}>Retirar censura</button></div>
                  </div>}
                  {editingId !== c.id && (Number(user?.id) === Number(c.userId) || canReviewCensorship) && (
                    <div className="rc-comment-actions">
                      {user?.id === c.userId && <button onClick={() => iniciarEdicao(c)}><i className="bi bi-pencil" /> Editar</button>}
                      <button className="text-danger" onClick={() => excluirComentario(c)}><i className="bi bi-trash" /> Excluir</button>
                    </div>
                  )}
                  {user && !preview && editingId !== c.id && <button className="rc-comment-reply-button" onClick={() => { setReplyingTo(c.id); setReplyText(''); }}><i className="bi bi-reply" /> Responder</button>}

                  {(c.Replies || []).length > 0 && <div className="rc-comment-replies">
                    {c.Replies.map(reply => <article className="rc-comment rc-comment-reply" key={reply.id}>
                      <UserAvatar user={reply.User} className="rc-comment-avatar" />
                      <div className="rc-comment-content">
                        <div className="rc-comment-meta"><strong>{reply.User?.username || 'Usuário'}</strong><time>{new Date(reply.createdAt).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></div>
                        {editingId === reply.id ? <div><textarea className="form-control form-control-sm" rows="2" maxLength="255" value={editingText} onChange={event => setEditingText(event.target.value)} /><div className="d-flex gap-2 mt-2"><button className="btn btn-primary btn-sm" disabled={!editingText.trim()} onClick={salvarEdicao}>Salvar</button><button className="btn btn-link btn-sm text-secondary" onClick={() => setEditingId(null)}>Cancelar</button></div></div> : <p>{reply.comentario}</p>}
                        {canReviewCensorship && reply.comentarioOriginal && !reply.censuraRevisada && <div className="rc-comment-review"><small>Texto original para revisão</small><p>{reply.comentarioOriginal}</p><div><button onClick={() => revisarCensura(reply, true)}>Manter censura</button><button onClick={() => revisarCensura(reply, false)}>Retirar censura</button></div></div>}
                        {editingId !== reply.id && (Number(user?.id) === Number(reply.userId) || canReviewCensorship) && <div className="rc-comment-actions">{Number(user?.id) === Number(reply.userId) && <button onClick={() => iniciarEdicao(reply)}><i className="bi bi-pencil" /> Editar</button>}<button className="text-danger" onClick={() => excluirComentario(reply)}><i className="bi bi-trash" /> Excluir</button></div>}
                      </div>
                    </article>)}
                  </div>}

                  {replyingTo === c.id && <div className="rc-comment-reply-compose"><textarea className="form-control form-control-sm" rows="2" maxLength="255" autoFocus placeholder={`Responder a ${c.User?.username || 'este comentário'}...`} value={replyText} onChange={event => setReplyText(event.target.value)} /><div><button className="btn btn-primary btn-sm" disabled={!replyText.trim() || sending} onClick={() => enviarResposta(c.id)}>Publicar resposta</button><button className="btn btn-link btn-sm text-secondary" onClick={() => setReplyingTo(null)}>Cancelar</button></div></div>}
                </div>
              </article>
            ))}
          </div>

          {preview && total > 0 && (
            <Link className="rc-comments-view-all" to={`/denuncia/${denunciaId}`}>
              Ver todos os comentários <i className="bi bi-arrow-right" />
            </Link>
          )}

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
