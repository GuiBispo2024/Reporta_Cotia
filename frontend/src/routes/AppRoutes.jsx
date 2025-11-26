import { BrowserRouter as Router,Routes,Route } from "react-router-dom";
import Login from "../pages/Login.jsx";
import Cadastro from "../pages/Cadastro.jsx";
import Home from "../pages/Home.jsx";
import Moderacao from "../pages/Moderacao.jsx";
import MinhasDenuncias from "../pages/MinhasDenuncias.jsx";
import EditarDenuncia from "../pages/EditarDenuncia.jsx";
import NovaDenuncia from "../pages/NovaDenuncia.jsx";
import Perfil from "../pages/Perfil.jsx";
import ListaDeUsuários from "../pages/ListaDeUsuários.jsx";
import PrivateRoute from "./PrivateRoute.jsx";

function AppRoutes() {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/cadastro" element={<Cadastro/>}/>
                <Route path="/moderacao" element={<PrivateRoute><Moderacao/></PrivateRoute>}/>
                <Route path="/minhas-denuncias" element={<PrivateRoute><MinhasDenuncias/></PrivateRoute>}/>
                <Route path="/editar-denuncia/:id" element={<PrivateRoute><EditarDenuncia/></PrivateRoute>}/>
                <Route path="/nova-denuncia" element={<PrivateRoute><NovaDenuncia/></PrivateRoute>}/>
                <Route path="/lista-de-usuarios" element={<PrivateRoute><ListaDeUsuários/></PrivateRoute>}/>
                <Route path="/perfil" element={<PrivateRoute><Perfil/></PrivateRoute>}/>
            </Routes>
        </Router>
    )
}

export default AppRoutes;