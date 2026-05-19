import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const COMPANY_EMAIL = 'luxuryjewellry95@gmail.com';

export default function FloatingContact() {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ 
    name: user?.nombre || '', 
    email: user?.email || '', 
    phone: '', 
    message: '' 
  });
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [sending, setSending] = useState(false);

  // Reiniciar/Pre-llenar el formulario cuando cambia la sesión (login/logout)
  useEffect(() => {
    setFormData({
      name: user?.nombre || '',
      email: user?.email || '',
      phone: '',
      message: ''
    });
    setStatus(null);
  }, [user, isLoggedIn]);

  // Prevenir scroll en el body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  function handleChange(e) {
    const { name, value } = e.target;

    // Validación para el número de teléfono
    if (name === 'phone') {
      const numericValue = value.replace(/[^0-9]/g, '');
      if (numericValue.length <= 10) {
        setFormData(prev => ({ ...prev, [name]: numericValue }));
      }
      return;
    }

    // Validación para el nombre (solo letras y espacios)
    if (name === 'name') {
      const lettersOnly = value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ\s]/g, '');
      setFormData(prev => ({ ...prev, [name]: lettersOnly }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    setStatus(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validación manual de correo (@)
    if (!formData.email.includes('@')) {
      setStatus('error');
      return;
    }

    setSending(true);

    try {
      // Agregamos un timeout de 10 segundos para evitar que se quede "Cargando" por siempre
      await api.post('/contact', formData, { timeout: 10000 });
      setStatus('success');
      setFormData({ name: user?.nombre || '', email: user?.email || '', phone: '', message: '' });
      setTimeout(() => setStatus(null), 5000);
    } catch (err) {
      console.error('Error enviando contacto:', err);
      setStatus('error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Botón flotante para abrir modal */}
      <button
        className="fc-toggle-btn"
        onClick={() => { 
          if (!isLoggedIn) {
            openAuthModal('login');
          } else {
            setIsOpen(true); 
            setStatus(null); 
          }
        }}
        aria-label="Abrir contacto"
        aria-expanded={isOpen}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22">
          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
        </svg>
        <span className="fc-btn-label">Contáctanos</span>
      </button>

      {/* Overlay / Modal Backdrop */}
      <div 
        className={`fc-backdrop${isOpen ? ' fc-backdrop--open' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      >
        {/* Panel emergente centrado */}
        <div
          className={`fc-panel${isOpen ? ' fc-panel--open' : ''}`}
          role="dialog"
          aria-label="Formulario de contacto"
          onClick={e => e.stopPropagation()} /* Evitar cerrar al hacer click dentro del panel */
        >
          {/* Cabecera del panel */}
          <div className="fc-panel-header">
            <div className="fc-header-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
            <div className="fc-header-texts">
              <h3 className="fc-panel-title">Contáctanos</h3>
              <p className="fc-panel-sub">Te responderemos a la brevedad</p>
            </div>
            {/* Botón de cierre */}
            <button 
              className="fc-close-btn" 
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar modal"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>

          {/* Formulario */}
          <form className="fc-form" onSubmit={handleSubmit} noValidate>
            <div className="fc-field">
              <label htmlFor="fc-name">Nombre</label>
              <input
                id="fc-name"
                type="text"
                name="name"
                placeholder="Tu nombre"
                value={formData.name}
                onChange={handleChange}
                required
                autoComplete="name"
              />
            </div>

            <div className="fc-field">
              <label htmlFor="fc-email">Correo electrónico</label>
              <input
                id="fc-email"
                type="email"
                name="email"
                placeholder="tu@correo.com"
                value={formData.email}
                onChange={handleChange}
                required
                autoComplete="email"
              />
            </div>

            <div className="fc-field">
              <label htmlFor="fc-phone">Teléfono</label>
              <input
                id="fc-phone"
                type="tel"
                name="phone"
                placeholder="Solo 10 números"
                value={formData.phone}
                onChange={handleChange}
                required
              />
            </div>

            <div className="fc-field">
              <label htmlFor="fc-message">Mensaje</label>
              <textarea
                id="fc-message"
                name="message"
                placeholder="¿En qué podemos ayudarte?"
                value={formData.message}
                onChange={handleChange}
                rows={4}
                required
              />
            </div>

            {status === 'error' && (
              <div className="fc-alert fc-alert--error">
                Hubo un error al enviar el mensaje. Verifica los datos o intenta más tarde.
              </div>
            )}

            {status === 'success' && (
              <div className="fc-alert fc-alert--success">
                ✓ Mensaje enviado correctamente. Te contactaremos pronto.
              </div>
            )}

            <button
              type="submit"
              className="fc-submit-btn"
              disabled={sending || !formData.name || !formData.email || !formData.message}
            >
              {sending ? 'Enviando…' : 'Enviar mensaje'}
            </button>

            <p className="fc-footer-note">
              Escríbenos también a{' '}
              <a 
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${COMPANY_EMAIL}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {COMPANY_EMAIL}
              </a>
            </p>
          </form>
        </div>
      </div>
    </>
  );
}
