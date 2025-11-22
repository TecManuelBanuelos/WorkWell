import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

// --- TEMA EMPRESARIAL (Consistente con Login y Home) ---
const THEME = {
  bgMain: '#f1f5f9',      // Fondo general
  cardBg: '#ffffff',      // Fondo de la tarjeta
  textMain: '#0f172a',    // Slate 900
  textMuted: '#64748b',   // Slate 500
  border: '#e2e8f0',      // Bordes suaves
  primary: '#2563eb',     // Royal Blue (Usamos azul para acción principal, más corporativo que verde)
  primaryHover: '#1d4ed8'
};

interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<RegisterData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  // Estilos y lógica visual para inputs (Focus/Blur)
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 1. Validación simple
    if (formData.password !== formData.confirmPassword) {
      alert('Las contraseñas no coinciden.');
      return;
    }
    
    const dataToSend = {
      name: formData.name,
      email: formData.email,
      password: formData.password,
    };
    
    console.log('Intentando registrar usuario:', dataToSend);

    try {
      // URL placeholder
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registro exitoso. Ahora puedes iniciar sesión.');
        navigate('/login'); 
      } else {
        alert(data.message || 'Error en el registro. Inténtalo de nuevo.');
      }
    } catch (error) {
      console.error('Error de red:', error);
      alert('Hubo un problema al conectar con el servidor.');
    }
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
      margin: 0,
      overflowY: 'auto' // Permite scroll si la pantalla es muy bajita
    }}>
      
      <div style={{
        width: '100%',
        maxWidth: '450px', // Un poco más ancho que el login por tener más campos
        backgroundColor: THEME.cardBg,
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '40px',
        margin: '20px auto', // Auto margen vertical para pantallas pequeñas
        boxSizing: 'border-box'
      }}>
        
        {/* --- HEADER --- */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
             <div style={{ width: '28px', height: '28px', background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '6px' }}></div>
             <span style={{ fontSize: '20px', fontWeight: '700', color: THEME.textMain }}>Work Well</span>
          </div>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '600', color: THEME.textMain }}>Crear una cuenta</h2>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: THEME.textMuted }}>Comienza a organizar tus tareas hoy mismo.</p>
        </div>
      
        <form onSubmit={handleSubmit}>
          
          {/* Nombre */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="name" style={{ fontSize: '12px', fontWeight: '700', color: THEME.textMuted, marginLeft: '2px', textTransform: 'uppercase' }}>
              Nombre Completo
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Ej. Juan Pérez"
              value={formData.name}
              onChange={handleChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
              style={inputStyle}
            />
          </div>

          {/* Email */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email" style={{ fontSize: '12px', fontWeight: '700', color: THEME.textMuted, marginLeft: '2px', textTransform: 'uppercase' }}>
              Correo Electrónico
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

          {/* Contraseña */}
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="password" style={{ fontSize: '12px', fontWeight: '700', color: THEME.textMuted, marginLeft: '2px', textTransform: 'uppercase' }}>
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Mínimo 8 caracteres"
              value={formData.password}
              onChange={handleChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
              style={inputStyle}
            />
          </div>

          {/* Confirmar Contraseña */}
          <div style={{ marginBottom: '24px' }}>
            <label htmlFor="confirmPassword" style={{ fontSize: '12px', fontWeight: '700', color: THEME.textMuted, marginLeft: '2px', textTransform: 'uppercase' }}>
              Confirmar Contraseña
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="Repite tu contraseña"
              value={formData.confirmPassword}
              onChange={handleChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
              style={inputStyle}
            />
          </div>

          {/* Botón */}
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
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}
          >
            Registrarse
          </button>
        </form>

        {/* Footer Links */}
        <div style={{ marginTop: '25px', textAlign: 'center', borderTop: `1px solid ${THEME.border}`, paddingTop: '20px' }}>
          <p style={{ fontSize: '14px', color: THEME.textMuted, margin: 0 }}>
            ¿Ya tienes una cuenta?{' '}
            <Link 
              to="/login" 
              style={{ color: THEME.primary, textDecoration: 'none', fontWeight: '600' }}
              onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
              onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
            >
              Inicia Sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;