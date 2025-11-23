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

// IBM Watson Orchestrate types
interface WxOChatOptions {
  agentId: string;
  agentEnvironmentId: string;
}

interface WxOConfiguration {
  orchestrationID: string;
  hostURL: string;
  rootElementID: string;
  deploymentPlatform: string;
  crn: string;
  chatOptions: WxOChatOptions;
}

interface WxOLoader {
  init: () => void;
}

declare global {
  interface Window {
    wxOConfiguration?: WxOConfiguration;
    wxoLoader?: WxOLoader;
  }
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [loadingSession, setLoadingSession] = useState(true);

  // DATOS USUARIO
  const [employee, setEmployee] = useState<Employee | null>(null);

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

  // --- 2. IBM WATSON ORCHESTRATE AGENT WIDGET ---
  useEffect(() => {
    // Wait for session to be loaded before initializing widget
    if (loadingSession) {
      return;
    }

    const hostURL = "https://us-south.watson-orchestrate.cloud.ibm.com";
    
    // Configure IBM Watson Orchestrate agent
    // Use a dedicated container to avoid conflicts with React's root element
    // The widget will create its own floating overlay
    if (!window.wxOConfiguration) {
      // Ensure the widget container exists
      let widgetContainer = document.getElementById('ibm-watson-widget-container');
      if (!widgetContainer) {
        widgetContainer = document.createElement('div');
        widgetContainer.id = 'ibm-watson-widget-container';
        document.body.appendChild(widgetContainer);
      }

      window.wxOConfiguration = {
        orchestrationID: "28436f4764ec491e9b6b3797f94e6acc_b4b532d1-d810-4636-9d5e-faf7f5115865",
        hostURL: hostURL,
        rootElementID: "ibm-watson-widget-container",
        deploymentPlatform: "ibmcloud",
        crn: "crn:v1:bluemix:public:watsonx-orchestrate:us-south:a/28436f4764ec491e9b6b3797f94e6acc:b4b532d1-d810-4636-9d5e-faf7f5115865::",
        chatOptions: {
          agentId: "3a3b7ae4-2a86-4683-9bbc-61c47a25b98c",
          agentEnvironmentId: "26e469c0-edc4-465b-a0c6-0749f7153e1b",
        }
      };
    }

    // Check if script is already loaded
    const existingScript = document.querySelector('script[src*="wxoLoader.js"]');
    if (existingScript) {
      // If script exists, try to initialize if not already done
      if (window.wxoLoader && typeof window.wxoLoader.init === 'function') {
        try {
          window.wxoLoader.init();
        } catch (error) {
          console.error('Error initializing IBM Watson Orchestrate widget:', error);
        }
      }
      return;
    }

    // Create and load the script
    const script = document.createElement('script');
    script.src = `${hostURL}/wxochat/wxoLoader.js?embed=true`;
    script.async = true;
    script.id = 'ibm-watson-orchestrate-loader';
    
    script.addEventListener('load', () => {
      // Wait for the loader to be fully available
      const initInterval = setInterval(() => {
        if (window.wxoLoader && typeof window.wxoLoader.init === 'function') {
          clearInterval(initInterval);
          try {
            window.wxoLoader.init();
            console.log('IBM Watson Orchestrate widget initialized successfully');
          } catch (error) {
            console.error('Error initializing IBM Watson Orchestrate widget:', error);
          }
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(() => {
        clearInterval(initInterval);
      }, 5000);
    });

    script.addEventListener('error', (error) => {
      console.error('Error loading IBM Watson Orchestrate script:', error);
    });

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Don't remove the script or configuration on cleanup
      // The widget should persist across navigation
    };
  }, [loadingSession]);

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

    </div>
  );
};

export default Home;
