import { NavLink, Link } from "react-router-dom";
import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../context/authContext";
import UserAvatar from './UserAvatar';
import { getPrimaryRoleLabel, hasPermission, PERMISSIONS } from '../utils/accessControl';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useContext(AuthContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);
  const toggleRef = useRef(null);
  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = event => {
      if (!navRef.current?.contains(event.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [menuOpen]);
  const linkClass = ({ isActive }) => `nav-link rc-nav-link${isActive ? " active" : ""}`;
  const sair = () => logout();
  const canViewModeration = hasPermission(user, PERMISSIONS.MODERATION_VIEW);
  const boardPath = hasPermission(user, PERMISSIONS.DASHBOARD_FULL_VIEW)
    ? '/boards/analitico'
    : hasPermission(user, PERMISSIONS.DASHBOARD_PUBLIC_VIEW) ? '/boards/comunidade' : '/meu-board';

  return <><nav ref={navRef} aria-label="Navegação principal" className={`navbar navbar-expand-xl navbar-dark rc-navbar sticky-top${isAuthenticated ? ' rc-navbar-authenticated' : ''}`}>
    <div className="container">
      <Link className="navbar-brand rc-brand" to="/">
        <span className="rc-brand-mark"><img src="/reporta-cotia-logo.svg" alt="" /></span>
        <span><strong>Reporta Cotia</strong><small>Cidadania em ação</small></span>
      </Link>

      <button ref={toggleRef} className="navbar-toggler rc-navbar-toggler" type="button" onClick={() => setMenuOpen(open => !open)} aria-controls="navbarContent" aria-expanded={menuOpen} aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}><span className="navbar-toggler-icon" /><span className="rc-menu-label">{menuOpen ? 'Fechar' : isAuthenticated ? 'Mais' : 'Menu'}</span></button>

      <div className={`collapse navbar-collapse${menuOpen ? ' show' : ''}`} id="navbarContent" onClick={event => { if (event.target.closest('a')) setMenuOpen(false); }} onKeyDown={event => { if (event.key === 'Escape') { setMenuOpen(false); toggleRef.current?.focus(); } }}>
        <ul className="navbar-nav ms-auto align-items-lg-center gap-lg-1">
          <li className={`nav-item${isAuthenticated ? ' rc-nav-primary' : ''}`}><NavLink className={linkClass} to="/" end><i aria-hidden="true" className="bi bi-house-door" /> Início</NavLink></li>
          {!isAuthenticated ? <>
            <li className="nav-item"><NavLink className={linkClass} to="/login">Entrar</NavLink></li>
            <li className="nav-item ms-lg-1"><NavLink className="btn rc-nav-signup" to="/cadastro">Criar conta</NavLink></li>
          </> : <>
            <li className="nav-item rc-nav-primary"><NavLink className={linkClass} to="/minhas-denuncias"><i aria-hidden="true" className="bi bi-clipboard-check" /> Minhas denúncias</NavLink></li>
            <li className="nav-item"><NavLink className={linkClass} to={boardPath}><i aria-hidden="true" className="bi bi-bar-chart" /> Indicadores</NavLink></li>
            <li className="nav-item"><NavLink className={linkClass} to="/lista-de-usuarios"><i aria-hidden="true" className="bi bi-people" /> Comunidade</NavLink></li>
            {canViewModeration && <li className="nav-item"><NavLink className={({ isActive }) => `nav-link rc-nav-link rc-nav-admin${isActive ? " active" : ""}`} to="/moderacao"><i aria-hidden="true" className="bi bi-shield-check" /> Moderação</NavLink></li>}
            <li className="nav-item ms-lg-1 rc-nav-primary"><NavLink className="btn rc-nav-report" to="/nova-denuncia"><i aria-hidden="true" className="bi bi-plus-lg" /> Nova denúncia</NavLink></li>
            <li className="nav-item dropdown ms-lg-2 rc-nav-primary">
              <button className="btn rc-user-menu dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false"><UserAvatar user={user} className="rc-nav-avatar" /><span className="rc-nav-user-text"><strong>{user?.username}</strong><small>{getPrimaryRoleLabel(user)}</small></span></button>
              <ul className="dropdown-menu dropdown-menu-end rc-user-dropdown">
                <li><NavLink className="dropdown-item" to="/perfil"><i aria-hidden="true" className="bi bi-person-circle" /> Meu perfil</NavLink></li>
                <li><NavLink className="dropdown-item" to={`/usuarios/${user?.id}`}><i aria-hidden="true" className="bi bi-eye" /> Perfil público</NavLink></li>
                <li><NavLink className="dropdown-item" to="/editar-perfil"><i aria-hidden="true" className="bi bi-gear" /> Configurações</NavLink></li>
                <li><hr className="dropdown-divider" /></li>
                <li><button className="dropdown-item text-danger" onClick={sair}><i aria-hidden="true" className="bi bi-box-arrow-right" /> Sair da conta</button></li>
              </ul>
            </li>
            <li className="nav-item rc-mobile-menu-account"><NavLink className={linkClass} to="/editar-perfil"><i aria-hidden="true" className="bi bi-gear" /> Configurações</NavLink></li>
            <li className="nav-item rc-mobile-menu-account"><button className="nav-link rc-nav-link w-100 text-start" onClick={() => { setMenuOpen(false); sair(); }}><i aria-hidden="true" className="bi bi-box-arrow-right" /> Sair da conta</button></li>
          </>}
        </ul>
      </div>
    </div>
  </nav>
    {isAuthenticated && <nav className="rc-mobile-nav" aria-label="Atalhos no celular" onClick={() => setMenuOpen(false)}>
      <NavLink to="/" end><i aria-hidden="true" className="bi bi-house-door" /><span>Início</span></NavLink>
      <NavLink to="/nova-denuncia"><i aria-hidden="true" className="bi bi-plus-circle" /><span>Denunciar</span></NavLink>
      <NavLink to="/minhas-denuncias"><i aria-hidden="true" className="bi bi-clipboard-check" /><span>Minhas denúncias</span></NavLink>
      <NavLink to="/perfil"><i aria-hidden="true" className="bi bi-person-circle" /><span>Perfil</span></NavLink>
    </nav>}
  </>;
}
