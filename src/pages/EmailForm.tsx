import { useState } from 'react';

interface EmailData {
  to_email: string;
  subject: string;
  message: string;
}

export default function EmailForm() {
  const [formData, setFormData] = useState<EmailData>({
    to_email: '',
    subject: '',
    message: ''
  });
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [responseMsg, setResponseMsg] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      // Asegúrate de que esta URL coincida con el puerto de tu backend
      const response = await fetch('http://127.0.0.1:8000/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setResponseMsg(`¡Correo enviado! ID: ${data.id}`);
        setFormData({ to_email: '', subject: '', message: '' }); // Limpiar form
      } else {
        throw new Error(data.detail || 'Error al enviar');
      }
    } catch (error) {
      setStatus('error');
      setResponseMsg(error instanceof Error ? error.message : 'Error desconocido');
    }
  };

  return (
    <div className="email-form-container">
      <h2>Enviar Correo via Resend</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Destinatario:</label>
          <input
            type="email"
            name="to_email"
            value={formData.to_email}
            onChange={handleChange}
            placeholder="nombre@ejemplo.com"
            required
          />
        </div>

        <div className="form-group">
          <label>Asunto:</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Asunto importante"
            required
          />
        </div>

        <div className="form-group">
          <label>Mensaje:</label>
          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows={4}
            placeholder="Escribe tu mensaje aquí..."
            required
          />
        </div>

        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Enviando...' : 'Enviar Correo'}
        </button>
      </form>

      {status === 'success' && <p style={{ color: 'green' }}>{responseMsg}</p>}
      {status === 'error' && <p style={{ color: 'red' }}>Error: {responseMsg}</p>}
    </div>
  );
}