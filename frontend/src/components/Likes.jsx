import { useState, useEffect, useContext } from "react";
import likeService from "../services/likeService";
import { AuthContext } from "../context/authContext";

export default function Like({ denunciaId }) {
  const { user } = useContext(AuthContext);

  const [curtido, setCurtido] = useState(false);
  const [total, setTotal] = useState(0);

  const loadLikes = async () => {
    try {
      const res = await likeService.listarPorDenuncia(denunciaId);
      setTotal(res.length);

      if (user) {
        const already = res.some((l) => l.userId === user.id);
        setCurtido(already);
      }
    } catch (err) {
      console.log("Erro ao carregar likes");
    }
  };

  useEffect(() => {
    loadLikes();
  }, []);

  const toggleLike = async () => {
    if (!user) return alert("Você precisa estar logado.");

    try {
      if (curtido) {
        await likeService.descurtir(denunciaId);
        setCurtido(false);
        setTotal((t) => t - 1);
      } else {
        await likeService.curtir(denunciaId);
        setCurtido(true);
        setTotal((t) => t + 1);
      }
    } catch (err) {
      console.log("Erro ao curtir/descurtir", err);
    }
  };

  return (
    <button
      onClick={toggleLike}
      className={`btn btn-sm ${curtido ? "btn-primary" : "btn-outline-primary"}`}
    >
      👍 {total}
    </button>
  );
}
