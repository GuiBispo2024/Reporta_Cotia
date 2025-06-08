import { BrowserRouter, Route, Routes } from 'react-router-dom';
import './App.css';
import LoginUser from './components/User/LoginUser';
import AddUser from './components/User/AddUser';
import Feed from './components/User/Feed';
import NewDenuncia from './components/User/NewDenuncia';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <BrowserRouter>
          <Routes>
            <Route path='/login' element={<LoginUser/>}></Route>
            <Route path='/cadastro' element={<AddUser/>}></Route>
            <Route path='/feed' element={<Feed/>}></Route>
            <Route path='/newDenuncia' element={<NewDenuncia/>}></Route>
          </Routes>
        </BrowserRouter>     
      </header>
    </div>
  );
}

export default App;
