import React from "react";
import { useState } from "react";
import { useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import './LoginUser.css'

const LoginUser = ()=>{
    const [username,setUsername] = useState('')
    const [password,setPassword] = useState('')
    const [error,setError] = useState('')
    const navigate = useNavigate()

    useEffect(()=>{
        if(error){
            const timer = setTimeout(()=>{
                setError("")
            },3000)
            return ()=> clearTimeout(timer)
        }
    },[error])

    const handleLogin = async(e)=>{
        e.preventDefault('')
        setError('')

        try{
            const res = await axios.get('http://localhost:8081/user')
            const users = res.data

            const found= users.find(
                (user)=> user.username === username && user.password === password
            )

            if(found){
                localStorage.setItem("usuarioLogado", found.username)
                navigate('/feed')
            }else{
                setError('Usuário ou senha inválidos')
            }
        }catch(err){
            setError('Erro ao conectar com o servidor')
            console.error(err)
        }
    }

    return(
        <>
            {error && (<div className="top-feedback alert alert-danger text-center">{error}</div>)}

            <div className="login-container d-flex justify-content-center align-items-center vh-100">
                <div className="login-box">
                    <div className="login-header bg-primary text-white text-center py-2">
                        <h2>Login</h2>
                    </div>
                    <div className="login-body p-4">
                        <form onSubmit={handleLogin}>                   
                            <div className="mb-3">
                                <label className="form-label">Usuario</label>
                                <input type="username" className="form-control" placeholder="Digite aqui seu nome de usuário"
                                value={username} onChange={(e)=>setUsername(e.target.value)} required></input>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Senha</label>
                                <input type="password" className="form-control" placeholder="Digite aqui sua senha"
                                value={password} onChange={(e)=>setPassword(e.target.value)} required></input>
                            </div>

                            <div className="mb-3 d-flex justify-content-center login-footer-text">
                                <span>Não possui um login?</span>
                                <Link to="/cadastro">Cadastre-se aqui</Link>
                            </div>

                            <div className="d-flex justify-content-between">
                                <button type="button" className="btn btn-danger">Cancelar</button>
                                <button type="submit" className="btn btn-primary">Entrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>        
        </>        
    )
}

export default LoginUser