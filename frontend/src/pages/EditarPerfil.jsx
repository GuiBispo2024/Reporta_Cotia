import { useState, useContext } from "react";
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useNavigate } from "react-router-dom";
import userService from "../services/userService";
import UserAvatar from '../components/UserAvatar';
import { friendlyError } from '../utils/errorMessage';

export default function EditarPerfil() {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: user?.username || "", email: user?.email || "", senhaAtual: "", novaSenha: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || "");

  const escolherAvatar = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Selecione um arquivo de imagem.');
    if (file.size > 5 * 1024 * 1024) return setError('A foto deve ter no máximo 5 MB.');
    setError('');
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const removerAvatar = async () => {
    if (avatar) {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      setAvatar(null);
      setAvatarPreview(user?.avatarUrl || '');
      return;
    }
    if (!user?.avatarUrl) return;
    try {
      setLoading(true);
      setError('');
      const result = await userService.removeAvatar();
      setUser(result.user);
      setAvatarPreview('');
    } catch (err) {
      setError(friendlyError(err, 'Não foi possível remover a foto de perfil. Tente novamente.'));
    } finally { setLoading(false); }
  };

  const submit = async e => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const profileResult = await userService.update(form);
      let updatedUser = profileResult.user;
      if (avatar) {
        const avatarResult = await userService.updateAvatar(avatar);
        updatedUser = avatarResult.user;
      }
      setUser(updatedUser);
      navigate("/perfil");
    } catch (err) {
      setError(friendlyError(err, "Não foi possível atualizar seu perfil. Seus dados foram mantidos; revise os campos e tente novamente."));
    } finally { setLoading(false); }
  };

  return <div className="rc-page">
    <Navbar />
    <main className="container py-4 flex-grow-1">
      <div className="rc-profile-layout">
        <aside className="rc-profile-summary">
          {avatarPreview ? <img className="rc-profile-avatar rc-avatar-image" src={avatarPreview} alt="Prévia da foto do perfil" onError={() => setAvatarPreview('')} /> : <UserAvatar user={user} className="rc-profile-avatar" />}
          <h2>{user?.username}</h2>
          <p>{user?.email}</p>
          <span className="badge bg-light text-dark">{user?.adm ? "Administrador" : "Cidadão"}</span>
          <button className="btn btn-outline-light mt-4" onClick={() => navigate("/perfil")}><i className="bi bi-arrow-left me-2" />Voltar ao perfil</button>
          <label className="btn btn-light btn-sm mt-3 rc-avatar-upload"><i className="bi bi-camera me-2" />Alterar foto<input type="file" accept="image/*" onChange={escolherAvatar} /></label>
          {avatarPreview && <button type="button" className="btn btn-outline-light btn-sm mt-2" disabled={loading} onClick={removerAvatar}><i className="bi bi-trash me-2" />Remover foto</button>}
        </aside>
        <section className="rc-profile-form">
          <span className="rc-eyebrow">MINHA CONTA</span><h1>Editar perfil</h1><p className="text-muted mb-4">Atualize seus dados pessoais ou altere sua senha.</p>
          {error && <div className="alert alert-danger">{error}</div>}
          <form onSubmit={submit}>
            <div className="row g-3">
              <div className="col-md-6"><label className="form-label fw-semibold">Nome de usuário</label><input className="form-control form-control-lg" name="username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required /></div>
              <div className="col-md-6"><label className="form-label fw-semibold">E-mail</label><input type="email" className="form-control form-control-lg" name="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required /></div>
            </div>
            <div className="rc-password-section"><h5><i className="bi bi-shield-lock me-2" />Alterar senha <small>(opcional)</small></h5><p>Preencha os dois campos somente se quiser trocar sua senha.</p>
              <div className="row g-3"><div className="col-md-6"><label className="form-label fw-semibold">Senha atual</label><input type="password" className="form-control" value={form.senhaAtual} onChange={e => setForm({ ...form, senhaAtual: e.target.value })} /></div><div className="col-md-6"><label className="form-label fw-semibold">Nova senha</label><input type="password" className="form-control" value={form.novaSenha} onChange={e => setForm({ ...form, novaSenha: e.target.value })} /></div></div>
            </div>
            <div className="d-flex justify-content-end gap-2 mt-4"><button type="button" className="btn btn-outline-secondary" onClick={() => navigate("/perfil")}>Cancelar</button><button className="btn btn-primary px-4" disabled={loading}>{loading ? "Salvando..." : "Salvar alterações"}</button></div>
          </form>
        </section>
      </div>
    </main>
    <Footer />
  </div>;
}
