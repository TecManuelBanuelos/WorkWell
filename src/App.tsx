import { Routes, Route } from 'react-router-dom';

// Importa tus componentes de login y registro
// Asegúrate de que las rutas de importación sean correctas,
// por ejemplo, si están en una carpeta 'pages':
import Login from './pages/Login.tsx';
import Register from './pages/Register.tsx';
// Si tu componente principal actual es solo el que tienes, llámalo Home o Dashboard
import Home from './pages/Home.tsx'; // O el componente principal de tu app
import ChatBot  from './pages/ChatBot.tsx';

function App() {
  return (
    <div className="App">
      {/* Opcional: Si tienes una barra de navegación (Navbar), ponla aquí
      */}
      
      {/* Las <Routes> definen dónde se renderizan tus componentes */}
      <Routes>
        {/* Ruta de inicio (o dashboard, si ya estás logeado) */}
        <Route path="/" element={<Home />} />
        
        {/* Ruta para el login */}
        <Route path="/login" element={<Login />} />
        
        {/* Ruta para el registro */}
        <Route path="/register" element={<Register />} />

        <Route path="/chatbot" element={<ChatBot />} />
        
        {/* Ruta para manejar URLs no encontradas (404) */}
        <Route path="*" element={<h1>404 - Página no encontrada</h1>} />
      </Routes>
    </div>
  );
}

export default App;