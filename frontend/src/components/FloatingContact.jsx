import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Star, ShoppingBag, MessageSquareText, ShieldAlert } from 'lucide-react';

const COMPANY_EMAIL = 'luxuryjewellry95@gmail.com';

export default function FloatingContact() {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('site');
  const [siteCategory, setSiteCategory] = useState('comentario');
  const [formData, setFormData] = useState({
    name: user?.nombre || '',
    email: user?.email || '',
    phone: '',
    message: ''
  });
  const [reviewForm, setReviewForm] = useState({
    orderItemId: '',
    calificacion: 0,
    comentario: ''
  });
  const [reviewableItems, setReviewableItems] = useState([]);
  const [loadingReviewables, setLoadingReviewables] = useState(false);
  const [status, setStatus] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setFormData({
      name: user?.nombre || '',
      email: user?.email || '',
      phone: '',
      message: ''
    });
    setReviewForm({ orderItemId: '', calificacion: 0, comentario: '' });
    setSiteCategory('comentario');
    setMode('site');
    setStatus(null);
  }, [user, isLoggedIn]);

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

  useEffect(() => {
    if (!isOpen || mode !== 'review' || !isLoggedIn) return;

    let ignore = false;
    const loadEligibleReviews = async () => {
      setLoadingReviewables(true);
      try {
        const { data } = await api.get('/reviews/eligible');
        if (!ignore) {
          setReviewableItems(data);
          if (!reviewForm.orderItemId && data.length > 0) {
            setReviewForm(prev => ({ ...prev, orderItemId: String(data[0].order_item_id) }));
          }
        }
      } catch (err) {
        if (!ignore) {
          setStatus({ type: 'error', text: 'No fue posible cargar tus compras entregadas para reseñar.' });
        }
      } finally {
        if (!ignore) setLoadingReviewables(false);
      }
    };

    loadEligibleReviews();
    return () => { ignore = true; };
  }, [isOpen, mode, isLoggedIn]);

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

  async function handleSiteSubmit(e) {
    e.preventDefault();

    if (!formData.email.includes('@')) {
      setStatus({ type: 'error', text: 'Ingresa un correo electrónico válido.' });
      return;
    }

    setSending(true);

    try {
      const { data } = await api.post('/contact', { ...formData, category: siteCategory }, { timeout: 10000 });
      setStatus({
        type: 'success',
        text: data.message || 'Tu mensaje fue enviado correctamente. Nuestro equipo lo revisara pronto.'
      });
      setFormData({ name: user?.nombre || '', email: user?.email || '', phone: '', message: '' });
      setTimeout(() => setStatus(null), 5000);
    } catch (err) {
      console.error('Error enviando contacto:', err);
      setStatus({ type: 'error', text: err.response?.data?.error || 'Hubo un error al enviar el mensaje.' });
    } finally {
      setSending(false);
    }
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();

    if (!reviewForm.orderItemId) {
      setStatus({ type: 'error', text: 'Selecciona un producto entregado para dejar tu reseña.' });
      return;
    }

    if (!reviewForm.calificacion) {
      setStatus({ type: 'error', text: 'Selecciona una calificación de 1 a 5 estrellas.' });
      return;
    }

    if (!reviewForm.comentario.trim()) {
      setStatus({ type: 'error', text: 'Escribe tu reseña antes de publicarla.' });
      return;
    }

    setSending(true);
    try {
      const { data } = await api.post('/reviews', {
        orderItemId: Number(reviewForm.orderItemId),
        calificacion: reviewForm.calificacion,
        comentario: reviewForm.comentario
      });
      setStatus({ type: 'success', text: data.message || 'Reseña publicada correctamente.' });
      setReviewForm({ orderItemId: '', calificacion: 0, comentario: '' });
      const { data: eligible } = await api.get('/reviews/eligible');
      setReviewableItems(eligible);
      setReviewForm(prev => ({
        ...prev,
        orderItemId: eligible[0] ? String(eligible[0].order_item_id) : '',
        calificacion: 0,
        comentario: ''
      }));
    } catch (err) {
      setStatus({ type: 'error', text: err.response?.data?.error || 'No fue posible publicar la reseña.' });
    } finally {
      setSending(false);
    }
  }

  const selectedReviewItem = reviewableItems.find(item => String(item.order_item_id) === String(reviewForm.orderItemId));

  return (
    <>
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

      <div
        className={`fc-backdrop${isOpen ? ' fc-backdrop--open' : ''}`}
        onClick={() => setIsOpen(false)}
        aria-hidden={!isOpen}
      >
        <div
          className={`fc-panel${isOpen ? ' fc-panel--open' : ''}`}
          role="dialog"
          aria-label="Formulario de contacto"
          onClick={e => e.stopPropagation()}
        >
          <div className="fc-panel-header">
            <div className="fc-header-icon">
              <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
            </div>
            <div className="fc-header-texts">
              <h3 className="fc-panel-title">{mode === 'review' ? 'Calificar producto' : 'Contáctanos'}</h3>
              <p className="fc-panel-sub">
                {mode === 'review'
                  ? 'Valora una compra entregada y publica tu experiencia'
                  : 'Envíanos un comentario o reporte sobre tu experiencia en el sitio'}
              </p>
            </div>
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

          <div className="fc-form">
            <div className="fc-mode-switch">
              <button
                type="button"
                className={`fc-mode-btn ${mode === 'review' ? 'active' : ''}`}
                onClick={() => { setMode('review'); setStatus(null); }}
              >
                <ShoppingBag size={16} />
                <span>Calificar producto</span>
              </button>
              <button
                type="button"
                className={`fc-mode-btn ${mode === 'site' ? 'active' : ''}`}
                onClick={() => { setMode('site'); setStatus(null); }}
              >
                <MessageSquareText size={16} />
                <span>Comentario o reporte</span>
              </button>
            </div>

            {mode === 'review' ? (
              <form onSubmit={handleReviewSubmit} noValidate>
                <div className="fc-panel-note">
                  Solo puedes reseñar productos pertenecientes a pedidos marcados como entregados.
                </div>

                {loadingReviewables ? (
                  <div className="fc-empty-state">Cargando productos disponibles para reseña...</div>
                ) : reviewableItems.length === 0 ? (
                  <div className="fc-empty-state">
                    Aún no tienes productos entregados pendientes por reseñar.
                  </div>
                ) : (
                  <>
                    <div className="fc-field">
                      <label htmlFor="fc-review-order-item">Producto comprado</label>
                      <select
                        id="fc-review-order-item"
                        className="fc-select"
                        value={reviewForm.orderItemId}
                        onChange={e => setReviewForm(prev => ({ ...prev, orderItemId: e.target.value }))}
                        required
                      >
                        <option value="">Selecciona un producto entregado...</option>
                        {reviewableItems.map(item => (
                          <option key={item.order_item_id} value={item.order_item_id}>
                            Pedido #{item.orden_id} - {item.producto_nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedReviewItem && (
                      <div className="fc-review-selected">
                        <strong>{selectedReviewItem.producto_nombre}</strong>
                        <span>
                          Pedido #{selectedReviewItem.orden_id} · {new Date(selectedReviewItem.order_date).toLocaleDateString('es-CO')}
                        </span>
                      </div>
                    )}

                    <div className="fc-field">
                      <label>Calificación</label>
                      <div className="fc-rating-stars" role="radiogroup" aria-label="Calificación del producto">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button
                            key={star}
                            type="button"
                            className={`fc-star-btn ${reviewForm.calificacion >= star ? 'active' : ''}`}
                            onClick={() => setReviewForm(prev => ({ ...prev, calificacion: star }))}
                            aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                          >
                            <Star size={20} fill={reviewForm.calificacion >= star ? 'currentColor' : 'none'} />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="fc-field">
                      <label htmlFor="fc-review-comment">Reseña del producto</label>
                      <textarea
                        id="fc-review-comment"
                        name="comentario"
                        placeholder="Comparte cómo fue tu experiencia con esta pieza y el pedido recibido."
                        value={reviewForm.comentario}
                        onChange={e => setReviewForm(prev => ({ ...prev, comentario: e.target.value }))}
                        rows={5}
                        required
                      />
                    </div>
                  </>
                )}

                {status?.type === 'error' && (
                  <div className="fc-alert fc-alert--error">
                    {status.text}
                  </div>
                )}

                {status?.type === 'success' && (
                  <div className="fc-alert fc-alert--success">
                    {status.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="fc-submit-btn"
                  disabled={sending || loadingReviewables || reviewableItems.length === 0}
                >
                  {sending ? 'Publicando...' : 'Publicar reseña'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSiteSubmit} noValidate>
                <div className="fc-field">
                  <label htmlFor="fc-site-category">Tipo de mensaje</label>
                  <div className="fc-type-grid">
                    <button
                      type="button"
                      className={`fc-type-btn ${siteCategory === 'comentario' ? 'active' : ''}`}
                      onClick={() => setSiteCategory('comentario')}
                    >
                      <MessageSquareText size={16} />
                      <span>Comentario</span>
                    </button>
                    <button
                      type="button"
                      className={`fc-type-btn ${siteCategory === 'reporte' ? 'active' : ''}`}
                      onClick={() => setSiteCategory('reporte')}
                    >
                      <ShieldAlert size={16} />
                      <span>Reporte</span>
                    </button>
                  </div>
                </div>

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
                    placeholder="Opcional"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="fc-field">
                  <label htmlFor="fc-message">
                    {siteCategory === 'reporte' ? 'Describe el problema' : 'Tu comentario'}
                  </label>
                  <textarea
                    id="fc-message"
                    name="message"
                    placeholder={siteCategory === 'reporte'
                      ? 'Cuéntanos qué error o comportamiento encontraste en la página.'
                      : 'Comparte tu comentario sobre la experiencia en el sitio.'}
                    value={formData.message}
                    onChange={handleChange}
                    rows={5}
                    required
                  />
                </div>

                {status?.type === 'error' && (
                  <div className="fc-alert fc-alert--error">
                    {status.text}
                    <div style={{ marginTop: '10px' }}>
                      <a
                        href={`https://mail.google.com/mail/?view=cm&fs=1&to=${COMPANY_EMAIL}&su=Contacto: ${formData.name}&body=${encodeURIComponent(formData.message)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="fc-fallback-link"
                        style={{ color: 'var(--gold-light)', textDecoration: 'underline', fontWeight: 'bold' }}
                      >
                        Enviar por correo directo (Gmail)
                      </a>
                    </div>
                  </div>
                )}

                {status?.type === 'success' && (
                  <div className="fc-alert fc-alert--success">
                    {status.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="fc-submit-btn"
                  disabled={sending || !formData.name || !formData.email || !formData.message}
                >
                  {sending ? 'Enviando...' : 'Enviar mensaje'}
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}
