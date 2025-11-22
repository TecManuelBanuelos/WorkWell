import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// --- ESTILOS ---
const THEME = {
  sidebarBg: '#1e293b',
  activeItem: '#3b82f6',
  headerBg: '#ffffff',
  bgMain: '#f1f5f9',
  textMain: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  primary: '#2563eb',
  chatBarBg: '#0f172a', 
};

// Hook simple para tamaño de pantalla
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};

interface Task { 
  requestId: number; 
  TypeOfRequest: string; 
  dateOfEntrance: string; 
  dateOfOut: string; 
  daysOf: number; 
  processTime: string; 
  status: "Complete" | "On process" | "Denied"; 
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [loadingSession, setLoadingSession] = useState(true);
  
  // --- ESTADOS DE LA TABLA ---
  const [currentView, setCurrentView] = useState<'chat' | 'table'>('table'); // Por defecto tabla ahora
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const { width } = useWindowSize();
  const isMobile = width <= 767;

  // --- 1. LÓGICA DE PROTECCIÓN (AUTH REAL) ---
  useEffect(() => {
    // Verificar si hay sesión activa al cargar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
      } else {
        setLoadingSession(false);
      }
    });

    // Escuchar cambios (ej: si cierra sesión en otra pestaña)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);


  // --- 2. LÓGICA DE CERRAR SESIÓN ---
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };


  // --- 3. LÓGICA DE DATOS: SUPABASE ---
  useEffect(() => {
    if (!loadingSession && currentView === 'table') {
      fetchTasks();
    }
  }, [currentView, loadingSession]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('id', { ascending: true });
  
      if (error) throw error;
  
      if (data) {
        const mappedData: Task[] = data.map((item: any) => ({
          requestId: item.id,                
          TypeOfRequest: item.request_type,  
          dateOfEntrance: item.entrance_date,
          dateOfOut: item.out_date,
          daysOf: item.days_count,
          processTime: item.process_time,
          status: item.status as "Complete" | "On process" | "Denied"
        }));
        setTasks(mappedData);
      }
    } catch (error) {
      console.error("Error cargando tareas:", error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Complete': return { bg: '#dcfce7', text: '#166534' };
      case 'On process': return { bg: '#fef9c3', text: '#854d0e' };
      case 'Denied': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loadingSession) return <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Verificando sesión...</div>;

  return (
    <div style={{ 
      height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column',
      backgroundColor: THEME.bgMain, fontFamily: '"Inter", "Segoe UI", sans-serif',
      overflow: 'hidden', margin: 0, padding: 0, boxSizing: 'border-box', color: THEME.textMain
    }}>
      
      {/* HEADER */}
      <div style={{ height: '64px', padding: '0 24px', backgroundColor: THEME.headerBg, borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', zIndex: 10, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isMobile && <span style={{fontSize: '20px', cursor:'pointer', color: THEME.textMuted}}>☰</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '6px' }}></div>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Work Well</span>
          </div>
        </div>
        
        {/* AVATAR + LOGOUT */}
        <div style={{ display:'flex', gap: '10px', alignItems: 'center'}}>
            <button 
                onClick={handleLogout}
                style={{ padding: '8px 12px', fontSize: '12px', border: '1px solid #e2e8f0', backgroundColor: 'white', borderRadius: '6px', cursor: 'pointer', color: '#64748b' }}
            >
                Salir
            </button>
            <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: '600', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}>AU</div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR */}
        <div style={{ width: '72px', backgroundColor: THEME.sidebarBg, display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '24px', gap: '24px', flexShrink: 0 }}>
          <div onClick={() => setCurrentView('chat')} title="Chat" style={{ width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', backgroundColor: currentView === 'chat' ? THEME.activeItem : 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center', transition: 'all 0.2s' }}>
            <div style={{ width: '18px', height: '18px', border: '2px solid white', borderRadius: '50% 50% 0 50%' }}></div>
          </div>
          <div onClick={() => setCurrentView('table')} title="Tabla" style={{ width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer', backgroundColor: currentView === 'table' ? THEME.activeItem : 'transparent', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px', transition: 'all 0.2s' }}>
            <div style={{ width: '20px', height: '2px', backgroundColor: '#fff', opacity: 0.9 }} />
            <div style={{ width: '20px', height: '2px', backgroundColor: '#fff', opacity: 0.9 }} />
            <div style={{ width: '20px', height: '2px', backgroundColor: '#fff', opacity: 0.9 }} />
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#f8fafc' }}>
          
          {/* --- VISTA CHAT (Vacía por ahora) --- */}
          {currentView === 'chat' && (
            <div style={{ flex: 1, padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: THEME.textMuted }}>
                 <p>Chat desactivado temporalmente.</p>
            </div>
          )}

          {/* --- VISTA TABLA --- */}
          {currentView === 'table' && (
            <div style={{ flex: 1, padding: isMobile ? '16px' : '32px', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>Historial</h2>
              
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${THEME.border}`, overflow: 'hidden' }}>
                
                {loadingTasks ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: THEME.textMuted }}>Cargando datos...</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${THEME.border}` }}>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>ID</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>TYPE</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>ENTRANCE</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>OUT</th>
                          <th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>DAYS</th>
                          <th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>TIME</th>
                          <th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>STATUS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task) => {
                           const badge = getStatusBadgeStyle(task.status);
                           return (
                            <tr key={task.requestId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>#{task.requestId}</td>
                              <td style={{ padding: '16px', fontSize: '14px' }}>{task.TypeOfRequest}</td>
                              <td style={{ padding: '16px', fontSize: '14px', color: THEME.textMuted }}>{task.dateOfEntrance}</td>
                              <td style={{ padding: '16px', fontSize: '14px', color: THEME.textMuted }}>{task.dateOfOut}</td>
                              <td style={{ padding: '16px', textAlign: 'center' }}>{task.daysOf}</td>
                              <td style={{ padding: '16px', color: THEME.textMuted }}>{task.processTime}</td>
                              <td style={{ padding: '16px', textAlign: 'right' }}>
                                <span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '9999px', backgroundColor: badge.bg, color: badge.text }}>{task.status}</span>
                              </td>
                            </tr>
                           );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;