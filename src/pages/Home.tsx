import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';


// --- ESTILOS ---
const THEME = {
  sidebarBg: '#1e293b',
  activeItem: '#3b82f6',
  headerBg: '#ffffff',
  bgMain: '#fafbfc',
  textMain: '#0f172a',
  textMuted: '#64748b',
  border: '#e2e8f0',
  primary: '#2563eb',
  primaryHover: '#1d4ed8',
  chatBarBg: '#0f172a',
  cardBg: '#ffffff',
  shadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  shadowMd: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  shadowLg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

// --- TIPOS ---
interface LeaveRequest {
  request_id: number;
  employee_id: number; // int4 from database
  leave_type: string;
  start_date: string;
  end_date: string;
  days_requested: number;
  approved_days: number;
  created_at?: string; // Optional, might not exist
  status?: string; // Optional, might not exist
  decision_source?: string; // ORCHESTRA, HR_MANUAL, etc.
  prescription?: string | null; // PDF field (optional for now)
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

// EMPLEADO HARDCODEADO
const HARDCODED_EMPLOYEE: Employee = {
  id: 1,
  name: 'Juan Pérez',
  email: 'juan.perez@empresa.com',
  department: 'Recursos Humanos',
  position: 'Gerente de RRHH',
};

const Home: React.FC = () => {
  const navigate = useNavigate();
  
  // DATOS USUARIO HARDCODEADO
  const [employee] = useState<Employee>(HARDCODED_EMPLOYEE);

  // ESTADOS TABLA
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  // Employee external_id hardcodeado (emp001, emp002, etc.)
  const EMPLOYEE_EXTERNAL_ID = 'emp001';

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  
  // ESTADO MENÚ USUARIO
  const [showUserMenu, setShowUserMenu] = useState(false);

  // optional: actualizar isMobile al redimensionar
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 767);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // --- 1. IBM WATSON ORCHESTRATE AGENT WIDGET ---
  useEffect(() => {
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
  }, []);

  // --- 2. LÓGICA DE DATOS (TABLA) ---
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      // Primero, obtener el employee_id (int) del external_id (varchar)
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('employee_id')
        .eq('external_id', EMPLOYEE_EXTERNAL_ID)
        .single();

      if (employeeError || !employeeData) {
        console.error('Error fetching employee:', employeeError);
        setLoadingTasks(false);
        return;
      }

      const employeeId = employeeData.employee_id;

      // Luego, obtener las leave_requests usando el employee_id (int)
      // Ordenar por start_date (más reciente primero)
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('employee_id', employeeId)
        .order('start_date', { ascending: false });

      if (error) {
        console.error('Error fetching leave requests:', error);
        return;
      }

      if (data) {
        const mappedData: LeaveRequest[] = data.map((item: Record<string, unknown>) => ({
          request_id: (item.request_id as number) || 0,
          employee_id: (item.employee_id as number) || 0,
          leave_type: (item.leave_type as string) || '',
          start_date: (item.start_date as string) || '',
          end_date: (item.end_date as string) || '',
          days_requested: (item.days_requested as number) || 0,
          approved_days: (item.approved_days as number) || 0,
          created_at: (item.created_at as string) || undefined,
          status: (item.status as string) || undefined,
          decision_source: (item.decision_source as string) || undefined,
          prescription: (item.prescription as string | null) || null,
        }));
        setLeaveRequests(mappedData);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
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

  const getStatusBadgeStyle = (status?: string, decisionSource?: string) => {
    // Si hay status, usarlo; si no, usar decision_source
    const statusToCheck = status || decisionSource || '';
    const statusUpper = statusToCheck.toUpperCase();
    
    switch (statusUpper) {
      case 'APPROVED':
      case 'COMPLETE':
      case 'ORCHESTRA': // Decision source
        return { bg: '#dcfce7', text: '#166534' };
      case 'PENDING':
      case 'ON PROCESS':
      case 'IN PROCESS':
        return { bg: 'ffa500', text: '#854d0e' };
      case 'DENIED':
      case 'REJECTED':
      case 'HR_MANUAL': // Decision source
        return { bg: '#fee2e2', text: '#991b1b' };
      default:
        return { bg: '#e0f2fe', text: '#0369a1' };
    }
  };

  return (
    <div
        style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: THEME.bgMain,
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          overflow: 'hidden',
        }}
      >
      {/* HEADER */}
      <div
        style={{
          height: '72px',
          padding: '0 32px',
          backgroundColor: THEME.headerBg,
          borderBottom: `1px solid ${THEME.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: THEME.shadow,
          zIndex: 10,
          backdropFilter: 'blur(10px)',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {isMobile && (
            <span 
              style={{ 
                fontSize: '24px', 
                cursor: 'pointer',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              ☰
            </span>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                animation: 'fadeIn 0.5s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05) rotate(5deg)';
                e.currentTarget.style.boxShadow = '0 6px 12px -1px rgba(37, 99, 235, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(37, 99, 235, 0.3)';
              }}
            />
            <span
              style={{
                fontSize: '22px',
                fontWeight: '700',
                color: '#1e293b',
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #2563eb, #1e40af)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                animation: 'fadeIn 0.5s ease',
              }}
            >
              Work Well
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', position: 'relative', zIndex: 10001 }}>
          {employee && (
            <div
              style={{
                textAlign: 'right',
                display: isMobile ? 'none' : 'block',
                animation: 'fadeInRight 0.5s ease',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#1e293b',
                  marginBottom: '2px',
                }}
              >
                {employee.name}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                {employee.position}
              </div>
            </div>
          )}
          <div
            id="user-menu-container"
            style={{
              position: 'relative',
            }}
            onMouseEnter={() => {
              if (employee) {
                setShowUserMenu(true);
              }
            }}
            onMouseLeave={() => {
              setShowUserMenu(false);
            }}
          >
            <div
              title={employee ? employee.name : 'Usuario'}
              style={{
                width: '40px',
                height: '40px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#ffffff',
                borderRadius: '50%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '14px',
                fontWeight: '700',
                border: '3px solid #ffffff',
                boxShadow: THEME.shadowMd,
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: 'fadeIn 0.5s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
                e.currentTarget.style.boxShadow = THEME.shadowLg;
                e.currentTarget.style.borderColor = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = THEME.shadowMd;
                e.currentTarget.style.borderColor = '#ffffff';
              }}
            >
              {employee ? getInitials(employee.name) : 'AU'}
            </div>

            {/* Menú desplegable */}
            {showUserMenu && employee && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 12px)',
                  right: 0,
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: THEME.shadowLg,
                  border: `1px solid ${THEME.border}`,
                  minWidth: '240px',
                  zIndex: 99999,
                  overflow: 'hidden',
                  animation: 'slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  backdropFilter: 'blur(10px)',
                }}
                onMouseEnter={() => {
                  setShowUserMenu(true);
                }}
                onMouseLeave={() => {
                  setShowUserMenu(false);
                }}
              >
                {/* Información del usuario */}
                <div
                  style={{
                    padding: '16px',
                    borderBottom: `1px solid ${THEME.border}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#1e293b',
                      marginBottom: '4px',
                    }}
                  >
                    {employee.name}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                      marginBottom: '4px',
                    }}
                  >
                    {employee.email}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                    }}
                  >
                    {employee.position} • {employee.department}
                  </div>
                </div>

                {/* Botón de logout */}
                <div
                  onClick={handleLogout}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#dc2626',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fef2f2';
                    e.currentTarget.style.paddingLeft = '20px';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.paddingLeft = '16px';
                  }}
                >
                  <span>🚪</span>
                  Cerrar sesión
                </div>
              </div>
            )}
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
              padding: isMobile ? '20px' : '40px',
              overflowY: 'auto',
            }}
          >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '32px',
                  animation: 'fadeInUp 0.6s ease',
                }}
              >
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: '800',
                    color: '#1e293b',
                    letterSpacing: '-0.5px',
                    margin: 0,
                  }}
                >
                  {employee
                    ? `${employee.name.split(' ')[0]}'s requests`
                    : 'Historial General'}
                </h2>
                {employee && (
                  <span
                    style={{
                      fontSize: '12px',
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
                      color: '#0369a1',
                      borderRadius: '20px',
                      fontWeight: '600',
                      boxShadow: THEME.shadow,
                      transition: 'transform 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {employee.department}
                  </span>
                )}
              </div>

              <div
                style={{
                  backgroundColor: THEME.cardBg,
                  borderRadius: '16px',
                  boxShadow: THEME.shadowMd,
                  border: `1px solid ${THEME.border}`,
                  overflow: 'hidden',
                  animation: 'fadeInUp 0.6s ease 0.1s both',
                }}
              >
                {loadingTasks ? (
                  <div style={{ 
                    padding: '60px', 
                    textAlign: 'center',
                    color: THEME.textMuted,
                    fontSize: '14px',
                  }}>
                    <div style={{
                      display: 'inline-block',
                      width: '40px',
                      height: '40px',
                      border: '3px solid #e2e8f0',
                      borderTopColor: THEME.primary,
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}></div>
                    <div style={{ marginTop: '16px' }}>Cargando...</div>
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
                            background: 'linear-gradient(to bottom, #fafbfc, #f8fafc)',
                            borderBottom: `2px solid ${THEME.border}`,
                          }}
                        >
                          <th
                            style={{
                              padding: '20px 16px',
                              textAlign: 'left',
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            ID
                          </th>
                          <th
                            style={{
                              padding: '20px 16px',
                              textAlign: 'left',
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            LEAVE TYPE
                          </th>
                          <th
                            style={{
                              padding: '20px 16px',
                              textAlign: 'left',
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            START DATE
                          </th>
                          <th
                            style={{
                              padding: '20px 16px',
                              textAlign: 'left',
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            END DATE
                          </th>
                          <th
                            style={{
                              padding: '20px 16px',
                              textAlign: 'center',
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            REQUESTED DAYS
                          </th>
                          <th
                            style={{
                              padding: '20px 16px',
                              textAlign: 'center',
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            APPROVED DAYS
                          </th>
                          <th
                            style={{
                              padding: '20px 16px',
                              textAlign: 'left',
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            DECISION SOURCE
                          </th>
                          <th
                            style={{
                              padding: '20px 16px',
                              textAlign: 'right',
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            STATUS
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaveRequests.length === 0 && !loadingTasks ? (
                          <tr>
                            <td
                              colSpan={8}
                              style={{
                                padding: '60px 20px',
                                textAlign: 'center',
                                color: THEME.textMuted,
                                fontSize: '14px',
                              }}
                            >
                              No leave requests found for employee {EMPLOYEE_EXTERNAL_ID}
                            </td>
                          </tr>
                        ) : (
                          leaveRequests.map((request, index) => {
                            const badge = getStatusBadgeStyle(request.status, request.decision_source);
                            const displayStatus = request.status || request.decision_source || '-';
                            // Formatear fechas
                            const formatDate = (dateString: string) => {
                              if (!dateString) return '-';
                              try {
                                const date = new Date(dateString);
                                return date.toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                });
                              } catch {
                                return dateString;
                              }
                            };

                            return (
                              <tr
                                key={request.request_id}
                                style={{
                                  borderBottom: '1px solid #f1f5f9',
                                  transition: 'all 0.2s ease',
                                  animation: `fadeInUp 0.4s ease ${index * 0.05}s both`,
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#fafbfc';
                                  e.currentTarget.style.transform = 'translateX(4px)';
                                  e.currentTarget.style.boxShadow = 'inset 4px 0 0 0 #2563eb';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.transform = 'translateX(0)';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}
                              >
                                <td
                                  style={{
                                    padding: '20px 16px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: THEME.textMain,
                                  }}
                                >
                                  #{request.request_id}
                                </td>
                                <td
                                  style={{ 
                                    padding: '20px 16px', 
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: THEME.textMain,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                  }}
                                >
                                  {request.leave_type || '-'}
                                </td>
                                <td
                                  style={{
                                    padding: '20px 16px',
                                    fontSize: '14px',
                                    color: THEME.textMuted,
                                    fontWeight: '500',
                                  }}
                                >
                                  {formatDate(request.start_date)}
                                </td>
                                <td
                                  style={{
                                    padding: '20px 16px',
                                    fontSize: '14px',
                                    color: THEME.textMuted,
                                    fontWeight: '500',
                                  }}
                                >
                                  {formatDate(request.end_date)}
                                </td>
                                <td
                                  style={{
                                    padding: '20px 16px',
                                    textAlign: 'center',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: THEME.textMain,
                                  }}
                                >
                                  {request.days_requested || 0}
                                </td>
                                <td
                                  style={{
                                    padding: '20px 16px',
                                    textAlign: 'center',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: THEME.textMain,
                                  }}
                                >
                                  {request.approved_days || 0}
                                </td>
                                <td
                                  style={{
                                    padding: '20px 16px',
                                    color: THEME.textMuted,
                                    fontSize: '13px',
                                    fontWeight: '500',
                                  }}
                                >
                                  {request.decision_source || '-'}
                                </td>
                                <td
                                  style={{
                                    padding: '20px 16px',
                                    textAlign: 'right',
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '700',
                                      padding: '6px 12px',
                                      borderRadius: '20px',
                                      backgroundColor: badge.bg,
                                      color: badge.text,
                                      display: 'inline-block',
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px',
                                      transition: 'transform 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                  >
                                    {displayStatus}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
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
