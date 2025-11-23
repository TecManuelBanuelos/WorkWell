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
interface Task {
  requestId: number;
  TypeOfRequest: string;
  dateOfEntrance: string;
  dateOfOut: string;
  daysOf: number;
  processTime: string;
  status: 'Complete' | 'On process' | 'Denied';
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

  // ESTADOS AGENTE
  const isInitialized = useRef(false);

  // ESTADOS TABLA
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  // optional: actualizar isMobile al redimensionar
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // --- 1. AUTH & PERFIL ---
  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
        return;
      }

      if (session.user.email) {
        const { data } = await supabase
          .from('employees')
          .select('*')
          .eq('email', session.user.email)
          .single();
        if (data) setEmployee(data as Employee);
      }
      setLoadingSession(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate('/login');
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // --- 2. AGENTE IBM (EMBED) ---
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const setupInstance = (instance: any) => {
      console.log('🚀 ¡Agente IBM Listo!', instance);

      if (instance && instance.on) {
        // Escuchar mensajes para detectar JSON y guardar en Supabase
        instance.on({
          type: 'receive',
          handler: (event: any) => {
            const botText = event?.data?.text || event?.data?.content || event?.text || event?.content || '';

            // Detectar JSON y guardar en Supabase
            if (botText) {
              const jsonMatch = botText.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                try {
                  const taskData = JSON.parse(jsonMatch[0]);
                  if (taskData.request_type) {
                    console.log('💾 Guardando tarea...', taskData);
                    supabase
                      .from('tasks')
                      .insert([taskData])
                      .then(() => {
                        console.log('✅ Tarea guardada');
                        fetchTasks();
                      });
                  }
                } catch (e) {
                  console.error('Error parsing JSON in bot text', e);
                }
              }
            }
          },
        });

        // Token (para evitar 401 si lo pide)
        instance.on({
          type: 'authTokenNeeded',
          handler: (event: any) => {
            console.log('🔐 Enviando token anónimo...');
            event.authToken = 'dummy';
            event.identityToken = 'dummy';
          },
        });
      }
    };

    // Asegurar que el contenedor existe
    const ensureContainer = () => {
      let container = document.getElementById('ibm-chat-widget');
      if (!container) {
        container = document.createElement('div');
        container.id = 'ibm-chat-widget';
        document.body.appendChild(container);
      }
      return container;
    };

    ensureContainer();

    window.wxOConfiguration = {
      orchestrationID: '28436f4764ec491e9b6b3797f94e6acc_b4b532d1-d810-4636-9d5e-faf7f5115865',
      hostURL: 'https://us-south.watson-orchestrate.cloud.ibm.com',
      rootElementID: 'ibm-chat-widget',
      deploymentPlatform: 'ibmcloud',
      crn: 'crn:v1:bluemix:public:watsonx-orchestrate:us-south:a/28436f4764ec491e9b6b3797f94e6acc:b4b532d1-d810-4636-9d5e-faf7f5115865::',
      chatOptions: {
        agentId: '3a3b7ae4-2a86-4683-9bbc-61c47a25b98c',
        agentEnvironmentId: '26e469c0-edc4-465b-a0c6-0749f7153e1b',
        onLoad: (instance: any) => {
          console.log('onLoad callback llamado con instancia:', instance);
          if (instance) {
            setupInstance(instance);
          }
        },
      },
    };

    setTimeout(function () {
      const script = document.createElement('script');
      script.src = `${window.wxOConfiguration.hostURL}/wxochat/wxoLoader.js?embed=true`;
      script.addEventListener('load', function () {
        if (window.wxoLoader) {
          window.wxoLoader.init();
        }
      });
      document.head.appendChild(script);
    }, 0);
  }, []);

  // --- 2.1 POSICIONAR WIDGET EN LA ESQUINA INFERIOR DERECHA ---
  useEffect(() => {
    const positionWidget = () => {
      const container = document.getElementById('ibm-chat-widget');
      if (!container) {
        setTimeout(positionWidget, 100);
        return;
      }

      container.style.position = 'fixed';
      container.style.bottom = '24px';
      container.style.right = '24px';
      container.style.width = '380px';
      container.style.height = '600px';
      container.style.zIndex = '1000';
      container.style.visibility = 'visible';
      container.style.overflow = 'visible';
      container.style.border = 'none';
      container.style.outline = 'none';
      container.style.boxShadow = 'none';
      container.style.background = 'transparent';
      container.style.pointerEvents = 'auto';

      // Also style any iframes that IBM injects
      const iframes = container.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        iframe.style.border = 'none';
        iframe.style.outline = 'none';
        iframe.style.boxShadow = 'none';
        iframe.style.pointerEvents = 'auto';
      });

      // Remove borders from nested divs
      const nestedDivs = container.querySelectorAll('div');
      nestedDivs.forEach((div) => {
        const computedStyle = window.getComputedStyle(div);
        if (computedStyle.border && computedStyle.border !== 'none' && computedStyle.border !== '0px') {
          div.style.border = 'none';
        }
        if (computedStyle.boxShadow && computedStyle.boxShadow !== 'none') {
          div.style.boxShadow = 'none';
        }
      });
    };

    positionWidget();
    
    // Also check periodically in case the widget loads later
    const interval = setInterval(() => {
      const container = document.getElementById('ibm-chat-widget');
      if (container) {
        positionWidget();
      }
    }, 500);

    // Use MutationObserver to watch for dynamically added elements
    const observer = new MutationObserver(() => {
      positionWidget();
    });

    const container = document.getElementById('ibm-chat-widget');
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
    }

    return () => {
      clearInterval(interval);
      observer.disconnect();
    };
  }, []);

  // --- 3. LÓGICA DE DATOS (TABLA) ---
  useEffect(() => {
    if (!loadingSession) fetchTasks();
  }, [loadingSession]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .order('id', { ascending: true });

      if (data) {
        const mappedData: Task[] = (data as any[]).map((item: any) => ({
          requestId: item.id,
          TypeOfRequest: item.request_type,
          dateOfEntrance: item.entrance_date,
          dateOfOut: item.out_date,
          daysOf: item.days_count,
          processTime: item.process_time,
          status: item.status,
        }));
        setTasks(mappedData);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const getInitials = (name: string) =>
    name
      ? name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase()
      : 'AU';

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Complete':
        return { bg: '#dcfce7', text: '#166534' };
      case 'On process':
        return { bg: '#fef9c3', text: '#854d0e' };
      case 'Denied':
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  if (loadingSession) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        Cargando...
      </div>
    );
  }

  return (
    <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: THEME.bgMain,
          fontFamily: '"Inter", "Segoe UI", sans-serif',
          overflow: 'hidden',
        }}
      >
      {/* HEADER */}
      <div
        style={{
          height: '64px',
          padding: '0 24px',
          backgroundColor: THEME.headerBg,
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {isMobile && <span style={{ fontSize: '20px' }}>☰</span>}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                borderRadius: '6px',
              }}
            />
            <span
              style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1e293b',
              }}
            >
              Work Well
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          {employee && (
            <div
              style={{
                textAlign: 'right',
                display: isMobile ? 'none' : 'block',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                }}
              >
                {employee.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                {employee.position}
              </div>
            </div>
          )}
          <div
            title="Salir"
            onClick={handleLogout}
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#e2e8f0',
              color: '#475569',
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              fontSize: '14px',
              fontWeight: '600',
              border: '2px solid #fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              cursor: 'pointer',
            }}
          >
            {employee ? getInitials(employee.name) : 'AU'}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            backgroundColor: '#f8fafc',
          }}
        >
          {/* VISTA TABLA */}
          <div
            style={{
              flex: 1,
              padding: isMobile ? '16px' : '32px',
              overflowY: 'auto',
            }}
          >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                }}
              >
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#1e293b',
                  }}
                >
                  {employee
                    ? `Tareas de ${employee.name.split(' ')[0]}`
                    : 'Historial General'}
                </h2>
                {employee && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      borderRadius: '4px',
                      fontWeight: '600',
                    }}
                  >
                    {employee.department}
                  </span>
                )}
              </div>

              <div
                style={{
                  backgroundColor: '#fff',
                  borderRadius: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  border: `1px solid ${THEME.border}`,
                  overflow: 'hidden',
                }}
              >
                {loadingTasks ? (
                  <div style={{ padding: '40px', textAlign: 'center' }}>
                    Cargando...
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        minWidth: '900px',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            backgroundColor: '#f8fafc',
                            borderBottom: `1px solid ${THEME.border}`,
                          }}
                        >
                          <th
                            style={{
                              padding: '16px',
                              textAlign: 'left',
                              fontSize: '12px',
                              color: '#64748b',
                            }}
                          >
                            ID
                          </th>
                          <th
                            style={{
                              padding: '16px',
                              textAlign: 'left',
                              fontSize: '12px',
                              color: '#64748b',
                            }}
                          >
                            TYPE
                          </th>
                          <th
                            style={{
                              padding: '16px',
                              textAlign: 'left',
                              fontSize: '12px',
                              color: '#64748b',
                            }}
                          >
                            ENTRANCE
                          </th>
                          <th
                            style={{
                              padding: '16px',
                              textAlign: 'left',
                              fontSize: '12px',
                              color: '#64748b',
                            }}
                          >
                            OUT
                          </th>
                          <th
                            style={{
                              padding: '16px',
                              textAlign: 'center',
                              fontSize: '12px',
                              color: '#64748b',
                            }}
                          >
                            DAYS
                          </th>
                          <th
                            style={{
                              padding: '16px',
                              textAlign: 'left',
                              fontSize: '12px',
                              color: '#64748b',
                            }}
                          >
                            TIME
                          </th>
                          <th
                            style={{
                              padding: '16px',
                              textAlign: 'right',
                              fontSize: '12px',
                              color: '#64748b',
                            }}
                          >
                            STATUS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task) => {
                          const badge = getStatusBadgeStyle(task.status);
                          return (
                            <tr
                              key={task.requestId}
                              style={{
                                borderBottom: '1px solid #f1f5f9',
                              }}
                            >
                              <td
                                style={{
                                  padding: '16px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                }}
                              >
                                #{task.requestId}
                              </td>
                              <td
                                style={{ padding: '16px', fontSize: '14px' }}
                              >
                                {task.TypeOfRequest}
                              </td>
                              <td
                                style={{
                                  padding: '16px',
                                  fontSize: '14px',
                                  color: THEME.textMuted,
                                }}
                              >
                                {task.dateOfEntrance}
                              </td>
                              <td
                                style={{
                                  padding: '16px',
                                  fontSize: '14px',
                                  color: THEME.textMuted,
                                }}
                              >
                                {task.dateOfOut}
                              </td>
                              <td
                                style={{
                                  padding: '16px',
                                  textAlign: 'center',
                                }}
                              >
                                {task.daysOf}
                              </td>
                              <td
                                style={{
                                  padding: '16px',
                                  color: THEME.textMuted,
                                }}
                              >
                                {task.processTime}
                              </td>
                              <td
                                style={{
                                  padding: '16px',
                                  textAlign: 'right',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    padding: '4px 10px',
                                    borderRadius: '9999px',
                                    backgroundColor: badge.bg,
                                    color: badge.text,
                                  }}
                                >
                                  {task.status}
                                </span>
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
        </div>
      </div>

      {/* Contenedor donde IBM inyecta el widget (lo posicionamos con el useEffect) */}
      <div id="ibm-chat-widget" />
    </div>
  );
};

export default Home;
