import { useEffect, useState, useContext} from "react";
import commentService from "../services/commentService";
import { AuthContext } from "../context/authContext";

export default function Comentarios({ denunciaId}) {
    const { user } = useContext(AuthContext);
    const [comments, setComments] = useState([]);
    const [open, setOpen] = useState(false);
    const [total, setTotal] = useState(0);
    const [text, setText] = useState("");

    // Buscar comentários ao abrir
    const loadComments = async () => {
        try {
        const res = await commentService.listarPorDenuncia(denunciaId);
        setComments(res.comments);
        setTotal(res.totalComments);
        } catch (err) {
        console.log("Erro ao carregar comentários");
        }
    };

    useEffect(() => {
        loadComments();
    },[])

    const toggleOpen = () => {
        setOpen(!open);
    };

    // Criar comentário
    const enviarComentario = async () => {
        if (!text.trim()) return;

        try {
        await commentService.create(denunciaId, { comentario: text });
        setText("");
        loadComments(); // Atualiza lista após envio
        } catch (err) {
        console.log("Erro ao comentar");
        }
    };

    return (
        <div className="mt-3">

        {/* Botão para abrir comentários */}
        <button
            className="btn btn-outline-primary btn-sm"
            onClick={toggleOpen}
        >
            Comentários ({total})
        </button>

        {/* Caixa de comentários */}
        {open && (
            <div className="card mt-3">
                <div className="card-body">
                    <h6 className="fw-bold mb-3">Comentários</h6>
                    {/* Caixa de texto */}
                    {user && (
                        <div className="mb-3">
                            <textarea
                                className="form-control"
                                rows="2"
                                placeholder="Digite um comentário..."
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                            />
                            <button className="btn btn-primary btn-sm mt-2" onClick={enviarComentario}>
                                Enviar
                            </button>
                        </div>
                    )}

                    {/* Lista de comentários */}
                    {comments.length === 0 ? (
                        <p className="text-muted small">Nenhum comentário ainda.</p>
                    ) : (
                        <ul className="list-group">
                            {comments.map((c) => (
                                <li key={c.id} className="list-group-item">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <strong>{c.User?.username || "Usuário"}</strong>
                                        <small className="text-muted ms-2">
                                            {new Date(c.createdAt).toLocaleString("pt-BR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                            })}
                                        </small>
                                    </div>
                                    <p className="mb-0">{c.comentario}</p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        )}
        </div>
    );
}