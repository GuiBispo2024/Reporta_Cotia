import { useState, useContext, useEffect } from "react";
import { AuthContext } from "../context/authContext";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("sessionExpired")) setError("Sua sessão expirou. Faça login novamente.");
    localStorage.removeItem("sessionExpired");
  }, []);

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await login({ email, password });
      navigate("/");
    } catch (err) {
      setError(err.message || "Erro ao fazer login. Tente novamente.");
    } finally { setLoading(false); }
  };

  return <div className="rc-page">
    <Navbar />
    <main className="rc-account-page">
      <div className="rc-account-shell">
        <section className="rc-account-intro">
          <span className="rc-eyebrow">PARTICIPAÇÃO CIDADÃ</span>
          <h1>Acompanhe e transforme sua cidade.</h1>
          <p>Entre para registrar problemas urbanos e acompanhar cada etapa da solução.</p>
          <i className="bi bi-buildings" />
        </section>
        <section className="rc-account-card">
          <div className="rc-account-icon"><i className="bi bi-person-check" /></div>
          <h2>Bem-vindo de volta</h2>
          <p className="text-muted mb-4">Acesse sua conta do Reporta Cotia.</p>
          <form onSubmit={handleSubmit}>
            <label className="form-label fw-semibold">E-mail</label>
            <div className="input-group input-group-lg mb-3"><span className="input-group-text"><i className="bi bi-envelope" /></span><input type="email" className="form-control" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <label className="form-label fw-semibold">Senha</label>
            <div className="input-group input-group-lg mb-3"><span className="input-group-text"><i className="bi bi-lock" /></span><input type="password" className="form-control" placeholder="Digite sua senha" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <div className="text-end mb-3"><Link className="small fw-semibold" to="/esqueci-senha">Esqueci minha senha</Link></div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button className="btn btn-primary btn-lg w-100" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
          </form>
          <p className="text-center text-muted small mt-4 mb-0">Não tem conta? <button className="rc-text-action" onClick={() => navigate("/cadastro")}>Cadastre-se</button></p>
        </section>
      </div>
    </main>
    <Footer />
  </div>;
}
