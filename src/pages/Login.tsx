import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// --- TEMA EMPRESARIAL (Mismo que en Home) ---
const THEME = {
  bgMain: '#f1f5f9',      // Fondo general
  cardBg: '#ffffff',      // Fondo de la tarjeta
  textMain: '#0f172a',    // Slate 900 (Títulos)
  textMuted: '#64748b',   // Slate 500 (Subtítulos/Labels)
  border: '#e2e8f0',      // Bordes suaves
  primary: '#2563eb',     // Royal Blue
  primaryHover: '#1d4ed8' // Azul más oscuro para hover
};

interface LoginData {
  email: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<LoginData>({
    email: '',
    password: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('Intentando iniciar sesión con:', formData);

    // === LOGIN DE ADMIN LOCAL ===
    if (formData.email === 'admin@admin.com' && formData.password === '123') {
      console.log('Admin authenticated locally');
      navigate('/'); 
      return; 
    }

    try {
      // === LOGIN NORMAL (API) ===
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('role', 'user');
        navigate('/');
      } else {
        alert(data.message || 'Error en el inicio de sesión.');
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert('Hubo un problema al conectar con el servidor.');
    }
  };

  // Estilos auxiliares para Inputs (simulación de focus)
  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${THEME.border}`,
    fontSize: '14px',
    outline: 'none',
    color: THEME.textMain,
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
    marginTop: '6px',
    boxSizing: 'border-box' as const
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = THEME.primary;
    e.target.style.backgroundColor = '#fff';
    e.target.style.boxShadow = `0 0 0 3px rgba(37, 99, 235, 0.1)`;
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = THEME.border;
    e.target.style.backgroundColor = '#f8fafc';
    e.target.style.boxShadow = 'none';
  };

  return (
    <div style={{ 
      height: '100vh', 
      width: '100vw', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: THEME.bgMain,
      fontFamily: '"Inter", "Segoe UI", sans-serif',
      margin: 0
    }}>
      
      {/* --- CARD DE LOGIN --- */}
      <div style={{
        width: '100%',
        maxWidth: '420px', // Ancho típico de formulario login
        backgroundColor: THEME.cardBg,
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '40px',
        margin: '20px',
        boxSizing: 'border-box'
      }}>
        
        {/* --- HEADER / LOGO --- */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ 
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '15px' 
          }}>
             <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '8px' }}></div>
             <span style={{ fontSize: '24px', fontWeight: '700', color: THEME.textMain }}>Work Well</span>
          </div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: THEME.textMain }}>Bienvenido de nuevo</h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: THEME.textMuted }}>Ingresa tus credenciales para acceder a tu cuenta.</p>
        </div>

        {/* --- FORMULARIO --- */}
        <form onSubmit={handleSubmit}>
          
          {/* Campo Email */}
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="email" style={{ fontSize: '13px', fontWeight: '600', color: THEME.textMuted, marginLeft: '2px' }}>
              CORREO ELECTRÓNICO
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="nombre@empresa.com"
              value={formData.email}
              onChange={handleChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
              style={inputStyle}
            />
          </div>

          {/* Campo Password */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="password" style={{ fontSize: '13px', fontWeight: '600', color: THEME.textMuted, marginLeft: '2px' }}>
                CONTRASEÑA
              </label>
              <a href="#" style={{ fontSize: '12px', color: THEME.primary, textDecoration: 'none', fontWeight: '500' }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
              style={inputStyle}
            />
          </div>

          {/* Botón Submit */}
          <button 
            type="submit"
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = THEME.primaryHover}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = THEME.primary}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: THEME.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            Iniciar Sesión
          </button>
        </form>

        {/* --- FOOTER --- */}
        <div style={{ marginTop: '25px', textAlign: 'center', borderTop: `1px solid ${THEME.border}`, paddingTop: '20px' }}>
          <p style={{ fontSize: '14px', color: THEME.textMuted, margin: 0 }}>
            ¿Aún no tienes una cuenta?{' '}
            <Link 
              to="/register" 
              style={{ color: THEME.primary, textDecoration: 'none', fontWeight: '600' }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Regístrate aquí
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;