import { useEffect, useState, useContext } from "react";
import {AuthContext} from "../context/authContext";
import denunciaService from "../services/denunciaService";
import Comentarios from "../components/Comentarios.jsx";
import Like from "../components/Likes.jsx";
import Navbar from "../components/Navbar.jsx";
import Footer from "../components/Footer.jsx";
import FilterAndSearch from "../components/FilterAndSearch.jsx";

const Home = () => {
    const {user, isAuthenticated} = useContext(AuthContext);
    const [denuncias, setDenuncias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDenuncias = async () => {
            try {
                const data = await denunciaService.listarTodas();
                const aprovadas = data.filter((d) => d.status === "aprovada");
                setDenuncias(aprovadas);
            }catch (err) {
                setError("Erro ao carregar denúncias.");
            }finally{
                setLoading(false);
            }
        }
        fetchDenuncias();
    },[]);

    //Função para aplicar os filtros enviados pelo FilterAndSearch
    const aplicarFiltros = async (params) => {
        try {
            setLoading(true);
            const data = await denunciaService.filtrar(params);

            // Mantém somente aprovadas
            const aprovadas = data.filter((d) => d.status === "aprovada");
            setDenuncias(aprovadas);
        } catch (err) {
            setError("Erro ao filtrar denúncias.");
        } finally {
            setLoading(false);
        }
    };

   if (loading)
    return (
      <div className="container text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
        <p className="mt-3">Carregando denúncias...</p>
      </div>
    );

  if (error)
    return (
      <div className="alert alert-danger text-center mt-4" role="alert">
        {error}
      </div>
    );

  return (
    <>
      <Navbar/>

      <div className="container mt-5">
        {!isAuthenticated ? (
          <div className="text-center mb-5">
            <h1 className="fw-bold text-primary">Bem-vindo ao Reporta Cotia</h1>
            <p className="text-muted fs-5">
              Ajude a melhorar sua cidade reportando problemas de
              infraestrutura.
            </p>
          </div>
        ) : (
          <div className="text-center mb-5">
            <h2 className="fw-semibold text-success">
              Bem-vindo, {user?.username}!
            </h2>
            {user?.adm ? (
              <p className="text-secondary">Você está logado(a) como usuário administrador.</p>
            ) : (
              <p className="text-secondary">Você está logado(a) como usuário comum.</p>
            )}
          </div>
        )}

        <FilterAndSearch onFilter={aplicarFiltros} />

        <h3 className="mb-4 text-center fw-bold">Denúncias</h3>

        {denuncias.length === 0 ? (
          <p className="text-center text-muted">
            Nenhuma denúncia aprovada ainda.
          </p>
        ) : (
          <div className="row g-4">
            {denuncias.map((d) => (
              <div key={d.id} className="col-md-6 col-lg-4">
                <div className="card shadow-sm border-0">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center">
                      <h5 className="card-title text-primary fw-bold">
                        {d.titulo}
                      </h5>
                      <small className="text-muted ms-2">
                        {new Date(d.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                      </small>
                    </div>
                    <p className="card-text">{d.descricao}</p>
                    <p className="text-muted mb-1">
                      <i className="bi bi-geo-alt-fill"></i> {d.localizacao}
                    </p>
                    <p className="small text-secondary">
                      Reportado por:{" "}
                      <strong>{d.User ? d.User.username : "Anônimo"}</strong>
                    </p>
                  </div>
                  {/* Seção de comentários e likes */}
                  <div className="card-footer bg-white border-0">
                    <div className="mb-2">
                      <Like denunciaId={d.id} />
                    </div>
                    <div>
                      <Comentarios denunciaId={d.id} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer/>
    </>
  )
}
export default Home;