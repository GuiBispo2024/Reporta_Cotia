import { useEffect, useState, useContext } from "react";
import userService from "../services/userService"; 
import { AuthContext } from "../context/authContext";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function ListaDeUsuários() {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        carregarUsuarios();
    }, []);

    const carregarUsuarios = async () => {
        try {
        const data = await userService.getAllWithDenunciaCount();
        setUsers(data);
        } catch (err) {
        console.error("Erro ao carregar usuários:", err);
        } finally {
        setLoading(false);
        }
    };

    const alterarAdm = async (id, admAtual) => {
        try {
            await userService.updateAdm(id, { adm: !admAtual });
            carregarUsuarios();
        } catch (err) {
            alert("Erro ao atualizar permissão.");
        }
    }

    if (loading) return <p>Carregando usuários...</p>;

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h2 className="mb-3">Lista de Usuários</h2>

        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Denúncias</th>
              <th>ADM</th>
              {user?.adm && <th>Ações</th>}
            </tr>
          </thead>

          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.username}</td>
                <td>{u.email}</td>
                <td>{u.totalDenuncias || 0}</td>
                <td>{u.adm ? "Sim" : "Não"}</td>

                {user?.adm && (
                  <td>
                    <button
                      className={`btn btn-${u.adm ? "danger" : "success"} btn-sm`}
                      onClick={() => alterarAdm(u.id, u.adm)}
                    >
                      {u.adm ? "Despromover" : "Promover"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Footer />
    </>
  );

}