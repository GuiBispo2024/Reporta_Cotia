import { AuthContext } from "../context/authContext";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import UserAvatar from '../components/UserAvatar';
import { getPrimaryRoleLabel, getPrimaryRole } from '../utils/accessControl';
import userService from '../services/userService';
import { friendlyError } from '../utils/errorMessage';

export default function Perfil() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [showDelete, setShowDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const sair = () => logout();
  const excluirConta = async event => {
    event.preventDefault();
    if (!window.confirm('Excluir sua conta permanentemente e remover os dados relacionados?')) return;
    try {
      setDeleting(true);
      setDeleteError('');
      await userService.delete(deletePassword);
      await logout();
    } catch (error) {
      setDeleteError(friendlyError(error, 'Não foi possível excluir sua conta.'));
      setDeleting(false);
    }
  };

  return <div className="rc-page">
    <Navbar />
    <main className="container py-4 flex-grow-1">
      <section className="rc-profile-view">
        <header className="rc-profile-cover">
          <span className="rc-eyebrow">MINHA CONTA</span>
          <div className="rc-profile-cover-content">
            <UserAvatar user={user} className="rc-profile-main-avatar" />
            <div><h1>{user?.username}</h1><p><i className="bi bi-geo-alt-fill me-1" />Cidadão de Cotia</p></div>
            <span className="rc-profile-role"><i className={`bi ${getPrimaryRole(user) === 'ADMIN' ? "bi-shield-check" : "bi-person-check"}`} />{getPrimaryRoleLabel(user)}</span>
          </div>
        </header>

        <div className="rc-profile-view-body">
          <div className="rc-profile-info">
            <div className="rc-profile-info-title"><div><h2>Informações pessoais</h2><p>Dados associados à sua conta no Reporta Cotia.</p></div><button className="btn btn-primary" onClick={() => navigate("/editar-perfil")}><i className="bi bi-pencil-square me-2" />Editar perfil</button></div>
            <div className="rc-profile-detail-grid">
              <div className="rc-profile-detail"><span className="rc-profile-detail-icon"><i className="bi bi-person" /></span><div><small>Nome de usuário</small><strong>{user?.username}</strong></div></div>
              <div className="rc-profile-detail"><span className="rc-profile-detail-icon"><i className="bi bi-envelope" /></span><div><small>E-mail</small><strong>{user?.email}</strong></div></div>
              <div className="rc-profile-detail"><span className="rc-profile-detail-icon"><i className="bi bi-patch-check" /></span><div><small>Perfil principal</small><strong>{getPrimaryRoleLabel(user)}</strong></div></div>
            </div>
            <section className="rc-danger-zone">
              <div><strong>Excluir conta</strong><p>Esta ação remove permanentemente sua conta e os dados relacionados.</p></div>
              {!showDelete ? <button className="btn btn-outline-danger btn-sm" onClick={() => setShowDelete(true)}>Excluir minha conta</button> : <form onSubmit={excluirConta}>
                <label className="form-label">Confirme sua senha atual</label>
                <input type="password" className="form-control" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} required />
                {deleteError && <small className="text-danger">{deleteError}</small>}
                <div><button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setShowDelete(false)}>Cancelar</button><button className="btn btn-danger btn-sm" disabled={deleting}>{deleting ? 'Excluindo...' : 'Excluir permanentemente'}</button></div>
              </form>}
            </section>
          </div>

          <aside className="rc-profile-shortcuts">
            <h3>Acesso rápido</h3>
            <button onClick={() => navigate("/minhas-denuncias")}><i className="bi bi-clipboard-check" /><span><strong>Minhas denúncias</strong><small>Acompanhar registros</small></span><i className="bi bi-chevron-right" /></button>
            <button onClick={() => navigate("/nova-denuncia")}><i className="bi bi-plus-circle" /><span><strong>Nova denúncia</strong><small>Reportar um problema</small></span><i className="bi bi-chevron-right" /></button>
            <button className="rc-profile-logout" onClick={sair}><i className="bi bi-box-arrow-right" /><span><strong>Sair da conta</strong><small>Encerrar esta sessão</small></span></button>
          </aside>
        </div>
      </section>
    </main>
    <Footer />
  </div>;
}
