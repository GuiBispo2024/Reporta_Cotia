import {AuthContext} from "../context/authContext";
import {useContext} from "react";
import Navbar from "../components/Navbar";

export default function Perfil() {
    const {user, logout} = useContext(AuthContext);

    return (
    <>
      <Navbar />

      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">

            <div className="card shadow-sm border-0">
              <div className="card-body">

                <h3 className="text-center text-primary mb-4">Meu Perfil</h3>

                {/* Nome */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Usuário</label>
                  <input
                    type="text"
                    className="form-control"
                    value={user.username}
                    disabled
                  />
                </div>

                {/* Email */}
                <div className="mb-3">
                  <label className="form-label fw-bold">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={user.email}
                    disabled
                  />
                </div>

                {/* Status: Admin ou Usuário comum */}
                <div className="mb-4">
                  <label className="form-label fw-bold">Tipo de Conta</label>
                  <input
                    type="text"
                    className="form-control"
                    value={user.adm ? "Usuário administrador" : "Usuário comum"}
                    disabled
                  />
                </div>

                {/* Botão de Logout */}
                <div className="d-grid">
                  <button className="btn btn-danger" onClick={logout}>
                    Sair da conta
                  </button>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}