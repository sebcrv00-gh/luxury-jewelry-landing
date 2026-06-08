import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { Landmark, Banknote, ShieldCheck, Lock, FileDown } from 'lucide-react';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { POST_LOGIN_REDIRECT_KEY, readCart, clearCart } from '../utils/cartStorage';
import './checkout-page.css';

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', desc: 'Pago contra entrega', icon: Banknote, color: '#2ecc71' },
  { id: 'wompi', label: 'Wompi', desc: 'Pasarela digital segura en COP', icon: Landmark, color: '#7c5cff' },
];

export default function Checkout() {
  const { user, isLoggedIn, openAuthModal, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  const [shipping, setShipping] = useState({
    nombre: '', telefono: '', direccion: '', ciudad: '', notas: ''
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const currentPaymentMethod = PAYMENT_METHODS.find(m => m.id === paymentMethod) || PAYMENT_METHODS[0];
  const wompiPublicKeyConfigured = Boolean(import.meta.env.VITE_WOMPI_PUBLIC_KEY);
  const handleDownloadInvoice = () => {
    if (!orderResult) return;

    downloadInvoicePdf({
      order: {
        id: orderResult.orderId,
        creado_en: new Date().toISOString(),
        total: orderResult.total,
        costo_envio: shippingFee,
        nombre_envio: shipping.nombre,
        telefono_envio: shipping.telefono,
        direccion_envio: shipping.direccion,
        ciudad_envio: shipping.ciudad,
        notas: shipping.notas,
        estado: 'pendiente',
        metodo_pago: orderResult.metodo_pago,
        usuario_nombre: user?.nombre,
        usuario_email: user?.email,
        items: cart.map((item) => ({
          producto_nombre: item.color ? `${item.nombre} - ${item.color}` : item.nombre,
          producto_precio: item.precio,
          cantidad: item.cantidad,
          subtotal: item.precio * item.cantidad
        }))
      },
      customerName: user?.nombre || shipping.nombre,
      customerEmail: user?.email,
      paymentLabel: currentPaymentMethod.label,
      generatedBy: user?.nombre || 'Cliente'
    });
  };

  const cartUserId = isLoggedIn ? user?.id : null;

  useEffect(() => {
    const saved = readCart(cartUserId);
    if (saved.length === 0) { navigate('/carrito'); return; }
    setCart(saved);

    if (user) {
      setShipping(prev => ({
        ...prev,
        nombre: user.nombre || '',
        telefono: user.telefono || '',
        direccion: user.direccion || ''
      }));
    }
  }, [cartUserId, navigate, user]);

  const subtotal = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const shippingFee = 15000;
  const total = subtotal + shippingFee;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');

    setSending(true);
    try {
      const res = await api.post('/orders', {
        shipping,
        items: cart,
        metodo_pago: paymentMethod
      });
      if (res.data?.freeShippingApplied) {
        try { await refreshUser(); } catch {}
      }
      setOrderResult({ ...res.data, metodo_pago: paymentMethod });
      clearCart(cartUserId);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar la orden');
    } finally {
      setSending(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="checkout-page">
        <div className="checkout-box" style={{ textAlign: 'center' }}>
          <div className="confirmation-icon" style={{ marginBottom: '20px' }}>
            <Lock size={24} />
          </div>
          <h2>Acceso Requerido Para Pagar</h2>
          <p className="text-muted" style={{ margin: '18px auto 30px', maxWidth: '520px', lineHeight: 1.7 }}>
            Tu cotizacion ya esta lista en el carrito. Para continuar con el pago, confirma tu cuenta iniciando sesion o registrandote.
          </p>
          <div className="checkout-access-actions">
            <button
              className="btn-primary"
              onClick={() => {
                localStorage.setItem(POST_LOGIN_REDIRECT_KEY, '/checkout');
                openAuthModal('login');
              }}
            >
              <span>Iniciar sesion</span>
            </button>
            <button
              className="btn-outline"
              onClick={() => {
                localStorage.setItem(POST_LOGIN_REDIRECT_KEY, '/checkout');
                openAuthModal('register');
              }}
            >
              Crear cuenta
            </button>
            <button className="btn-outline" onClick={() => navigate('/carrito')}>
              Volver al carrito
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Paso 3: Confirmación ──
  if (step === 3 && orderResult) {
    const pm = PAYMENT_METHODS.find(m => m.id === orderResult.metodo_pago) || PAYMENT_METHODS[0];
    return (
      <div className="checkout-page">
        <div className="checkout-box confirmation-box">
          <div className="confirmation-icon">✦</div>
          <h2>¡Orden Confirmada!</h2>
          <p className="text-muted" style={{ marginBottom: '30px', fontSize: '0.95rem' }}>
            Tu pedido ha sido registrado exitosamente en nuestro sistema.
          </p>

          <div className="confirmation-details">
            <div className="confirmation-row">
              <span className="text-muted">N° de Orden</span>
              <span className="text-gold" style={{ fontSize: '1.4rem', fontWeight: 700 }}>#{String(orderResult.orderId).padStart(5, '0')}</span>
            </div>
            <div className="confirmation-row">
              <span className="text-muted">Total Pagado</span>
              <span className="text-gold-light" style={{ fontSize: '1.2rem', fontWeight: 600 }}>${Number(orderResult.total).toLocaleString('es-CO')}</span>
            </div>
            {orderResult.freeShippingApplied && (
              <div className="confirmation-row">
                <span className="text-muted">Envío</span>
                <span className="badge-premium badge-gold">Gratis (primer pedido)</span>
              </div>
            )}
            <div className="confirmation-row">
              <span className="text-muted">Método de Pago</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: pm.color, fontWeight: 600 }}>
                <pm.icon size={16}/> {pm.label}
              </span>
            </div>
            <div className="confirmation-row">
              <span className="text-muted">Estado</span>
              <span className="badge-premium badge-gold">Pendiente</span>
            </div>
          </div>

          <p className="text-muted" style={{ margin: '28px 0', fontSize: '0.85rem', lineHeight: 1.7 }}>
            Nos comunicaremos contigo al <strong style={{ color: 'var(--gold-light)' }}>{shipping.telefono}</strong> para
            coordinar la entrega en <strong style={{ color: 'var(--gold-light)' }}>{shipping.ciudad}</strong>.
          </p>

          <div className="checkout-confirmation-actions">
            <button className="btn-outline" onClick={handleDownloadInvoice} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <FileDown size={16} /> Imprimir factura en PDF
            </button>
            <Link to="/catalogo"><button className="btn-primary"><span>Seguir Comprando</span></button></Link>
            <Link to="/mi-cuenta/pedidos"><button className="btn-outline">Mis Órdenes</button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="checkout-box">
        {/* ── Progress Steps ── */}
        <div className="checkout-steps">
          <div className={`checkout-step ${step >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <span>Resumen</span>
          </div>
          <div className="step-line"></div>
          <div className={`checkout-step ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <span>Envío y Pago</span>
          </div>
          <div className="step-line"></div>
          <div className={`checkout-step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <span>Confirmación</span>
          </div>
        </div>

        {error && <div className="auth-alert auth-alert-error" style={{ marginTop: '20px' }}><span>⚠</span> {error}</div>}

        {/* ── Paso 1: Resumen del Pedido ── */}
        {step === 1 && (
          <>
            <h3 className="checkout-title">Resumen de tu Pedido</h3>
            <div className="checkout-items">
              {cart.map((item, i) => (
                <div className="checkout-item" key={i}>
                  <div className="checkout-item-info">
                    <span className="checkout-item-name">{item.nombre}</span>
                    {item.color && (
                      <span className="text-gold" style={{ fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                        Color: {item.color}
                      </span>
                    )}
                    <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                      Cantidad: {item.cantidad}
                    </span>
                  </div>
                  <span className="checkout-item-price">
                    ${(item.precio * item.cantidad).toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
            </div>
            <div className="checkout-summary-details" style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '20px', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-muted)' }}>
                <span>Subtotal</span>
                <span>${subtotal.toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-muted)' }}>
                <span>Envío</span>
                <span>${shippingFee.toLocaleString('es-CO')}</span>
              </div>
              <div className="checkout-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.4rem', fontWeight: 700, marginTop: '10px' }}>
                <span>Total</span>
                <span>${total.toLocaleString('es-CO')}</span>
              </div>
            </div>
            <div className="checkout-actions checkout-actions-row">
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => navigate('/carrito')}>
                ← Volver al Carrito
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setStep(2)}>
                <span>Continuar →</span>
              </button>
            </div>
          </>
        )}

        {/* ── Paso 2: Datos de Envío + Método de Pago ── */}
        {step === 2 && (
          <>
            <h3 className="checkout-title">Datos de Envío</h3>
            <form onSubmit={handleSubmitOrder}>
              <div className="shipping-form-grid checkout-shipping-grid checkout-shipping-grid--compact">
                <div className="form-group">
                  <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Nombre Completo</label>
                  <input type="text" value={shipping.nombre} onChange={e => setShipping({ ...shipping, nombre: e.target.value })} placeholder="Nombre y apellido" required />
                </div>
                <div className="form-group">
                  <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Teléfono</label>
                  <input type="tel" value={shipping.telefono} onChange={e => setShipping({ ...shipping, telefono: e.target.value })} placeholder="+57 300 000 0000" required />
                </div>
              </div>

              <div className="form-group checkout-field-block">
                <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Dirección de Entrega</label>
                <input type="text" value={shipping.direccion} onChange={e => setShipping({ ...shipping, direccion: e.target.value })} placeholder="Calle, número, apartamento..." required />
              </div>

              <div className="shipping-form-grid checkout-shipping-grid checkout-shipping-grid--wide">
                <div className="form-group">
                  <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Ciudad</label>
                  <input type="text" value={shipping.ciudad} onChange={e => setShipping({ ...shipping, ciudad: e.target.value })} placeholder="Ej: Bogotá" required />
                </div>
                <div className="form-group">
                  <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Notas (opcional)</label>
                  <input type="text" value={shipping.notas} onChange={e => setShipping({ ...shipping, notas: e.target.value })} placeholder="Instrucciones especiales..." />
                </div>
              </div>

              {/* ═══ MÉTODO DE PAGO ═══ */}
              <div className="checkout-payment-section">
                <h3 className="checkout-title checkout-payment-title">
                  <Lock size={18} className="checkout-payment-lock" /> Método de Pago
                </h3>

                <div className="payment-methods-grid checkout-payment-methods-grid">
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      type="button"
                      key={pm.id}
                      className={`payment-method-card checkout-payment-method-card ${paymentMethod === pm.id ? 'is-active' : ''}`}
                      onClick={() => setPaymentMethod(pm.id)}
                      style={{ '--payment-accent': pm.color, '--payment-active-bg': `${pm.color}12` }}
                    >
                      <pm.icon size={28} className="checkout-payment-method-icon" />
                      <span className="payment-method-name checkout-payment-method-name">{pm.label}</span>
                      <span className="payment-method-desc checkout-payment-method-desc">{pm.desc}</span>
                      {paymentMethod === pm.id && (
                        <div className="checkout-payment-method-badge">
                          <ShieldCheck size={11} className="checkout-payment-method-badge-icon" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {paymentMethod === 'wompi' && (
                  <div className="checkout-payment-panel checkout-payment-panel--card">
                    <div className="checkout-payment-panel-head">
                      <div className="checkout-payment-panel-title">
                        <Landmark size={20} className="checkout-payment-panel-icon" />
                        <span>Pago digital con Wompi</span>
                      </div>
                      <span className="checkout-payment-panel-security"><Lock size={10}/> Pasarela segura</span>
                    </div>

                    <p className="checkout-payment-panel-note">
                      Seleccionas una pasarela confiable, moderna y alineada con una experiencia premium.
                      Tu pedido quedará registrado con Wompi como método elegido por un total de <strong className="checkout-payment-amount" style={{ color: '#b8a2ff' }}>${total.toLocaleString('es-CO')}</strong>.
                    </p>
                    <div style={{ display: 'grid', gap: '10px', marginTop: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(124, 92, 255, 0.08)', border: '1px solid rgba(124, 92, 255, 0.18)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Moneda</span>
                        <strong style={{ color: '#d4c8ff' }}>{import.meta.env.VITE_WOMPI_CURRENCY || 'COP'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Estado de configuración</span>
                        <strong style={{ color: wompiPublicKeyConfigured ? '#7CFC98' : '#f5c96b' }}>
                          {wompiPublicKeyConfigured ? 'Clave pública detectada' : 'Pendiente de credenciales'}
                        </strong>
                      </div>
                    </div>
                    <p className="checkout-payment-panel-note" style={{ marginTop: '14px' }}>
                      Esta interfaz ya quedó preparada para operar con Wompi en Render. Cuando cargues las credenciales reales, el siguiente paso será conectar la creación del checkout seguro y la confirmación de transacción.
                    </p>
                  </div>
                )}

                {/* ── Efectivo Info ── */}
                {paymentMethod === 'efectivo' && (
                  <div className="payment-cash-info checkout-payment-panel checkout-payment-panel--cash">
                    <div className="checkout-payment-panel-head checkout-payment-panel-head--compact">
                      <div className="checkout-payment-panel-title">
                        <Banknote size={20} className="checkout-payment-panel-icon checkout-payment-panel-icon--cash" />
                        <span>Pago Contra Entrega</span>
                      </div>
                    </div>
                    <p className="checkout-payment-panel-note checkout-payment-panel-note--compact">
                      Pagaras <strong className="checkout-payment-amount checkout-payment-amount--cash">${total.toLocaleString('es-CO')}</strong> directamente al repartidor en el momento de la entrega.
                      Asegurate de tener el monto exacto disponible.
                    </p>
                  </div>
                )}
              </div>

              {/* Mini resumen */}
              <div className="checkout-mini-summary checkout-mini-summary-box">
                <div className="checkout-mini-summary-row">
                  <span className="checkout-mini-summary-label">{cart.length} producto(s)</span>
                  <span className="checkout-mini-summary-value">${subtotal.toLocaleString('es-CO')}</span>
                </div>
                <div className="checkout-mini-summary-row">
                  <span className="checkout-mini-summary-label">Envío</span>
                  <span className="checkout-mini-summary-value">${shippingFee.toLocaleString('es-CO')}</span>
                </div>
                <div className="checkout-mini-summary-row">
                  <span className="checkout-mini-summary-label">Método</span>
                  <span className="checkout-mini-summary-value" style={{ color: currentPaymentMethod.color }}>{currentPaymentMethod.label}</span>
                </div>
                <div className="checkout-mini-summary-total">
                  <span>Total Final:</span>
                  <span>${total.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="checkout-actions checkout-actions-row">
                <button type="button" className="btn-outline" style={{ flex: 1 }} onClick={() => setStep(1)}>
                  ← Volver
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={sending}>
                  <span>{sending ? 'Procesando...' : 'Confirmar Pedido'}</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
