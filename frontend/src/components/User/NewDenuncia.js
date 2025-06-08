import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useEffect } from "react"
import './NewDenuncia.css'
import axios from "axios"

const NewDenuncia=()=>{
    const [titulo,setTitulo] = useState('')
    const [descricao,setDescricao] = useState('')
    const [error,setError] = useState('')
    const navigate = useNavigate()

    const username = localStorage.getItem("usuarioLogado")

    useEffect(()=>{
        if(error){
            const timer = setTimeout(()=>{
                setError("")
            },3000)
            return ()=> clearTimeout(timer)
        }
    },[error])
            
    const handleSubmit = async(e) => {
        e.preventDefault()
        setError('')

        try{
            await axios.post('http://localhost:8081/user/denuncia',{
                username,
                titulo,
                descricao
            })
            navigate('/feed')
        }catch(err){
            setError('Erro ao registrar denúncia')
            console.error(err)
        }
    }

    return(
        <>
            {error && (<div className="top-feedback alert alert-danger text-center">{error}</div>)}
           
            <div className="nova-denuncia-container">
                <h2 className="nova-denuncia-titulo">Nova Denúncia</h2>
                <form onSubmit={handleSubmit} className="nova-denuncia-form">
                    <div className="form-group">
                        <label>Título:</label>
                        <input
                            type="text"
                            placeholder="Ex.: Água parada, Buracos na rua, etc."
                            className="form-control-input"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Relato:</label>
                        <textarea
                            placeholder="Digite aqui o local do relato"
                            className="form-control-textarea"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            required
                        ></textarea>
                    </div>

                    <div className="form-group">
                        <button type="button" className="btn-anexar">📎 Anexar imagem</button>
                    </div>

                    <div className="form-group buttons-row">
                        <button type="button" className="btn-cancelar" onClick={() => navigate('/feed')}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn-publicar">Publicar</button>
                    </div>
                </form>
            </div>
        </>    
    )
}
export default NewDenuncia