import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// --- CONFIGURACIÓN GLOBAL ---
declare global {
    interface Window {
      wxOConfiguration?: any;
      wxoLoader?: any;
    }
}

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

// --- TIPOS ---
interface Message { id: number; text: string; sender: 'user' | 'bot'; }
interface Task { 
  requestId: number; 
  TypeOfRequest: string; 
  dateOfEntrance: string; 
  dateOfOut: string; 
  daysOf: number; 
  processTime: string; 
  status: "Complete" | "On process" | "Denied"; 
}
interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  position: string;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [loadingSession, setLoadingSession] = useState(true);
  
  // DATOS USUARIO
  const [employee, setEmployee] = useState<Employee | null>(null);

  // ESTADOS CHAT & AGENTE
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const isInitialized = useRef(false); // Semáforo para no cargar doble el agente
  const [ibmAgent, setIbmAgent] = useState<any>(null);

  // ESTADOS TABLA
  const [currentView, setCurrentView] = useState<'chat' | 'table'>('chat');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  // --- 1. AUTH & PERFIL ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      // Cargar datos del empleado si existen
      if (session.user.email) {
        const { data } = await supabase.from('employees').select('*').eq('email', session.user.email).single();
        if (data) setEmployee(data);
      }
      setLoadingSession(false);
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);


  // --- 2. AGENTE IBM (FUSIONADO) ---
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Forzar estilos al contenedor oculto
    const container = document.getElementById('ibm-chat-container');
    if (container) {
        container.style.position = 'absolute';
        container.style.top = '-10000px';
        container.style.visibility = 'hidden';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.overflow = 'hidden';
    }

    const setupInstance = (instance: any) => {
        console.log("🚀 ¡Agente IBM Listo!", instance);
        setIbmAgent(instance);

        if (instance && instance.on) {
            // A. Escuchar mensajes
            instance.on({ type: 'receive', handler: (event: any) => {
                const botText = event.data.text || event.data.content || ""; 
                setMessages(prev => [...prev, { id: Date.now(), text: botText, sender: 'bot' }]);

                // B. Detectar JSON y guardar en Supabase
                const jsonMatch = botText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const taskData = JSON.parse(jsonMatch[0]);
                        if(taskData.request_type) {
                           console.log("💾 Guardando tarea...", taskData);
                           supabase.from('tasks').insert([taskData]).then(() => {
                               console.log("✅ Tarea guardada");
                               if (currentView === 'table') fetchTasks(); // Refrescar si estamos en tabla
                           });
                        }
                    } catch(e) { }
                }
            }});

            // C. Manejar Token (Evitar error 401)
            instance.on({ type: 'authTokenNeeded', handler: (event: any) => {
                console.log("🔐 Enviando token anónimo...");
                event.authToken = "dummy"; 
                event.identityToken = "dummy"; 
            }});
        }
    };

    // Configuración IBM
    window.wxOConfiguration = {
      orchestrationID: "28436f4764ec491e9b6b3797f94e6acc_b4b532d1-d810-4636-9d5e-faf7f5115865",
      agentEnvironmentId: "4390a963-08d5-40b1-80c6-64666e11cc42",
      hostURL: "https://us-south.watson-orchestrate.cloud.ibm.com",
      rootElementID: "ibm-chat-container",
      deploymentPlatform: "ibmcloud",
      crn: "crn:v1:bluemix:public:watsonx-orchestrate:us-south:a/28436f4764ec491e9b6b3797f94e6acc:b4b532d1-d810-4636-9d5e-faf7f5115865::",
      chatOptions: {
          agentId: "80404d22-9c09-4adc-bf53-8a528779b27d",
          onLoad: (instance: any) => setupInstance(instance)
      }
    };

    const script = document.createElement('script');
    script.src = `${window.wxOConfiguration.hostURL}/wxochat/wxoLoader.js?embed=true`;
    script.async = true;
    script.onload = () => {
      if (window.wxoLoader) {
          try {
            const instance = window.wxoLoader.init();
            if (instance) setupInstance(instance);
          } catch (err) { console.warn("Esperando carga...", err); }
      }
    };
    document.head.appendChild(script);

  }, []); // Solo corre una vez


  // --- 3. LÓGICA DE DATOS (TABLA) ---
  useEffect(() => {
    if (!loadingSession && currentView === 'table') fetchTasks();
  }, [currentView, loadingSession]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const { data } = await supabase.from('tasks').select('*').order('id', { ascending: true });
      if (data) {
        const mappedData: Task[] = data.map((item: any) => ({
          requestId: item.id, TypeOfRequest: item.request_type, dateOfEntrance: item.entrance_date,
          dateOfOut: item.out_date, daysOf: item.days_count, processTime: item.process_time,
          status: item.status
        }));
        setTasks(mappedData);
      }
    } catch (error) { console.error(error); } 
    finally { setLoadingTasks(false); }
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;
    setMessages(prev => [...prev, { id: Date.now(), text: inputText, sender: 'user' }]);
    const textToSend = inputText;
    setInputText('');

    if (ibmAgent) {
        try { await ibmAgent.send(textToSend); } catch (err) { console.error(err); }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'AU';

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Complete': return { bg: '#dcfce7', text: '#166534' };
      case 'On process': return { bg: '#fef9c3', text: '#854d0e' };
      case 'Denied': return { bg: '#fee2e2', text: '#991b1b' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loadingSession) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Cargando...</div>;

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: THEME.bgMain, fontFamily: '"Inter", "Segoe UI", sans-serif', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <div style={{ height: '64px', padding: '0 24px', backgroundColor: THEME.headerBg, borderBottom: `1px solid ${THEME.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isMobile && <span style={{fontSize: '20px'}}>☰</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '24px', height: '24px', background: 'linear-gradient(135deg, #2563eb, #1e40af)', borderRadius: '6px' }}></div>
            <span style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>Work Well</span>
          </div>
        </div>
        
        <div style={{ display:'flex', gap: '15px', alignItems: 'center'}}>
            {employee && (
                <div style={{ textAlign: 'right', display: isMobile ? 'none' : 'block' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b' }}>{employee.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{employee.position}</div>
                </div>
            )}
            <div title="Salir" onClick={handleLogout} style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: '600', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}>
                {employee ? getInitials(employee.name) : 'AU'}
            </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* SIDEBAR */}
        <div style={{ width: '72px', backgroundColor: THEME.sidebarBg, display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '24px', gap: '24px' }}>
          <div onClick={() => setCurrentView('chat')} style={{ width: '40px', height: '40px', borderRadius: '50%', cursor: 'pointer', backgroundColor: currentView === 'chat' ? THEME.activeItem : 'rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><div style={{ width: '18px', height: '18px', border: '2px solid white', borderRadius: '50% 50% 0 50%' }}></div></div>
          <div onClick={() => setCurrentView('table')} style={{ width: '40px', height: '40px', borderRadius: '8px', cursor: 'pointer', backgroundColor: currentView === 'table' ? THEME.activeItem : 'transparent', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '4px' }}><div style={{ width: '20px', height: '2px', backgroundColor: '#fff', opacity: 0.9 }} /><div style={{ width: '20px', height: '2px', backgroundColor: '#fff', opacity: 0.9 }} /><div style={{ width: '20px', height: '2px', backgroundColor: '#fff', opacity: 0.9 }} /></div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', backgroundColor: '#f8fafc' }}>
          
          {currentView === 'chat' && (
            <>
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.length === 0 && (<div style={{ textAlign: 'center', marginTop: '10%', color: THEME.textMuted }}><p>Hola {employee?.name.split(' ')[0] || ''}, ¿en qué puedo ayudarte hoy?</p></div>)}
                {messages.map((msg) => (
                  <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: isMobile ? '90%' : '60%' }}>
                    <div style={{ backgroundColor: msg.sender === 'user' ? THEME.primary : '#ffffff', color: msg.sender === 'user' ? 'white' : '#1e293b', padding: '12px 16px', borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>{msg.text}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '20px 24px', backgroundColor: THEME.chatBarBg, display: 'flex', gap: '12px', alignItems: 'center', borderTop: '1px solid #334155' }}>
                <input type="text" placeholder="Escribe tu solicitud..." value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} style={{ flex: 1, maxWidth: '1000px', height: '44px', borderRadius: '6px', border: '1px solid #475569', padding: '0 16px', fontSize: '14px', outline: 'none', backgroundColor: '#1e293b', color: '#fff' }} />
                <button onClick={handleSendMessage} style={{ height: '44px', padding: '0 20px', borderRadius: '6px', border: 'none', backgroundColor: THEME.primary, color: 'white', fontWeight: '600', cursor: 'pointer' }}>Enviar</button>
              </div>
            </>
          )}

          {currentView === 'table' && (
            <div style={{ flex: 1, padding: isMobile ? '16px' : '32px', overflowY: 'auto' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b' }}>
                    {employee ? `Tareas de ${employee.name.split(' ')[0]}` : 'Historial General'}
                </h2>
                {employee && <span style={{ fontSize: '12px', padding:'4px 8px', backgroundColor:'#e0f2fe', color:'#0369a1', borderRadius:'4px', fontWeight:'600' }}>{employee.department}</span>}
              </div>
              
              <div style={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: `1px solid ${THEME.border}`, overflow: 'hidden' }}>
                {loadingTasks ? <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                      <thead><tr style={{ backgroundColor: '#f8fafc', borderBottom: `1px solid ${THEME.border}` }}><th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>ID</th><th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>TYPE</th><th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>ENTRANCE</th><th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>OUT</th><th style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#64748b' }}>DAYS</th><th style={{ padding: '16px', textAlign: 'left', fontSize: '12px', color: '#64748b' }}>TIME</th><th style={{ padding: '16px', textAlign: 'right', fontSize: '12px', color: '#64748b' }}>STATUS</th></tr></thead>
                      <tbody>
                        {tasks.map((task) => { const badge = getStatusBadgeStyle(task.status); return (
                            <tr key={task.requestId} style={{ borderBottom: '1px solid #f1f5f9' }}><td style={{ padding: '16px', fontSize: '14px', fontWeight: '500' }}>#{task.requestId}</td><td style={{ padding: '16px', fontSize: '14px' }}>{task.TypeOfRequest}</td><td style={{ padding: '16px', fontSize: '14px', color: THEME.textMuted }}>{task.dateOfEntrance}</td><td style={{ padding: '16px', fontSize: '14px', color: THEME.textMuted }}>{task.dateOfOut}</td><td style={{ padding: '16px', textAlign: 'center' }}>{task.daysOf}</td><td style={{ padding: '16px', color: THEME.textMuted }}>{task.processTime}</td><td style={{ padding: '16px', textAlign: 'right' }}><span style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', borderRadius: '9999px', backgroundColor: badge.bg, color: badge.text }}>{task.status}</span></td></tr>
                        );})}
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