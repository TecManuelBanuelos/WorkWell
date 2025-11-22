import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

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
  successBg: '#dcfce7',
  successText: '#166534',
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [providerType, setProviderType] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: displayName, phone_number: phone, provider_type: providerType } }
      });
      if (error) throw error;
      if (data.user?.email) {
          await supabase.from('employees').update({ name: displayName }).eq('email', email);
      }
      setMsg('¡Cuenta creada! Redirigiendo...');
      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      setMsg('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`body { margin: 0; padding: 0; box-sizing: border-box; }`}</style>

      <div style={{ minHeight: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: THEME.bgMain, fontFamily: '"Inter", sans-serif', padding: '20px 0' }}>
        
        <div style={{ width: '100%', maxWidth: '480px', backgroundColor: THEME.cardBg, padding: '48px 40px', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', margin: '20px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)' }}></div>
            <h2 style={{ fontSize: '28px', fontWeight: '800', color: THEME.textMain, margin: '0' }}>Crear Cuenta</h2>
            <p style={{ color: THEME.textMuted, marginTop: '8px', fontSize: '15px' }}>Únete y empieza a gestionar solicitudes</p>
          </div>
          
          {msg && (
            <div style={{ backgroundColor: msg.includes('Error') ? THEME.errorBg : THEME.successBg, color: msg.includes('Error') ? THEME.errorText : THEME.successText, padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '14px', display:'flex', alignItems:'center', gap:'10px' }}>
              <span>{msg.includes('Error') ? '⚠️' : '✅'}</span> {msg}
            </div>
          )}

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Nombre Completo</label>
              <input type="text" required placeholder="Ej: Juan Pérez" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email Corporativo</label>
              <input type="email" required placeholder="nombre@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" placeholder="+52..." value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
              </div>
              <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Tipo</label>
                  <select value={providerType} onChange={(e) => setProviderType(e.target.value)} style={selectStyle} required onFocus={focusStyle} onBlur={blurStyle}>
                      <option value="" disabled>Seleccionar</option>
                      <option value="Internal">Interno</option>
                      <option value="Contractor">Contratista</option>
                      <option value="Vendor">Proveedor</option>
                  </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Contraseña</label>
              <input type="password" required placeholder="Min. 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} onFocus={focusStyle} onBlur={blurStyle} />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              style={{ ...buttonStyle, opacity: loading ? 0.7 : 1 }}
              onMouseOver={(e) => { if(!loading) e.currentTarget.style.backgroundColor = THEME.primaryHover }}
              onMouseOut={(e) => { if(!loading) e.currentTarget.style.backgroundColor = THEME.primary }}
            >
              {loading ? 'Registrando...' : 'Registrarse'}
            </button>
          </form>

          <p style={{ marginTop: '32px', textAlign: 'center', fontSize: '15px', color: THEME.textMuted }}>
            ¿Ya tienes cuenta? <Link to="/login" style={{ color: THEME.primary, textDecoration: 'none', fontWeight: '600' }}>Inicia sesión</Link>
          </p>

        </div>
      </div>
    </>
  );
};

// Estilos con TEXTO NEGRO
const labelStyle = { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: THEME.textMain };
const inputStyle: React.CSSProperties = { 
    width: '100%', padding: '14px', borderRadius: '8px', border: `1px solid ${THEME.border}`, outline: 'none', fontSize: '15px', boxSizing: 'border-box', transition: '0.2s', backgroundColor: '#f8fafc',
    color: '#000000', // <--- TEXTO NEGRO PURO
    fontWeight: '500' // <--- UN POCO MAS GRUESO
};
const selectStyle: React.CSSProperties = { ...inputStyle, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', backgroundSize: '16px' };
const buttonStyle: React.CSSProperties = { backgroundColor: THEME.primary, color: 'white', padding: '14px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '16px', marginTop: '10px', transition: '0.2s', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' };
const focusStyle = (e: any) => { e.target.style.borderColor = THEME.primary; e.target.style.backgroundColor = '#fff'; };
const blurStyle = (e: any) => { e.target.style.borderColor = THEME.border; e.target.style.backgroundColor = '#f8fafc'; };

export default Register;