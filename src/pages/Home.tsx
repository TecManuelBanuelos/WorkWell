import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Asegúrate que esta ruta sea correcta (../ para salir de pages)

// Extender la interfaz global de Window para IBM Watson
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

const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth });
  useEffect(() => {
    const handleResize = () => setWindowSize({ width: window.innerWidth });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return windowSize;
};

// Tipos
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

const useAuth = () => true;

const Home: React.FC = () => {
  const navigate = useNavigate();
  const isAuthenticated = useAuth();
  const [loading, setLoading] = useState(true);
  
  // Estados del Chat y Agente
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [ibmAgent, setIbmAgent] = useState<any>(null); // Guardamos la instancia del bot aquí

  // Estados de la Tabla y Vista
  const [currentView, setCurrentView] = useState<'chat' | 'table'>('chat');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const { width } = useWindowSize();
  const isMobile = width <= 767;

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    setLoading(false);
  }, [isAuthenticated, navigate]);

// --- 1. LÓGICA WATSON ORCHESTRATE + SUPABASE (INTENTO 3: VÍA ONLOAD) ---
useEffect(() => {
    // Definimos primero la función que configura todo cuando tengamos al agente
    const setupInstance = (instance: any) => {
        console.log("¡Agente IBM capturado vía onLoad!", instance);
        setIbmAgent(instance);

        // Activamos el "Espía" para leer los JSON
        if (instance && instance.on) {
            instance.on({ type: 'receive', handler: async (event: any) => {
                const botText = event.data.text || event.data.content || ""; 
                
                // Mostrar en chat
                setMessages(prev => [...prev, { id: Date.now(), text: botText, sender: 'bot' }]);

                // Detectar JSON
                try {
                    const jsonMatch = botText.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        const taskData = JSON.parse(jsonMatch[0]);
                        if(taskData.request_type) {
                           console.log("Guardando en Supabase:", taskData);
                           await supabase.from('tasks').insert([taskData]);
                           if (currentView === 'table') fetchTasks();
                        }
                    }
                } catch (e) { /* Ignorar */ }
            }});
        }
    };

    // --- CONFIGURACIÓN CON EL TRUCO DEL ONLOAD ---
    window.wxOConfiguration = {
      orchestrationID: "28436f4764ec491e9b6b3797f94e6acc_b4b532d1-d810-4636-9d5e-faf7f5115865",
      hostURL: "https://us-south.watson-orchestrate.cloud.ibm.com",
      rootElementID: "ibm-chat-container",
      deploymentPlatform: "ibmcloud",
      crn: "crn:v1:bluemix:public:watsonx-orchestrate:us-south:a/28436f4764ec491e9b6b3797f94e6acc:b4b532d1-d810-4636-9d5e-faf7f5115865::",
      chatOptions: {
          agentId: "80404d22-9c09-4adc-bf53-8a528779b27d",
          // AQUÍ ESTÁ EL CAMBIO CLAVE:
          onLoad: (instance: any) => {
              setupInstance(instance);
          }
      }
    };

    const script = document.createElement('script');
    script.src = `${window.wxOConfiguration.hostURL}/wxochat/wxoLoader.js?embed=true`;
    script.async = true;
    
    script.onload = () => {
      if (window.wxoLoader) {
          // Ejecutamos init, pero confiamos en que el 'onLoad' de arriba capture la instancia
          window.wxoLoader.init(); 
      }
    };

    document.head.appendChild(script);

    return () => {
       // limpieza opcional
    };
  }, []);
  
  // --- 2. LÓGICA DE DATOS (SUPABASE) ---
  useEffect(() => {
    if (currentView === 'table') {
      fetchTasks();
    }
  }, [currentView]);

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

  // --- 3. MANEJO DE ENVÍO DE MENSAJES ---
  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;

    // A. Mostrar mi mensaje
    setMessages(prev => [...prev, { id: Date.now(), text: inputText, sender: 'user' }]);
    const textToSend = inputText;
    setInputText(''); // Limpiar input inmediatamente

    // B. Enviar al Agente IBM (Si está listo)
    if (ibmAgent) {
        try {
            // Intenta enviar el objeto input
            await ibmAgent.send({ input: { text: textToSend } });
        } catch (err) {
            console.warn("Intento 1 fallido, probando envío directo...");
            try {
                 // Fallback: enviar solo texto
                 await ibmAgent.send(textToSend);
            } catch (e) {
                console.error("No se pudo enviar mensaje al bot", e);
            }
        }
    } else {
        console.log("El agente IBM aun no ha cargado...");
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

  if (loading) return <div>Cargando...</div>;

  // --- 4. RENDER (LO QUE TE FALTABA ANTES) ---
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
        <div style={{ width: '36px', height: '36px', backgroundColor: '#e2e8f0', color: '#475569', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: '600', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' }}>AU</div>
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
          
          {/* --- VISTA CHAT --- */}
          {currentView === 'chat' && (
            <>
              <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {messages.length === 0 && (
                   <div style={{ textAlign: 'center', marginTop: '10%', color: THEME.textMuted }}>
                     <p>Bienvenido al asistente. Escribe para comenzar.</p>
                   </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: isMobile ? '90%' : '60%' }}>
                    <div style={{ 
                        backgroundColor: msg.sender === 'user' ? THEME.primary : '#ffffff', 
                        color: msg.sender === 'user' ? 'white' : '#1e293b', 
                        border: msg.sender === 'bot' ? '1px solid #e2e8f0' : 'none',
                        padding: '12px 16px', 
                        borderRadius: msg.sender === 'user' ? '12px 12px 0 12px' : '12px 12px 12px 0',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                        {msg.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* BARRA DE INPUT */}
              <div style={{ 
                padding: '20px 24px', 
                backgroundColor: THEME.chatBarBg,
                display: 'flex', gap: '12px', alignItems: 'center',
                borderTop: '1px solid #334155'
              }}>
                <input 
                  type="text" placeholder="Escribe tu solicitud..." 
                  value={inputText} onChange={(e) => setInputText(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  style={{ 
                    flex: 1, maxWidth: '1000px', height: '44px', borderRadius: '6px', 
                    border: '1px solid #475569',
                    padding: '0 16px', fontSize: '14px', outline: 'none', 
                    backgroundColor: '#1e293b', 
                    color: '#fff' 
                  }} 
                />
                <button onClick={handleSendMessage} style={{ height: '44px', padding: '0 20px', borderRadius: '6px', border: 'none', backgroundColor: THEME.primary, color: 'white', fontWeight: '600', cursor: 'pointer' }}>Enviar</button>
              </div>
            </>
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