import { AuthProvider } from "./context/authContext";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>    
  );
}

export default App;