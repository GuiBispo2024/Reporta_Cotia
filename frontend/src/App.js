import { AuthProvider } from "./context/authContext";
import AppRoutes from "./routes/AppRoutes";
import AccessibilityMenu from './components/AccessibilityMenu';
import SessionTimer from './components/SessionTimer';

function App() {
  return (
    <AuthProvider>
      <SessionTimer />
      <a className="rc-skip-link" href="#main-content">Pular para o conteúdo</a>
      <AppRoutes />
      <AccessibilityMenu />
    </AuthProvider>    
  );
}

export default App;
