import { useState, useContext } from "react";
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import userService from "../services/userService";

export default function EditarPerfil() {
  const { user} = useContext(AuthContext);
  const navigate = useNavigate();
  const { logout } = useContext(AuthContext);

  const [form, setForm] = useState({
    username: user?.username || "",
    email: user?.email || "",
    senhaAtual: "",
    novaSenha: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await userService.update(form);
    
      alert("Para concluir esta ação, faça login novamente.");
      logout(); // limpa token e user
      navigate("/login"); // redireciona para login

    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Erro ao atualizar perfil.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">

            <div className="card shadow-sm border-0">
              <div className="card-body">

                <h3 className="text-center text-primary mb-4">Editar Perfil</h3>

                <form onSubmit={handleSubmit}>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Usuário</label>
                    <input
                      type="text"
                      className="form-control"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">Senha atual</label>
                    <input
                      type="password"
                      className="form-control"
                      name="senhaAtual"
                      placeholder="Digite sua senha atual"
                      value={form.senhaAtual}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-bold">Nova senha</label>
                    <input
                      type="password"
                      className="form-control"
                      name="novaSenha"
                      placeholder="Digite para alterar"
                      value={form.novaSenha}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="d-grid">
                    <button className="btn btn-primary" disabled={loading}>
                      {loading ? "Salvando..." : "Salvar Alterações"}
                    </button>
                  </div>

                </form>

              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
