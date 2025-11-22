import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

const THEME = {
  bgMain: '#f8fafc',
  cardBg: '#ffffff',
  textMain: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  errorBg: '#fee2e2',
  errorText: '#991b1b',
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/');
    } catch (error: any) {
      setErrorMsg('Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`body { margin: 0; padding: 0; box-sizing: border-box; }`}</style>

      <div style={{ height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bgMain, fontFamily: '"Inter", sans-serif', overflow: 'hidden' }}>
        
        <div style={{ width: '100%', maxWidth: '420px', backgroundColor: THEME.cardBg, padding: '48px 40px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', margin: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' }}></div>
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: THEME.textMain, margin: '0' }}>Bienvenido</h2>
            <p style={{ color: THEME.textMuted, marginTop: '8px', fontSize: '15px' }}>Ingresa a tu espacio de trabajo</p>
          </div>
          
          {errorMsg && (
            <div style={{ backgroundColor: THEME.errorBg, color: THEME.errorText, padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', display:'flex', alignItems:'center', gap:'10px' }}>
              <span>⚠️</span> {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" required placeholder="nombre@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{...labelStyle, marginBottom: 0}}>Contraseña</label>
                  <a href="#" style={{ fontSize: '13px', color: THEME.primary, textDecoration: 'none', fontWeight: '500' }}>¿Olvidaste tu contraseña?</a>
              </div>
              <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}
              onMouseOver={(e) => { if(!loading) e.currentTarget.style.backgroundColor = THEME.primaryHover }}
              onMouseOut={(e) => { if(!loading) e.currentTarget.style.backgroundColor = THEME.primary }}
            >
              {loading ? 'Entrando...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p style={{ marginTop: '32px', textAlign: 'center', fontSize: '15px', color: THEME.textMuted }}>
            ¿Nuevo aquí? <Link to="/register" style={{ color: THEME.primary, textDecoration: 'none', fontWeight: '600' }}>Crear cuenta</Link>
          </p>

        </div>
      </div>
    </>
  );
};

// ESTILOS CON TEXTO NEGRO
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.textMain };
const inputStyle: React.CSSProperties = { 
    width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${THEME.border}`, outline: 'none', fontSize: '15px', boxSizing: 'border-box', transition: '0.2s', backgroundColor: '#f8fafc',
    color: '#000000', // <--- TEXTO NEGRO PURO
    fontWeight: '500' // <--- UN POCO MAS GRUESO
};
const buttonStyle: React.CSSProperties = { backgroundColor: THEME.primary, color: 'white', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '16px', marginTop: '10px', transition: '0.2s', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' };
const focusStyle = (e: any) => { e.target.style.borderColor = THEME.primary; e.target.style.backgroundColor = '#fff'; };
const blurStyle = (e: any) => { e.target.style.borderColor = THEME.border; e.target.style.backgroundColor = '#f8fafc'; };

export default Login;