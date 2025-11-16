import { useEffect, useState, useContext } from "react";
import denunciasService from "../services/denunciaService";
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";

export default function MinhasDenuncias() {
  const { user, token } = useContext(AuthContext);
  const [denuncias, setDenuncias] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDenuncias = async () => {
      try {
        const data = await denunciasService.buscarPorUsuario(user.id, token);
        setDenuncias(data);
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar denúncias.");
      } finally {
        setLoading(false);
      }
    };

    if (user && token) {
      fetchDenuncias();
    }
  }, [user, token]);

  const renderStatusBadge = (status) => {
    if (status === "aprovada")
      return <span className="badge bg-success">Aprovada ✅</span>;
    if (status === "rejeitada")
        return <span className="badge bg-danger">Rejeitada ❌</span>;
    if (status === "pendente")
        return <span className="badge bg-warning text-dark">Pendente ⏳</span>;
  };

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <h2 className="text-center text-primary mb-4">Minhas Denúncias</h2>

        {loading ? (
          <div className="text-center mt-4">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2">Carregando denúncias...</p>
          </div>
        ) : error ? (
          <div className="alert alert-danger text-center">{error}</div>
        ) : denuncias.length === 0 ? (
          <div className="alert alert-info text-center">
            Você ainda não fez nenhuma denúncia.
          </div>
        ) : (
          <div className="row">
            {denuncias.map((d) => (
              <div key={d.id} className="col-md-6 col-lg-4 mb-4">
                <div className="card h-100 shadow-sm border-0">
                  <div className="card-body">
                    <h5 className="card-title text-primary">{d.titulo}</h5>
                    <p className="card-text">{d.descricao}</p>
                    <p className="text-muted small">
                      <i className="bi bi-geo-alt"></i> {d.localizacao}
                    </p>
                    <div>{renderStatusBadge(d.status)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}