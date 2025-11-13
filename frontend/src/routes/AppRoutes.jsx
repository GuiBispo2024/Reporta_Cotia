import { BrowserRouter as Router,Routes,Route } from "react-router-dom";
import Login from "../pages/Login.jsx";
import Cadastro from "../pages/Cadastro.jsx";
import Home from "../pages/Home.jsx";
import Moderacao from "../pages/Moderacao.jsx";
import MinhasDenuncias from "../pages/MinhasDenuncias.jsx";
import NovaDenuncia from "../pages/NovaDenuncia.jsx";
import Perfil from "../pages/Perfil.jsx";

function AppRoutes() {
    return(
        <Router>
            <Routes>
                <Route path="/" element={<Home/>}/>
                <Route path="/login" element={<Login/>}/>
                <Route path="/cadastro" element={<Cadastro/>}/>
                <Route path="/moderacao" element={<Moderacao/>}/>
                <Route path="/minhas-denuncias" element={<MinhasDenuncias/>}/>
                <Route path="/nova-denuncia" element={<NovaDenuncia/>}/>
                <Route path="/perfil" element={<Perfil/>}/>
            </Routes>
        </Router>
    )
}

export default AppRoutes;