import React from "react";
import { useState } from "react";
import { useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import './AddUser.css'

const AddUser = () =>{
    const [username,setUsername] = useState('')
    const [email,setEmail] = useState('')
    const [password,setPassword] = useState('')
    const [success,setSuccess] = useState('')
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
    
    useEffect(() => {
            if (success) {
                const timer = setTimeout(() => setSuccess(""), 3000);
                return () => clearTimeout(timer);
            }
        }, [success]);

    const handleAdd = async(e)=>{
        e.preventDefault()
        setError('')
        setSuccess('')

        try{
            const newUser = {
                username:username.trim(),
                email:email.trim(),
                password:password.trim(),
                denuncias:[]
            }

            await axios.post("http://localhost:8081/user", newUser)
            setSuccess('Cadastro realizado com sucesso!')

            setTimeout(()=>{
                navigate('/login')
            },3000)

        }catch(err){
            console.error(err)

            if(err.response && err.response.data && err.response.data.error){
                setError(err.response.data.error)
            }else{
                setError("Erro ao se conectar com o servidor")
            }
        }
    }

    return(
        <>
            {error && (<div className="top-feedback alert alert-danger text-center">{error}</div>)}
            {success && (<div className="top-feedback alert alert-success text-center">{success}</div>)}

            <div className="login-container d-flex justify-content-center align-items-center vh-100">
                <div className="login-box">
                    <div className="login-header">
                        <h2>Cadastro</h2>
                    </div>
                    <div className="login-body p-3">
                        <form onSubmit={handleAdd}>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-control" placeholder="Digite aqui seu email" value={email}
                                onChange={(e)=>setEmail(e.target.value)} required/>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Usuário</label>
                                <input type="text" className="form-control" placeholder="Digite aqui seu nome de usuário" value={username}
                                onChange={(e)=>setUsername(e.target.value)} required/>
                            </div>

                            <div className="mb-3">
                                <label className="form-label">Senha</label>
                                <input type="password" className="form-control" placeholder="Digite aqui sua senha" value={password}
                                onChange={(e)=>setPassword(e.target.value)} required/>
                            </div>

                            <div className="d-flex justify-content-between">
                                <button type="button" className="btn btn-danger">Cancelar</button>
                                <button type="submit" className="btn btn-primary">Cadastrar</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    )
}

export default AddUser

