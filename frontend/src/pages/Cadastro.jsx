import { useState, useContext } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import Navbar from "../components/Navbar";

function Cadastro() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      await authService.register(formData);
      await login({ email: formData.email, password: formData.password });
      setSuccess("Cadastro realizado com sucesso!");
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao cadastrar. Tente novamente.");
    }
  };

  return (
    <>
    <Navbar/>
    <div className="container mt-5 d-flex justify-content-center">
      <div className="card shadow p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h3 className="text-center mb-4 text-primary fw-bold">Cadastro</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Nome de usuário</label>
            <input
              type="text"
              name="username"
              className="form-control"
              placeholder="Digite seu nome de usuário"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">E-mail</label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="Digite seu e-mail"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Senha</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Crie uma senha"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button type="submit" className="btn btn-success w-100">
            Cadastrar
          </button>

          <div className="text-center mt-3">
            <small>
              Já tem conta?{" "}
              <span
                className="text-primary fw-bold"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/login")}
              >
                Faça login
              </span>
            </small>
          </div>
        </form>
      </div>
    </div>
    </>
  );
}

export default Cadastro;