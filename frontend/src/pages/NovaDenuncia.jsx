import { useState, useContext } from "react";
import denunciaService from "../services/denunciaService";
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function NovaDenuncia() {
  const { user } = useContext(AuthContext);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [localizacao, setLocalizacao] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem("");

    try {
      const data = {
        titulo,
        descricao,
        localizacao,
        userId: user?.id, // vincula o usuário logado à denúncia
      };

      await denunciaService.create(data);

      setMensagem("✅ Denúncia enviada com sucesso! Aguarde aprovação.");
      setTitulo("");
      setDescricao("");
      setLocalizacao("");
    } catch (error) {
      console.error(error);
      setMensagem("❌ Erro ao enviar denúncia.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <div className="card shadow-sm p-4 mx-auto" style={{ maxWidth: "600px" }}>
          <h2 className="mb-4 text-center text-primary">Nova Denúncia</h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label">Título</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Buraco na rua"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label">Descrição</label>
              <textarea
                className="form-control"
                placeholder="Descreva o problema..."
                rows="4"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
              ></textarea>
            </div>

            <div className="mb-3">
              <label className="form-label">Localização</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ex: Rua das Flores, nº 100"
                value={localizacao}
                onChange={(e) => setLocalizacao(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-success w-100"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar Denúncia"}
            </button>
          </form>

          {mensagem && (
            <div className="alert alert-info mt-3 text-center">{mensagem}</div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}