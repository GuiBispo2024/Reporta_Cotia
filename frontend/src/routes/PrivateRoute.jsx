import { Link, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../context/authContext";
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { hasPermission } from '../utils/accessControl';

const PrivateRoute = ({ children, permission }) => {
  const { isAuthenticated, user } = useContext(AuthContext);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (permission && !hasPermission(user, permission)) {
    return <div className="rc-page">
      <Navbar />
      <main className="container py-5 flex-grow-1">
        <section className="rc-access-denied" role="alert">
          <span><i className="bi bi-shield-lock" /></span>
          <h1>Acesso não disponível</h1>
          <p>Sua conta não possui o perfil necessário para acessar esta área.</p>
          <Link className="btn btn-primary" to="/">Voltar ao início</Link>
        </section>
      </main>
      <Footer />
    </div>;
  }
  return children;
};

export default PrivateRoute;
