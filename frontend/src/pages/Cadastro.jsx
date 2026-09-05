import { useState, useContext } from "react";
import { AuthContext } from "../context/authContext";
import { useNavigate } from "react-router-dom";
import authService from "../services/authService";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { friendlyError } from '../utils/errorMessage';
import AvatarCropper from '../components/AvatarCropper';

export default function Cadastro() {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarToCrop, setAvatarToCrop] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const escolherAvatar = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Selecione um arquivo de imagem válido.");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("A foto de perfil deve ter no máximo 5 MB.");
      e.target.value = "";
      return;
    }
    setAvatarToCrop(file);
    setError("");
    e.target.value = "";
  };

  const aplicarRecorte = file => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarToCrop(null);
  };

  const removerAvatar = () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatar(null);
    setAvatarPreview("");
  };

  const submit = async e => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (avatar) data.append("avatar", avatar);
      await authService.register(data);
      await login({ email: form.email, password: form.password });
      navigate("/");
    } catch (err) {
      setError(friendlyError(err, err.message || "Não foi possível criar sua conta. Revise os dados e tente novamente."));
    } finally { setLoading(false); }
  };

  return <div className="rc-page">
    <Navbar />
    <main className="rc-account-page">
      <div className="rc-account-shell">
        <section className="rc-account-intro">
          <span className="rc-eyebrow">FAÇA PARTE</span>
          <h1>Sua voz ajuda a melhorar Cotia.</h1>
          <p>Crie sua conta para reportar problemas e acompanhar as melhorias da cidade.</p>
          <i className="bi bi-geo-alt" />
        </section>
        <section className="rc-account-card">
          <div className="rc-account-icon"><i className="bi bi-person-plus" /></div>
          <h2>Crie sua conta</h2>
          <p className="text-muted mb-4">É rápido, gratuito e leva menos de um minuto.</p>
          <form onSubmit={submit}>
            <div className="rc-signup-avatar">
              <div className="rc-signup-avatar-preview">
                {avatarPreview
                  ? <img src={avatarPreview} alt="Prévia da foto de perfil" />
                  : <i className="bi bi-person" />}
              </div>
              <div>
                <label className="btn btn-outline-primary btn-sm rc-avatar-upload">
                  <i className="bi bi-camera me-2" />Adicionar foto
                  <input type="file" accept="image/*" onChange={escolherAvatar} />
                </label>
                <small>Opcional · JPG, PNG ou outra imagem de até 5 MB</small>
                {avatarPreview && <button type="button" className="btn btn-link btn-sm text-danger p-0 mt-2" onClick={removerAvatar}><i className="bi bi-trash me-1" />Remover foto</button>}
              </div>
            </div>
            <label className="form-label fw-semibold">Nome de usuário</label>
            <div className="input-group input-group-lg mb-3"><span className="input-group-text"><i className="bi bi-person" /></span><input className="form-control" name="username" placeholder="Como quer ser chamado?" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></div>
            <label className="form-label fw-semibold">E-mail</label>
            <div className="input-group input-group-lg mb-3"><span className="input-group-text"><i className="bi bi-envelope" /></span><input type="email" className="form-control" placeholder="seu@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
            <label className="form-label fw-semibold">Senha</label>
            <div className="input-group input-group-lg mb-3"><span className="input-group-text"><i className="bi bi-lock" /></span><input type="password" className="form-control" placeholder="Crie uma senha segura" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /></div>
            {error && <div className="alert alert-danger py-2">{error}</div>}
            <button className="btn btn-primary btn-lg w-100" disabled={loading}>{loading ? "Criando conta..." : "Criar minha conta"}</button>
          </form>
          <p className="text-center text-muted small mt-4 mb-0">Já tem conta? <button className="rc-text-action" onClick={() => navigate("/login")}>Faça login</button></p>
        </section>
      </div>
    </main>
    {avatarToCrop && <AvatarCropper file={avatarToCrop} onConfirm={aplicarRecorte} onCancel={() => setAvatarToCrop(null)} />}
    <Footer />
  </div>;
}
