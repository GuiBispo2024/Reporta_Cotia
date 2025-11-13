import React, { useEffect, useState } from "react";
import denunciaService from "../services/denunciaService";
import Navbar from "../components/Navbar";

export default function Moderacao() {
  const [denuncias, setDenuncias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    carregarDenunciasPendentes();
  }, []);

  const carregarDenunciasPendentes = async () => {
    try {
      const todas = await denunciaService.listarTodas();
      const pendentes = todas.filter((d) => d.status === "pendente");
      setDenuncias(pendentes);
    } catch (err) {
      setError("Erro ao carregar denúncias pendentes.");
    } finally {
      setLoading(false);
    }
  };

  const moderarDenuncia = async (id, status) => {
    try {
      await denunciaService.moderar(id, { status });
      setDenuncias((prev) => prev.filter((d) => d.id !== id));
      alert(`Denúncia marcada como ${status}.`);
    } catch (err) {
      alert("Erro ao atualizar status da denúncia.");
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h2 className="text-center mb-4">🛠️ Moderação de Denúncias</h2>

        {loading && (
          <div className="text-center">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2">Carregando denúncias...</p>
          </div>
        )}

        {error && (
          <div className="alert alert-danger text-center" role="alert">
            {error}
          </div>
        )}

        {!loading && denuncias.length === 0 && (
          <div className="alert alert-info text-center">
            Não há denúncias pendentes no momento.
          </div>
        )}

        <div className="row">
          {denuncias.map((d) => (
            <div className="col-md-6 col-lg-4 mb-4" key={d.id}>
              <div className="card shadow-sm h-100">
                <div className="card-body">
                  <h5 className="card-title">{d.titulo}</h5>
                  <p className="card-text">
                    <strong>Descrição:</strong> {d.descricao}
                  </p>
                  <p className="card-text">
                    <strong>Localização:</strong> {d.localizacao}
                  </p>
                  <p className="card-text">
                    <strong>Usuário:</strong> {d.User?.username || "Desconhecido"}
                  </p>

                  <div className="d-flex justify-content-between mt-3">
                    <button
                      className="btn btn-success w-50 me-2"
                      onClick={() => moderarDenuncia(d.id, "aprovada")}
                    >
                      ✅ Aprovar
                    </button>
                    <button
                      className="btn btn-danger w-50"
                      onClick={() => moderarDenuncia(d.id, "rejeitada")}
                    >
                      ❌ Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}