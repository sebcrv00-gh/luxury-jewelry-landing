import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { CreditCard, Landmark, Smartphone, Banknote, ShieldCheck, Lock } from 'lucide-react';

const PAYMENT_METHODS = [
  { id: 'efectivo', label: 'Efectivo', desc: 'Pago contra entrega', icon: Banknote, color: '#2ecc71' },
  { id: 'tarjeta', label: 'Tarjeta Crédito / Débito', desc: 'Visa, Mastercard, Amex', icon: CreditCard, color: '#3498db' },
  { id: 'nequi', label: 'Nequi', desc: 'Billetera digital', icon: Smartphone, color: '#e91e63' },
];

export default function Checkout() {
  const { user, isLoggedIn } = useAuth();
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
  const [cardData, setCardData] = useState({ numero: '', titular: '', expiracion: '', cvv: '' });
  const [nequiData, setNequiData] = useState({ celular: '' });
  const currentPaymentMethod = PAYMENT_METHODS.find(m => m.id === paymentMethod) || PAYMENT_METHODS[0];

  const cartKey = isLoggedIn ? `carrito_${user.id}` : null;

  useEffect(() => {
    if (!isLoggedIn) { navigate('/login'); return; }
    if (cartKey) {
      const saved = JSON.parse(localStorage.getItem(cartKey) || '[]');
      if (saved.length === 0) { navigate('/carrito'); return; }
      setCart(saved.map(i => ({ ...i, cantidad: i.cantidad || 1 })));
    }
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

  // Card number formatting (xxxx xxxx xxxx xxxx)
  const formatCardNumber = (val) => {
    const nums = val.replace(/\D/g, '').slice(0, 16);
    return nums.replace(/(.{4})/g, '$1 ').trim();
  };

  // Expiration formatting (MM/YY)
  const formatExpiration = (val) => {
    const nums = val.replace(/\D/g, '').slice(0, 4);
    if (nums.length > 2) return nums.slice(0, 2) + '/' + nums.slice(2);
    return nums;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    setError('');

    // Validate payment data
    if (paymentMethod === 'tarjeta') {
      if (cardData.numero.replace(/\s/g, '').length < 16) { setError('Número de tarjeta inválido'); return; }
      if (!cardData.titular) { setError('Titular de la tarjeta requerido'); return; }
      if (cardData.expiracion.length < 5) { setError('Fecha de expiración inválida'); return; }
      if (cardData.cvv.length < 3) { setError('CVV inválido'); return; }
    } else if (paymentMethod === 'nequi') {
      if (nequiData.celular.replace(/\D/g, '').length < 10) { setError('Número de celular Nequi inválido'); return; }
    }

    setSending(true);
    try {
      const res = await api.post('/orders', {
        shipping,
        items: cart,
        metodo_pago: paymentMethod
      });
      setOrderResult({ ...res.data, metodo_pago: paymentMethod });
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

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
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
            <div className="checkout-actions" style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
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
              <div className="shipping-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '20px' }}>
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

              <div className="shipping-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '30px' }}>
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
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '28px', marginBottom: '24px' }}>
                <h3 className="checkout-title" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Lock size={18} style={{ color: 'var(--gold)' }}/> Método de Pago
                </h3>

                <div className="payment-methods-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  {PAYMENT_METHODS.map(pm => (
                    <button
                      type="button"
                      key={pm.id}
                      className={`payment-method-card ${paymentMethod === pm.id ? 'is-active' : ''}`}
                      onClick={() => setPaymentMethod(pm.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                        padding: '20px 16px', borderRadius: '12px', cursor: 'pointer',
                        background: paymentMethod === pm.id ? `${pm.color}12` : 'rgba(255,255,255,0.02)',
                        border: paymentMethod === pm.id ? `2px solid ${pm.color}` : '1px solid var(--border-subtle)',
                        transition: 'all 0.3s', position: 'relative',
                      }}
                    >
                      <pm.icon size={28} style={{ color: paymentMethod === pm.id ? pm.color : 'var(--text-muted)', transition: 'color 0.3s' }}/>
                      <span className="payment-method-name" style={{ fontSize: '0.82rem', fontWeight: 600, color: paymentMethod === pm.id ? '#fff' : 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.3 }}>{pm.label}</span>
                      <span className="payment-method-desc" style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textAlign: 'center' }}>{pm.desc}</span>
                      {paymentMethod === pm.id && (
                        <div style={{ position: 'absolute', top: '8px', right: '8px', width: '18px', height: '18px', borderRadius: '50%', background: pm.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShieldCheck size={11} style={{ color: '#fff' }}/>
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* ── Formulario Tarjeta ── */}
                {paymentMethod === 'tarjeta' && (
                  <div className="payment-card-form" style={{ background: 'linear-gradient(145deg, rgba(52,152,219,0.06), rgba(20,20,20,0.8))', border: '1px solid rgba(52,152,219,0.2)', borderRadius: '16px', padding: '28px', animation: 'cdFadeIn 0.35s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <CreditCard size={20} style={{ color: '#3498db' }}/>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>Información de Tarjeta</span>
                      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><Lock size={10}/> Cifrado SSL</span>
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.6rem' }}>Número de Tarjeta</label>
                      <input type="text" value={cardData.numero} onChange={e => setCardData({...cardData, numero: formatCardNumber(e.target.value)})} placeholder="0000 0000 0000 0000" maxLength={19} style={{ letterSpacing: '2px', fontSize: '1.05rem' }}/>
                    </div>
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.6rem' }}>Titular de la Tarjeta</label>
                      <input type="text" value={cardData.titular} onChange={e => setCardData({...cardData, titular: e.target.value.toUpperCase()})} placeholder="NOMBRE COMO APARECE EN LA TARJETA" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}/>
                    </div>
                    <div className="card-expiry-cvv-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <div className="form-group">
                        <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.6rem' }}>Expiración</label>
                        <input type="text" value={cardData.expiracion} onChange={e => setCardData({...cardData, expiracion: formatExpiration(e.target.value)})} placeholder="MM/YY" maxLength={5}/>
                      </div>
                      <div className="form-group">
                        <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.6rem' }}>CVV</label>
                        <input type="password" value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value.replace(/\D/g, '').slice(0, 4)})} placeholder="•••" maxLength={4}/>
                      </div>
                    </div>
                  </div>
                )}


                {/* ── Formulario Nequi ── */}
                {paymentMethod === 'nequi' && (
                  <div className="payment-nequi-form" style={{ background: 'linear-gradient(145deg, rgba(233,30,99,0.06), rgba(20,20,20,0.8))', border: '1px solid rgba(233,30,99,0.2)', borderRadius: '16px', padding: '28px', animation: 'cdFadeIn 0.35s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                      <Smartphone size={20} style={{ color: '#e91e63' }}/>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>Pago con Nequi</span>
                    </div>
                    <div className="form-group">
                      <label className="text-gold text-uppercase letter-spacing-lg" style={{ fontSize: '0.6rem' }}>Número de Celular Nequi</label>
                      <input type="tel" value={nequiData.celular} onChange={e => setNequiData({celular: e.target.value.replace(/\D/g, '').slice(0, 10)})} placeholder="3XX XXX XXXX" maxLength={10} style={{ letterSpacing: '2px', fontSize: '1.1rem' }}/>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '14px', lineHeight: 1.5 }}>
                      Al confirmar, recibirás una notificación push en tu app Nequi para autorizar el pago de <strong style={{ color: '#e91e63' }}>${total.toLocaleString('es-CO')}</strong>.
                    </p>
                  </div>
                )}

                {/* ── Efectivo Info ── */}
                {paymentMethod === 'efectivo' && (
                  <div className="payment-cash-info" style={{ background: 'linear-gradient(145deg, rgba(46,204,113,0.06), rgba(20,20,20,0.8))', border: '1px solid rgba(46,204,113,0.2)', borderRadius: '16px', padding: '28px', animation: 'cdFadeIn 0.35s ease' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <Banknote size={20} style={{ color: '#2ecc71' }}/>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.5px' }}>Pago Contra Entrega</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>
                      Pagarás <strong style={{ color: '#2ecc71' }}>${total.toLocaleString('es-CO')}</strong> directamente al repartidor en el momento de la entrega.
                      Asegúrate de tener el monto exacto disponible.
                    </p>
                  </div>
                )}
              </div>

              {/* Mini resumen */}
              <div className="checkout-mini-summary" style={{ background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
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

              <div className="checkout-actions" style={{ display: 'flex', gap: '12px', marginTop: '28px' }}>
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
