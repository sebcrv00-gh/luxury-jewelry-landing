import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

export default function Checkout() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [step, setStep] = useState(1); // 1 = resumen, 2 = datos envío, 3 = confirmación
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [orderResult, setOrderResult] = useState(null);

  const [shipping, setShipping] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    notas: ''
  });

  const cartKey = isLoggedIn ? `carrito_${user.id}` : null;

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    if (cartKey) {
      const saved = JSON.parse(localStorage.getItem(cartKey) || '[]');
      if (saved.length === 0) { navigate('/carrito'); return; }
      setCart(saved.map(i => ({ ...i, cantidad: i.cantidad || 1 })));
    }
    // Pre-fill from user profile
    if (user) {
      setShipping(prev => ({
        ...prev,
        nombre: user.nombre || '',
        telefono: user.telefono || '',
        direccion: user.direccion || ''
      }));
    }
  }, [isLoggedIn, cartKey, navigate, user]);

  const subtotal = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const shippingFee = 15000;
  const total = subtotal + shippingFee;

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await api.post('/orders', { shipping, items: cart });
      setOrderResult(res.data);
      // Vaciar carrito
      if (cartKey) localStorage.removeItem(cartKey);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar la orden');
    } finally {
      setSending(false);
    }
  };

  if (!isLoggedIn) return null;

  // ── Paso 3: Confirmación ──
  if (step === 3 && orderResult) {
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
            <div className="confirmation-row">
              <span className="text-muted">Estado</span>
              <span className="badge-premium badge-gold">Pendiente</span>
            </div>
          </div>

          <p className="text-muted" style={{ margin: '28px 0', fontSize: '0.85rem', lineHeight: 1.7 }}>
            Nos comunicaremos contigo al <strong style={{ color: 'var(--gold-light)' }}>{shipping.telefono}</strong> para
            coordinar la entrega en <strong style={{ color: 'var(--gold-light)' }}>{shipping.ciudad}</strong>.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/catalogo"><button className="btn-primary"><span>Seguir Comprando</span></button></Link>
            <Link to="/perfil"><button className="btn-outline">Mis Órdenes</button></Link>
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
            <span>Envío</span>
          </div>
          <div className="step-line"></div>
          <div className={`checkout-step ${step >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <span>Confirmación</span>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: '20px' }}>{error}</div>}

        {/* ── Paso 1: Resumen del Pedido ── */}
        {step === 1 && (
          <>
            <h3 className="checkout-title">Resumen de tu Pedido</h3>
            <div className="checkout-items">
              {cart.map((item, i) => (
                <div className="checkout-item" key={i}>
                  <div className="checkout-item-info">
                    <span className="checkout-item-name">{item.nombre}</span>
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
            <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
              <button className="btn-outline" style={{ flex: 1 }} onClick={() => navigate('/carrito')}>
                ← Volver al Carrito
              </button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => setStep(2)}>
                <span>Continuar →</span>
              </button>
            </div>
          </>
        )}

        {/* ── Paso 2: Datos de Envío ── */}
        {step === 2 && (
          <>
            <h3 className="checkout-title">Datos de Envío</h3>
            <form onSubmit={handleSubmitOrder}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Nombre Completo</label>
                  <input type="text" value={shipping.nombre} onChange={e => setShipping({ ...shipping, nombre: e.target.value })} placeholder="Nombre y apellido" required />
                </div>
                <div className="form-group">
                  <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Teléfono</label>
                  <input type="tel" value={shipping.telefono} onChange={e => setShipping({ ...shipping, telefono: e.target.value })} placeholder="+57 300 000 0000" required />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Dirección de Entrega</label>
                <input type="text" value={shipping.direccion} onChange={e => setShipping({ ...shipping, direccion: e.target.value })} placeholder="Calle, número, apartamento..." required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                <div className="form-group">
                  <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Ciudad</label>
                  <input type="text" value={shipping.ciudad} onChange={e => setShipping({ ...shipping, ciudad: e.target.value })} placeholder="Ej: Bogotá" required />
                </div>
                <div className="form-group">
                  <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.65rem' }}>Notas (opcional)</label>
                  <input type="text" value={shipping.notas} onChange={e => setShipping({ ...shipping, notas: e.target.value })} placeholder="Instrucciones especiales..." />
                </div>
              </div>

              {/* Mini resumen */}
              <div className="checkout-mini-summary" style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  <span>{cart.length} producto(s)</span>
                  <span>${subtotal.toLocaleString('es-CO')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  <span>Envío</span>
                  <span>${shippingFee.toLocaleString('es-CO')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--gold-light)', fontSize: '1.1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  <span>Total Final:</span>
                  <span>${total.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
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
