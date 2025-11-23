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
  ref_pdf?: string | null; // URL to PDF in Supabase Storage
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

// HARDCODED EMPLOYEE
const HARDCODED_EMPLOYEE: Employee = {
  id: 1,
  name: 'Juan Pérez',
  email: 'juan.perez@empresa.com',
  department: 'Human Resources',
  position: 'HR Manager',
};

const Home: React.FC = () => {
  const navigate = useNavigate();

  // HARDCODED USER DATA
  const [employee] = useState<Employee>(HARDCODED_EMPLOYEE);

  // TABLE STATES
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState<number | null>(null); // request_id that is uploading
  
  // Employee external_id hardcodeado (emp001, emp002, etc.)
  const EMPLOYEE_EXTERNAL_ID = 'emp001';

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  // USER MENU STATE
  const [showUserMenu, setShowUserMenu] = useState(false);

  // optional: update isMobile on resize
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

  // --- 2. DATA LOGIC (TABLE) ---
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      // First, get the employee_id (int) from external_id (varchar)
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

      // Then, get leave_requests using the employee_id (int)
      // Sort by start_date (most recent first)
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
          ref_pdf: (item.ref_pdf as string | null) || null,
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

  // Function to upload PDF to Supabase Storage
  const handlePdfUpload = async (requestId: number, file: File) => {
    setUploadingPdf(requestId);
    try {
      console.log('=== PDF Upload Debug ===');
      console.log('Request ID:', requestId);
      console.log('File name:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);
      
      // Validate that it's a PDF
      if (file.type !== 'application/pdf') {
        alert('Only PDF files are allowed.');
        setUploadingPdf(null);
        return;
      }

      // Validate size (10MB maximum)
      if (file.size > 10 * 1024 * 1024) {
        alert('The PDF file must not exceed 10MB.');
        setUploadingPdf(null);
        return;
      }

      // Create a unique name for the file
      const fileExt = file.name.split('.').pop();
      const fileName = `${EMPLOYEE_EXTERNAL_ID}_${requestId}_${Date.now()}.${fileExt}`;
      const filePath = fileName; // Save directly in the root of the bucket

      console.log('Uploading file:', fileName);
      console.log('File path:', filePath);

      // Upload the file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('prescription') // Bucket name in Supabase Storage (singular)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      console.log('Upload result:', { uploadData, uploadError });

      if (uploadError) {
        console.error('Error uploading PDF:', uploadError);
        // Type assertion to access additional error properties
        interface StorageErrorExtended {
          statusCode?: string | number;
          status?: string | number;
          error?: unknown;
        }
        
        const extendedError = uploadError as StorageErrorExtended;
        
        console.error('Error details:', {
          message: uploadError.message,
          statusCode: extendedError.statusCode || extendedError.status,
          error: extendedError.error
        });
        
        // Show more specific error message
        let errorMessage = 'Error uploading PDF.';
        if (uploadError.message) {
          errorMessage += `\n\nDetails: ${uploadError.message}`;
        }
        // Check the error status code
        const errorStatus = extendedError.statusCode || extendedError.status;
        if (errorStatus === '409' || errorStatus === 409) {
          errorMessage += '\n\nThe file already exists. Try with another name.';
        } else if (errorStatus === '413' || errorStatus === 413) {
          errorMessage += '\n\nThe file is too large.';
        } else if (errorStatus === '403' || errorStatus === 403) {
          errorMessage += '\n\nYou do not have permission to upload files. Check the bucket access policies.';
        }
        
        alert(errorMessage);
        setUploadingPdf(null);
        return;
      }

      // Save only the file name in ref_pdf
      // This is consistent with what I see in the database (only file names)
      const refPdfValue = fileName;

      console.log('Updating database with ref_pdf:', refPdfValue);
      console.log('Request ID:', requestId);

      // Update the ref_pdf and status fields in the database
      // If ref_pdf has a value, status must be "On process"
      const { data: updateData, error: updateError } = await supabase
        .from('leave_requests')
        .update({ 
          ref_pdf: refPdfValue,
          status: 'On process' // Update status when a PDF is uploaded
        })
        .eq('request_id', requestId)
        .select(); // Add .select() to see what was updated

      console.log('Update result:', { updateData, updateError });

      if (updateError) {
        console.error('Error updating ref_pdf:', updateError);
        console.error('Error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        
        let errorMessage = 'Error updating database.';
        if (updateError.message) {
          errorMessage += `\n\nDetails: ${updateError.message}`;
        }
        if (updateError.hint) {
          errorMessage += `\n\nHint: ${updateError.hint}`;
        }
        if (updateError.message?.includes('row-level security') || updateError.message?.includes('RLS')) {
          errorMessage += '\n\n⚠️ RLS policy issue: You need to configure policies that allow updating the leave_requests table.';
        }
        alert(errorMessage);
        setUploadingPdf(null);
        return;
      }

      // Verify that it was updated correctly
      if (!updateData || updateData.length === 0) {
        console.warn('No record found to update. Request ID:', requestId);
        alert(`Warning: No record found with request_id = ${requestId} to update.`);
        setUploadingPdf(null);
        return;
      }

      console.log('Database updated successfully. Updated rows:', updateData);

      // Update local state (ref_pdf and status)
      setLeaveRequests(prevRequests =>
        prevRequests.map(req =>
          req.request_id === requestId
            ? { ...req, ref_pdf: refPdfValue, status: 'On process' }
            : req
        )
      );

      console.log('PDF uploaded successfully!');
      alert('PDF uploaded successfully');
    } catch (error) {
      console.error('Error in PDF upload:', error);
      console.error('Error type:', typeof error);
      console.error('Error details:', error);
      
      let errorMessage = 'Error uploading PDF.';
      if (error instanceof Error) {
        errorMessage += `\n\nDetails: ${error.message}`;
      }
      alert(errorMessage);
    } finally {
      setUploadingPdf(null);
    }
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
    // If there's a status, use it; otherwise, use decision_source
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
              title={employee ? employee.name : 'User'}
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
                {/* User information */}
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

                {/* Logout button */}
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
                  Logout
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
          {/* TABLE VIEW */}
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
                    : 'General History'}
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
                    <div style={{ marginTop: '16px' }}>Loading...</div>
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
                              textAlign: 'center',
                              fontSize: '11px',
                              color: '#64748b',
                              fontWeight: '700',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            PDF
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
                              colSpan={9}
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
                            // Format dates
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
                                    textAlign: 'center',
                                  }}
                                >
                                  {request.ref_pdf ? (
                                    <a
                                      href={(() => {
                                        // Si ya es una URL completa, usarla directamente
                                        if (request.ref_pdf.startsWith('http://') || request.ref_pdf.startsWith('https://')) {
                                          return request.ref_pdf;
                                        }
                                        
                                        // Si es solo un nombre de archivo, construir la URL completa
                                        let fileName = request.ref_pdf.trim();
                                        
                                        // Si no tiene extensión, intentar agregar .pdf
                                        if (!fileName.includes('.')) {
                                          fileName = `${fileName}.pdf`;
                                        }
                                        
                                        const { data } = supabase.storage
                                          .from('prescription')
                                          .getPublicUrl(fileName);
                                        
                                        console.log('PDF URL constructed:', {
                                          original_ref_pdf: request.ref_pdf,
                                          processed_fileName: fileName,
                                          publicUrl: data.publicUrl
                                        });
                                        
                                        return data.publicUrl;
                                      })()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={async (e) => {
                                        // Verify that the file exists before opening
                                        if (request.ref_pdf && !request.ref_pdf.startsWith('http')) {
                                          e.preventDefault();
                                          
                                          const originalFileName = request.ref_pdf.trim();
                                          const fileName = originalFileName;
                                          
                                          // List all files in the bucket for debug
                                          const { data: allFiles, error: listError } = await supabase.storage
                                            .from('prescription')
                                            .list('', {
                                              limit: 100,
                                              offset: 0,
                                            });
                                          
                                          console.log('=== PDF File Debug ===');
                                          console.log('Original ref_pdf:', request.ref_pdf);
                                          console.log('Processed fileName:', fileName);
                                          console.log('Files in bucket:', allFiles);
                                          console.log('List error:', listError);
                                          
                                          if (listError) {
                                            console.error('Error listing files:', listError);
                                            alert(`Error accessing storage: ${listError.message}`);
                                            return;
                                          }
                                          
                                          // Search for the file flexibly
                                          let foundFile = allFiles?.find(file => 
                                            file.name === fileName || 
                                            file.name === originalFileName ||
                                            file.name.toLowerCase() === fileName.toLowerCase() ||
                                            file.name.toLowerCase() === originalFileName.toLowerCase()
                                          );
                                          
                                          // If not found exactly, search by similarity (normalizing similar characters)
                                          if (!foundFile) {
                                            // Normalize names: replace similar characters (I/l/1, O/0, etc.)
                                            const normalizeName = (name: string) => {
                                              return name
                                                .toLowerCase()
                                                .replace(/[il1]/g, '1')  // I, l, 1 -> 1
                                                .replace(/[o0]/g, '0')   // O, o, 0 -> 0
                                                .replace(/[s5]/g, '5')   // S, s, 5 -> 5
                                                .replace(/[z2]/g, '2')   // Z, z, 2 -> 2
                                                .replace(/[g6]/g, '6')   // G, g, 6 -> 6
                                                .replace(/[b8]/g, '8');  // B, b, 8 -> 8
                                            };
                                            
                                            const normalizedSearch = normalizeName(originalFileName);
                                            
                                            foundFile = allFiles?.find(file => {
                                              const normalizedFile = normalizeName(file.name);
                                              return normalizedFile === normalizedSearch ||
                                                     normalizedFile.includes(normalizedSearch) ||
                                                     normalizedSearch.includes(normalizedFile);
                                            });
                                          }
                                          
                                          // If still not found, search by initial number (more unique)
                                          if (!foundFile) {
                                            // Extract the initial number from the name (e.g., "434704698" from "434704698-37I736047-...")
                                            const initialNumberMatch = originalFileName.match(/^(\d+)/);
                                            if (initialNumberMatch) {
                                              const initialNumber = initialNumberMatch[1];
                                              foundFile = allFiles?.find(file => 
                                                file.name.startsWith(initialNumber)
                                              );
                                            }
                                          }
                                          
                                          // Last attempt: search by Levenshtein similarity (search by part of the name)
                                          if (!foundFile) {
                                            const searchName = originalFileName.replace('.pdf', '').toLowerCase();
                                            foundFile = allFiles?.find(file => {
                                              const fileNameLower = file.name.toLowerCase().replace('.pdf', '');
                                              // Search if at least 70% of the name matches
                                              const similarity = calculateSimilarity(searchName, fileNameLower);
                                              return similarity > 0.7 || 
                                                     fileNameLower.includes(searchName.substring(0, 10)) ||
                                                     searchName.includes(fileNameLower.substring(0, 10));
                                            });
                                          }
                                          
                                          // Helper function to calculate simple similarity
                                          function calculateSimilarity(str1: string, str2: string): number {
                                            const longer = str1.length > str2.length ? str1 : str2;
                                            const shorter = str1.length > str2.length ? str2 : str1;
                                            if (longer.length === 0) return 1.0;
                                            const distance = levenshteinDistance(longer, shorter);
                                            return (longer.length - distance) / longer.length;
                                          }
                                          
                                          function levenshteinDistance(str1: string, str2: string): number {
                                            const matrix: number[][] = [];
                                            for (let i = 0; i <= str2.length; i++) {
                                              matrix[i] = [i];
                                            }
                                            for (let j = 0; j <= str1.length; j++) {
                                              matrix[0][j] = j;
                                            }
                                            for (let i = 1; i <= str2.length; i++) {
                                              for (let j = 1; j <= str1.length; j++) {
                                                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                                                  matrix[i][j] = matrix[i - 1][j - 1];
                                                } else {
                                                  matrix[i][j] = Math.min(
                                                    matrix[i - 1][j - 1] + 1,
                                                    matrix[i][j - 1] + 1,
                                                    matrix[i - 1][j] + 1
                                                  );
                                                }
                                              }
                                            }
                                            return matrix[str2.length][str1.length];
                                          }
                                          
                                          if (!foundFile) {
                                            console.error('File not found in bucket:', {
                                              searched: fileName,
                                              original: request.ref_pdf,
                                              availableFiles: allFiles?.map(f => f.name)
                                            });
                                            
                                            const availableFilesList = allFiles?.map(f => f.name).join('\n') || 'None';
                                            alert(
                                              `PDF file not found in storage.\n\n` +
                                              `Searched: ${fileName}\n` +
                                              `Original: ${request.ref_pdf || 'N/A'}\n\n` +
                                              `Available files in bucket:\n${availableFilesList}\n\n` +
                                              `Check the console for more details.`
                                            );
                                            return;
                                          }
                                          
                                          // Use the exact name of the found file
                                          const actualFileName = foundFile.name;
                                          console.log('File found! Using:', actualFileName);
                                          
                                          // Build the URL and open
                                          const { data: urlData } = supabase.storage
                                            .from('prescription')
                                            .getPublicUrl(actualFileName);
                                          
                                          console.log('Opening PDF URL:', urlData.publicUrl);
                                          window.open(urlData.publicUrl, '_blank');
                                        }
                                      }}
                                  style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        backgroundColor: '#e0f2fe',
                                        color: '#0369a1',
                                        borderRadius: '6px',
                                        textDecoration: 'none',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#bae6fd';
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#e0f2fe';
                                        e.currentTarget.style.transform = 'scale(1)';
                                      }}
                                    >
                                      📄 View PDF
                                    </a>
                                  ) : (
                                    <label
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '6px 12px',
                                        backgroundColor: uploadingPdf === request.request_id ? '#f3f4f6' : '#f0f9ff',
                                        color: uploadingPdf === request.request_id ? '#6b7280' : '#0284c7',
                                        borderRadius: '6px',
                                        cursor: uploadingPdf === request.request_id ? 'not-allowed' : 'pointer',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        transition: 'all 0.2s ease',
                                        border: '1px solid #bae6fd',
                                      }}
                                      onMouseEnter={(e) => {
                                        if (uploadingPdf !== request.request_id) {
                                          e.currentTarget.style.backgroundColor = '#e0f2fe';
                                          e.currentTarget.style.transform = 'scale(1.05)';
                                        }
                                      }}
                                      onMouseLeave={(e) => {
                                        if (uploadingPdf !== request.request_id) {
                                          e.currentTarget.style.backgroundColor = '#f0f9ff';
                                          e.currentTarget.style.transform = 'scale(1)';
                                        }
                                      }}
                                    >
                                      {uploadingPdf === request.request_id ? (
                                        <>
                                          <span
                                            style={{
                                              display: 'inline-block',
                                              width: '12px',
                                              height: '12px',
                                              border: '2px solid #6b7280',
                                              borderTopColor: 'transparent',
                                              borderRadius: '50%',
                                              animation: 'spin 1s linear infinite',
                                            }}
                                          ></span>
                                          Uploading...
                                        </>
                                      ) : (
                                        <>
                                          📤 Upload PDF
                                          <input
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            style={{ display: 'none' }}
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) {
                                                if (file.type !== 'application/pdf') {
                                                  alert('Please select a PDF file');
                                                  return;
                                                }
                                                if (file.size > 10 * 1024 * 1024) {
                                                  alert('The file is too large. Maximum 10MB');
                                                  return;
                                                }
                                                handlePdfUpload(request.request_id, file);
                                              }
                                            }}
                                            disabled={uploadingPdf === request.request_id}
                                          />
                                        </>
                                      )}
                                    </label>
                                  )}
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
