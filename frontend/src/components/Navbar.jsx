import { NavLink, Link } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/authContext";
import UserAvatar from './UserAvatar';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const linkClass = ({ isActive }) => `nav-link rc-nav-link${isActive ? " active" : ""}`;
  const sair = () => logout();

  return <nav className="navbar navbar-expand-lg navbar-dark rc-navbar sticky-top">
    <div className="container">
      <Link className="navbar-brand rc-brand" to="/">
        <span className="rc-brand-mark"><img src="/reporta-cotia-logo.svg" alt="" /></span>
        <span><strong>Reporta Cotia</strong><small>Cidadania em ação</small></span>
      </Link>

      <button className="navbar-toggler rc-navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent" aria-controls="navbarContent" aria-expanded="false" aria-label="Abrir menu"><span className="navbar-toggler-icon" /></button>

      <div className="collapse navbar-collapse" id="navbarContent">
        <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-1">
          <li className="nav-item"><NavLink className={linkClass} to="/" end><i className="bi bi-house-door" /> Início</NavLink></li>
          {!isAuthenticated ? <>
            <li className="nav-item"><NavLink className={linkClass} to="/login">Entrar</NavLink></li>
            <li className="nav-item ms-lg-1"><NavLink className="btn rc-nav-signup" to="/cadastro">Criar conta</NavLink></li>
          </> : <>
            <li className="nav-item"><NavLink className={linkClass} to="/minhas-denuncias"><i className="bi bi-clipboard-check" /> Minhas denúncias</NavLink></li>
            <li className="nav-item"><NavLink className={linkClass} to="/lista-de-usuarios"><i className="bi bi-people" /> Comunidade</NavLink></li>
            {user?.adm && <li className="nav-item"><NavLink className={({ isActive }) => `nav-link rc-nav-link rc-nav-admin${isActive ? " active" : ""}`} to="/moderacao"><i className="bi bi-shield-check" /> Moderação</NavLink></li>}
            <li className="nav-item ms-lg-1"><NavLink className="btn rc-nav-report" to="/nova-denuncia"><i className="bi bi-plus-lg" /> Nova denúncia</NavLink></li>
            <li className="nav-item dropdown ms-lg-2">
              <button className="btn rc-user-menu dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"><UserAvatar user={user} className="rc-nav-avatar" /><span className="rc-nav-user-text"><strong>{user?.username}</strong><small>{user?.adm ? "Administrador" : "Minha conta"}</small></span></button>
              <ul className="dropdown-menu dropdown-menu-end rc-user-dropdown">
                <li><NavLink className="dropdown-item" to="/perfil"><i className="bi bi-person-circle" /> Meu perfil</NavLink></li>
                <li><NavLink className="dropdown-item" to="/editar-perfil"><i className="bi bi-gear" /> Configurações</NavLink></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item text-danger" onClick={sair}><i className="bi bi-box-arrow-right" /> Sair da conta</button></li>
              </ul>
            </li>
          </>}
        </ul>
      </div>
    </div>
  </nav>;
}
