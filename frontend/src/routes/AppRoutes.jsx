import { BrowserRouter as Router,Routes,Route } from "react-router-dom";
import Login from "../pages/Login.jsx";
import Cadastro from "../pages/Cadastro.jsx";
import Home from "../pages/Home.jsx";
import Moderacao from "../pages/Moderacao.jsx";
import MinhasDenuncias from "../pages/MinhasDenuncias.jsx";
import EditarDenuncia from "../pages/EditarDenuncia.jsx";
import NovaDenuncia from "../pages/NovaDenuncia.jsx";
import Perfil from "../pages/Perfil.jsx";
import EditarPerfil from "../pages/EditarPerfil.jsx";
import DetalheDenuncia from "../pages/DetalheDenuncia.jsx";
import CurtidasDenuncia from "../pages/CurtidasDenuncia.jsx";
import CompartilhamentosDenuncia from "../pages/CompartilhamentosDenuncia.jsx";
import ListaDeUsuários from "../pages/ListaDeUsuários.jsx";
import PrivateRoute from "./PrivateRoute.jsx";
import PerfilPublico from '../pages/PerfilPublico.jsx';
import HistoricoDenuncia from '../pages/HistoricoDenuncia.jsx';
import EsqueciSenha from '../pages/EsqueciSenha.jsx';
import RedefinirSenha from '../pages/RedefinirSenha.jsx';

function AppRoutes() {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/esqueci-senha" element={<EsqueciSenha/>}/>
                <Route path="/redefinir-senha" element={<RedefinirSenha/>}/>
                <Route path="/denuncia/:id" element={<DetalheDenuncia/>}/>
                <Route path="/denuncia/:id/curtidas" element={<CurtidasDenuncia/>}/>
                <Route path="/denuncia/:id/compartilhamentos" element={<CompartilhamentosDenuncia/>}/>
                <Route path="/cadastro" element={<Cadastro/>}/>
                <Route path="/usuarios/:id" element={<PerfilPublico/>}/>
                <Route path="/moderacao" element={<PrivateRoute><Moderacao/></PrivateRoute>}/>
                <Route path="/moderacao/denuncia/:id/historico" element={<PrivateRoute><HistoricoDenuncia/></PrivateRoute>}/>
                <Route path="/minhas-denuncias" element={<PrivateRoute><MinhasDenuncias/></PrivateRoute>}/>
                <Route path="/editar-denuncia/:id" element={<PrivateRoute><EditarDenuncia/></PrivateRoute>}/>
                <Route path="/nova-denuncia" element={<PrivateRoute><NovaDenuncia/></PrivateRoute>}/>
                <Route path="/lista-de-usuarios" element={<PrivateRoute><ListaDeUsuários/></PrivateRoute>}/>
                <Route path="/perfil" element={<PrivateRoute><Perfil/></PrivateRoute>}/>
                <Route path="/editar-perfil" element={<PrivateRoute><EditarPerfil /></PrivateRoute>} />
            </Routes>
        </Router>
    )
}

export default AppRoutes;
