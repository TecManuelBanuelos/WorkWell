import { Routes, Route } from 'react-router-dom';

// Importa tus páginas
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
import Home from './pages/Home.tsx';
import ChatBot  from './pages/ChatBot.tsx';

// Importa el componente de Email
import EmailForm from './pages/EmailForm.tsx'; 

function App() {
  return (
    <div className="App">
      
      <Routes>
        {/* Ruta de inicio */}
        <Route path="/" element={<Home />} />
        
        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Chat */}
        <Route path="/chatbot" element={<ChatBot />} />

        {/* --- NUEVA RUTA: Formulario de Correo --- */}
        {/* Para ver esto, deberás ir manualmente a http://localhost:5173/solicitud */}
        <Route path="/solicitud" element={<EmailForm />} />
        
        {/* 404 */}
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </div>
  );
}

export default App;