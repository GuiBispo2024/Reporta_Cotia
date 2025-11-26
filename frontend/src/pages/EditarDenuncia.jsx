import { useEffect, useState, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import denunciaService from "../services/denunciaService";
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function EditarDenuncia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [status, setStatus] = useState("");
  const [ownerId, setOwnerId] = useState(null);
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    localizacao: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const carregar = async () => {
      try {
        const data = await denunciaService.buscarPorId(id, user);
        setForm({
          titulo: data.titulo,
          descricao: data.descricao,
          localizacao: data.localizacao
        });
        setStatus(data.status);
        setOwnerId(data.userId);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar denúncia.");
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [id, user]);

  if (!user?.id) {
    return (
      <h2 className="alert alert-danger text-center">
        Você precisa estar logado para acessar esta página.
      </h2>
    );
  }

  if (ownerId !== user.id) {
    return (
      <h2 className="alert alert-danger text-center">
        Apenas o usuário que fez a denúncia pode acessar esta página.
      </h2>
    );
  }

  if (status === "aprovada") {
    return (
      <h2 className="alert alert-warning text-center">
        Denúncias aprovadas não podem ser editadas.
      </h2>
    );
  }

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await denunciaService.atualizar(id, {...form,status:"pendente"}, user);
      alert("Denúncia atualizada com sucesso e enviada para moderação!");
      navigate("/minhas-denuncias");
    } catch (err) {
      console.error(err);
      alert("Erro ao atualizar denúncia.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h2 className="text-center text-primary mb-4">Editar Denúncia</h2>

        {loading ? (
          <p className="text-center">Carregando...</p>
        ) : error ? (
          <div className="alert alert-danger text-center">{error}</div>
        ) : (
          <form className="card p-4 shadow-sm" onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Título</label>
              <input
                type="text"
                className="form-control"
                name="titulo"
                value={form.titulo}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Descrição</label>
              <textarea
                className="form-control"
                rows="3"
                name="descricao"
                value={form.descricao}
                onChange={handleChange}
                required
              ></textarea>
            </div>

            <div className="mb-3">
              <label className="form-label">Localização</label>
              <input
                type="text"
                className="form-control"
                name="localizacao"
                value={form.localizacao}
                onChange={handleChange}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary w-100">
              Salvar Alterações
            </button>
          </form>
        )}
      </div>
      <Footer />
    </>
  );
}