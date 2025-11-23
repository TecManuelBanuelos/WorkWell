import React, { useEffect } from 'react';

// Definición de tipos para la configuración de Watsonx Orchestrate
interface WxoConfiguration {
  orchestrationID: string;
  hostURL: string;
  rootElementID: string;
  deploymentPlatform: string;
  crn: string;
  chatOptions: {
    agentId: string;
  };
}

// Definición del cargador para TypeScript
interface WxoLoader {
  init: () => void;
}

// Extender la interfaz global de Window para incluir las propiedades de Watson
declare global {
  interface Window {
    wxOConfiguration?: WxoConfiguration;
    wxoLoader?: WxoLoader;
  }
}

const Chatbot: React.FC = () => {
  useEffect(() => {
    // 1. Definir la configuración
    // NOTA: He cambiado rootElementID a 'watson-agent-root' para evitar conflictos con React
    window.wxOConfiguration = {
      orchestrationID: "28436f4764ec491e9b6b3797f94e6acc_b4b532d1-d810-4636-9d5e-faf7f5115865",
      hostURL: "https://us-south.watson-orchestrate.cloud.ibm.com",
      rootElementID: "watson-agent-root", 
      deploymentPlatform: "ibmcloud",
      crn: "crn:v1:bluemix:public:watsonx-orchestrate:us-south:a/28436f4764ec491e9b6b3797f94e6acc:b4b532d1-d810-4636-9d5e-faf7f5115865::",
      chatOptions: {
        agentId: "3a3b7ae4-2a86-4683-9bbc-61c47a25b98c",
      }
    };

    // 2. Cargar el script dinámicamente
    const scriptId = 'watson-orchestrate-script';
    
    // Verificamos si el script ya existe para no cargarlo dos veces (común en React Strict Mode)
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = `${window.wxOConfiguration.hostURL}/wxochat/wxoLoader.js?embed=true`;
      script.async = true;

      script.addEventListener('load', function () {
        // Inicializar el agente una vez cargado el script
        if (window.wxoLoader) {
          window.wxoLoader.init();
        }
      });

      document.head.appendChild(script);
    }

    // Opcional: Limpieza si el componente se desmonta (depende de si quieres destruir el chat)
    return () => {
        // Generalmente los scripts globales de chat persisten, 
        // pero si necesitas limpiar puedes eliminar el script o el contenido del div aquí.
    };
  }, []);

  // Este div debe coincidir con el rootElementID de la configuración
  return (
    <div 
      id="watson-agent-root" 
      style={{ width: '100%', height: '100%', minHeight: '500px' }}
    >
      {/* El agente de Watsonx se renderizará aquí dentro */}
    </div>
  );
};

export default Chatbot;