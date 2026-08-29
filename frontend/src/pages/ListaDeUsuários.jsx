import { useCallback, useEffect, useState, useContext } from "react";
import userService from "../services/userService";
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { friendlyError } from '../utils/errorMessage';

export default function ListaDeUsuários() {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await userService.getAllWithDenunciaCount();
      setUsers(data);
    } catch (err) {
      setError(friendlyError(err, "Não foi possível carregar a comunidade. Atualize a página para tentar novamente."));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const alterarAdm = async (id, admAtual) => {
    const acao = admAtual ? "remover a permissão de administrador" : "tornar este usuário administrador";
    if (!window.confirm(`Deseja ${acao}?`)) return;
    try {
      await userService.updateAdm(id, { adm: !admAtual });
      await carregar();
    } catch (err) {
      alert(friendlyError(err, "Não foi possível alterar a permissão deste usuário. Nenhuma mudança foi realizada."));
    }
  };

  return <div className="rc-page">
    <Navbar />
    <main className="container py-4 flex-grow-1">
      <header className="rc-section-header">
        <div><span className="rc-eyebrow">COMUNIDADE</span><h1>Usuários do Reporta Cotia</h1><p>Conheça quem participa e quantas denúncias aprovadas cada pessoa publicou.</p></div>
        <div className="rc-users-total"><strong>{users.length}</strong><span>participantes</span></div>
      </header>
      {error && <div className="alert alert-danger">{error}</div>}
      {loading ? <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-3">Carregando participantes...</p></div> :
      !users.length ? <div className="rc-empty">Nenhum usuário encontrado.</div> :
      <div className="rc-users-card">
        <div className="table-responsive">
          <table className="table rc-users-table align-middle mb-0">
            <thead><tr><th>Participante</th>{user?.adm && <th>E-mail</th>}<th>Contribuições</th><th>Perfil</th>{user?.adm && <th className="text-end">Ações</th>}</tr></thead>
            <tbody>{users.map(u => <tr key={u.id}>
              <td><div className="rc-user-cell"><div className="rc-user-avatar">{u.username?.charAt(0).toUpperCase()}</div><strong>{u.username}</strong>{Number(u.id) === Number(user?.id) && <span className="rc-you-badge">Você</span>}</div></td>
              {user?.adm && <td className="text-muted">{u.email}</td>}
              <td><span className="rc-contribution"><i className="bi bi-megaphone" /> {u.totalDenuncias || 0}</span></td>
              <td><span className={`badge ${u.adm ? "bg-primary" : "bg-light text-dark"}`}>{u.adm ? "Administrador" : "Cidadão"}</span></td>
              {user?.adm && <td className="text-end">{Number(u.id) === Number(user.id) ? <span className="rc-self-protected" title="Você não pode alterar sua própria permissão"><i className="bi bi-lock" /> Conta protegida</span> : <button className={`btn btn-sm ${u.adm ? "btn-outline-danger" : "btn-outline-primary"}`} onClick={() => alterarAdm(u.id, u.adm)}><i className={`bi ${u.adm ? "bi-person-dash" : "bi-person-check"} me-1`} />{u.adm ? "Despromover" : "Promover"}</button>}</td>}
            </tr>)}</tbody>
          </table>
        </div>
      </div>}
    </main>
    <Footer />
  </div>;
}
