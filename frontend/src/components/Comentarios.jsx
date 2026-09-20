import { useCallback, useEffect, useState, useContext, useRef } from "react";
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
  const [expandedReplies, setExpandedReplies] = useState({});
  const carouselRef = useRef(null);
  const canReviewCensorship = hasPermission(user, PERMISSIONS.CENSORSHIP_REVIEW);

  const loadComments = useCallback(async (requestedSort = sort) => {
    try {
      const res = await commentService.listarPorDenuncia(
        denunciaId,
        { sort: preview ? 'newest' : requestedSort }
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
      setExpandedReplies(current => ({ ...current, [parentCommentId]: true }));
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

  const moveCarousel = direction => {
    const carousel = carouselRef.current;
    if (!carousel) return;
    carousel.scrollBy({ left: direction * carousel.clientWidth, behavior: document.documentElement.classList.contains('rc-reduced-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth' });
  };

  const renderComment = (c, isReply = false) => (
              <article className={`rc-comment${isReply ? " rc-comment-reply" : ""}`} key={c.id}>
                <UserAvatar user={c.User} className="rc-comment-avatar" />
                <div className="rc-comment-content">
                  <div className="rc-comment-meta">
                    <strong>{c.User?.username || "Usuário"}</strong>
                    <time>{new Date(c.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                  {editingId === c.id ? (
                    <div>
                      <textarea aria-label="Editar comentário" className="form-control form-control-sm" rows="2" maxLength="255" value={editingText} onChange={e => setEditingText(e.target.value)} />
                      <div className="d-flex gap-2 mt-2">
                        <button className="btn btn-primary btn-sm" disabled={!editingText.trim()} onClick={salvarEdicao}>Salvar</button>
                        <button className="btn btn-link btn-sm text-secondary" onClick={() => setEditingId(null)}>Cancelar</button>
                      </div>
                    </div>
                  ) : <p>{c.comentario}</p>}
                  {!preview && canReviewCensorship && c.comentarioOriginal && !c.censuraRevisada && <div className="rc-comment-review">
                    <small>Texto original para revisão</small>
                    <p>{c.comentarioOriginal}</p>
                    <div><button onClick={() => revisarCensura(c, true)}>Manter censura</button><button onClick={() => revisarCensura(c, false)}>Retirar censura</button></div>
                  </div>}
                  {!preview && editingId !== c.id && (Number(user?.id) === Number(c.userId) || canReviewCensorship) && (
                    <div className="rc-comment-actions">
                      {user?.id === c.userId && <button onClick={() => iniciarEdicao(c)}><i aria-hidden="true" className="bi bi-pencil" /> Editar</button>}
                      <button className="text-danger" onClick={() => excluirComentario(c)}><i aria-hidden="true" className="bi bi-trash" /> Excluir</button>
                    </div>
                  )}
                  {user && !preview && editingId !== c.id && <button className="rc-comment-reply-button" onClick={() => { setReplyingTo(c.id); setReplyText(isReply ? `@${c.User?.username || 'Usuário'} ` : ''); }}><i aria-hidden="true" className="bi bi-reply" /> Responder</button>}

                  {!preview && (c.Replies || []).length > 0 && <button type="button" className="rc-comment-replies-toggle" aria-expanded={!!expandedReplies[c.id]} aria-controls={`replies-${denunciaId}-${c.id}`} onClick={() => setExpandedReplies(current => ({ ...current, [c.id]: !current[c.id] }))}>
                    <i className={`bi bi-chevron-${expandedReplies[c.id] ? 'up' : 'down'}`} />
                    {expandedReplies[c.id] ? 'Ocultar respostas' : `${c.Replies.length} ${c.Replies.length === 1 ? 'resposta' : 'respostas'}`}
                  </button>}
                  {!preview && expandedReplies[c.id] && (c.Replies || []).length > 0 && <div className="rc-comment-replies" id={`replies-${denunciaId}-${c.id}`}>
                    {c.Replies.map(reply => renderComment(reply, true))}
                  </div>}

                  {replyingTo === c.id && <div className="rc-comment-compose">
                    <UserAvatar user={user} className="rc-comment-avatar" />
                    <div className="flex-grow-1">
                      <div className="rc-comment-input-wrap">
                        <textarea aria-label={`Resposta a ${c.User?.username || "este comentário"}`} className="form-control" rows="2" maxLength="255" autoFocus placeholder={`Responder a ${c.User?.username || 'este comentário'}...`} value={replyText} onChange={event => setReplyText(event.target.value)} />
                        <button aria-label="Publicar resposta" title="Publicar resposta" disabled={!replyText.trim() || sending} onClick={() => enviarResposta(c.id)}><i className={`bi ${sending ? 'bi-hourglass-split' : 'bi-send-fill'}`} /></button>
                      </div>
                      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mt-2">
                        <small className="text-muted">Comente com respeito • {replyText.length}/255</small>
                        {sending && <small className="text-primary">Publicando...</small>}
                        <button className="btn btn-link btn-sm text-secondary p-0" disabled={sending} onClick={() => setReplyingTo(null)}>Cancelar</button>
                      </div>
                    </div>
                  </div>}
                </div>
              </article>
  );

  return (
    <div className={`rc-comments mt-3${preview ? " rc-comments-preview" : ""}`}>
      <button className="rc-comments-toggle" onClick={toggleComments} aria-expanded={open}>
        <span><i aria-hidden="true" className="bi bi-chat-left-text me-2" />Comentários</span>
        <span className="rc-comments-count">{total}</span>
        <i className={`bi bi-chevron-${open ? "up" : "down"} ms-2`} />
      </button>

      {open && (
        <div className="rc-comments-panel">
          {!preview && <div className="rc-comments-heading">
            <div><strong>Conversa</strong><small>{total ? `${total} ${total === 1 ? 'comentário' : 'comentários'}` : 'Nenhum comentário ainda'}</small></div>
            {!preview && total > 1 && <label className="rc-comment-order"><span>Ordenar</span><select value={sort} onChange={changeSort} aria-label="Ordenar comentários"><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option></select></label>}
          </div>}

          {preview && comments.length > 1 && <div className="rc-comment-carousel-controls">
            <span>Comentários principais</span>
            <button type="button" aria-label="Comentários anteriores" onClick={() => moveCarousel(-1)}><i aria-hidden="true" className="bi bi-chevron-left" /></button>
            <button type="button" aria-label="Próximos comentários" onClick={() => moveCarousel(1)}><i aria-hidden="true" className="bi bi-chevron-right" /></button>
          </div>}
          <div className={`rc-comment-list${preview ? ' rc-comment-carousel' : ''}`} ref={carouselRef} role={preview ? 'region' : undefined} aria-label={preview ? 'Carrossel de comentários principais' : undefined} tabIndex={preview ? 0 : undefined}>
            {!comments.length ? (
              <div className="rc-comment-empty"><i aria-hidden="true" className="bi bi-chat-square-dots" /><span>Seja o primeiro a comentar.</span></div>
            ) : comments.map(c => (
              renderComment(c)
            ))}
          </div>

          {preview && total > 0 && (
            <Link className="rc-comments-view-all" to={`/denuncia/${denunciaId}#comentarios`}>
              Ver todos os comentários <i aria-hidden="true" className="bi bi-arrow-right" />
            </Link>
          )}

          {user ? (
            <div className="rc-comment-compose">
              <UserAvatar user={user} className="rc-comment-avatar" />
              <div className="flex-grow-1">
                <div className="rc-comment-input-wrap">
                  <textarea aria-label="Escreva um comentário" className="form-control" rows={preview ? 1 : 2} maxLength="255" placeholder="Escreva um comentário..." value={text} onChange={e => setText(e.target.value)} />
                  <button aria-label="Publicar comentário" title="Publicar comentário" disabled={!text.trim() || sending} onClick={enviarComentario}><i className={`bi ${sending ? 'bi-hourglass-split' : 'bi-send-fill'}`} /></button>
                </div>
                <div className="d-flex justify-content-between align-items-center mt-2">
                  <small className="text-muted">Comente com respeito • {text.length}/255</small>
                  {sending && <small className="text-primary">Publicando...</small>}
                </div>
              </div>
            </div>
          ) : <div className="rc-comment-login"><i aria-hidden="true" className="bi bi-info-circle me-2" />Entre na sua conta para participar da conversa.</div>}

          {message && <div role="alert" className="alert alert-danger py-2 small mt-3 mb-0">{message}</div>}
        </div>
      )}
    </div>
  );
}
