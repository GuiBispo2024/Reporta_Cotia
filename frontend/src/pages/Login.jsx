import { useState, useContext, useEffect} from "react";
import {AuthContext} from "../context/authContext";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const expired = localStorage.getItem("sessionExpired");
    if (expired) {
      setError("Sua sessão expirou. Faça login novamente.");
      localStorage.removeItem("sessionExpired"); 
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
      navigate("/");
    } catch (err) {
      setError(err.message || "Erro ao fazer login. Tente novamente.");
    }
  };

  return (
    <>
    <Navbar/>
    <div className="container mt-5 d-flex justify-content-center">
      <div className="card shadow p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <h3 className="text-center mb-4 text-primary fw-bold">Login</h3>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">E-mail</label>
            <input
              type="email"
              className="form-control"
              placeholder="Digite seu e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Senha</label>
            <input
              type="password"
              className="form-control"
              placeholder="Digite sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <button type="submit" className="btn btn-primary w-100">
            Entrar
          </button>

          <div className="text-center mt-3">
            <small>
              Não tem conta?{" "}
              <span
                className="text-primary fw-bold"
                style={{ cursor: "pointer" }}
                onClick={() => navigate("/cadastro")}
              >
                Cadastre-se
              </span>
            </small>
          </div>
        </form>
      </div>
    </div>
    <Footer/>
    </>
  );
}

export default Login;