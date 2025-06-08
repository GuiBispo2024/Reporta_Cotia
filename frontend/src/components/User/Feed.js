import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import './Feed.css'

const Feed = ()=> {
    const [user,setUsers] = useState([])
    const [erro,setErro] = useState('')
    const navigate = useNavigate()

    const nomeUsuario = localStorage.getItem("usuarioLogado") || "Usuário desconhecido"

    useEffect(()=>{
        axios.get("http://localhost:8081/user").then(res=>setUsers(res.data)).catch(err=>setErro
        ("Erro ao carregar as denúncias"))
    },[])

    const handleLogout = () => {
        localStorage.removeItem("usuarioLogado");
        navigate('/login');
    };

    return(
        <div className="feed-container py-4">
            <div className="card mb-4 user-card">
                <div className="card-body text-center text-white">
                    <h5 className="card-title">Usuário Logado: {nomeUsuario}</h5>
                    <div className="d-flex justify-content-between">
                        <button className="btn btn-info" onClick={() => navigate('/newDenuncia')}>
                        Nova Denúncia
                        </button>
                        <button onClick={handleLogout} className="btn btn-danger">Sair</button>
                    </div>  
                </div>
            </div>

            <h2 className="text-center mb-4">Feed de Denúncias</h2>

            {erro && <div className="alert alert-danger">{erro}</div>}

            {user.length === 0 ? (
                <p className="text-center">Nenhuma denúncia registrada.</p>
            ) : (
                user.map((usuario) => (
                    <div key={usuario._id}>
                        {usuario.denuncias.map((denuncia, index) => (
                            <div className="card mb-3" key={denuncia._id || index}>
                                <div className="card-body">
                                    <h5 className="card-title">{denuncia.titulo}</h5>
                                    <p className="card-text">{denuncia.descricao}</p>
                                    <p className="card-text">
                                        <small className="card-text small">Denunciado por: {usuario.username}</small>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    )
}

export default Feed