import { useEffect, useState, useContext } from "react";
import denunciasService from "../services/denunciaService";
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

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

  const handleEditar = (id) => {
    // Redireciona para página de edição
    window.location.href = `/editar-denuncia/${id}`;
  };

  const handleExcluir = async (id) => {
    if (!window.confirm("Tem certeza que deseja excluir esta denúncia?")) 
      return;
    try {
      await denunciasService.deletar(id, token);
      // Atualiza a lista de denúncias
      setDenuncias((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir denúncia.");
    }
  };

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
                    <div className="d-flex justify-content-between align-items-center">
                      {renderStatusBadge(d.status)}
                      {d.status === "rejeitada" && (
                        <div className="mt-3 d-flex gap-2">
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleEditar(d.id)}
                          >
                            Editar
                          </button>

                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleExcluir(d.id)}
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}