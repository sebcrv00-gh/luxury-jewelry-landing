import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, X } from 'lucide-react';
import { POST_LOGIN_REDIRECT_KEY, readCart, writeCart } from '../utils/cartStorage';

const BASE_SHIPPING_FEE = 15000;

function hasAvailableFirstShipping(user) {
  if (!user) return false;
  if (typeof user.primer_envio_gratis_disponible === 'boolean') {
    return user.primer_envio_gratis_disponible;
  }

  return Number(user.primer_envio_gratis_usado || 0) === 0 && Number(user.total_pedidos || 0) === 0;
}

export default function Cart() {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);

  const cartUserId = isLoggedIn ? user?.id : null;

  useEffect(() => {
    setCart(readCart(cartUserId));
  }, [cartUserId]);

  const save = (newCart) => {
    setCart(newCart);
    writeCart(cartUserId, newCart);
  };

  const changeQty = (index, delta) => {
    const updated = [...cart];
    const item = updated[index];
    const newQty = item.cantidad + delta;
    
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      const maxStock = item.stock !== undefined ? item.stock : Infinity;
      item.cantidad = Math.min(newQty, maxStock);
    }
    save(updated);
  };

  const remove = (index) => {
    const updated = [...cart];
    updated.splice(index, 1);
    save(updated);
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const requestClearCart = () => setShowClearConfirm(true);

  const confirmClearCart = () => {
    save([]);
    setShowClearConfirm(false);
  };

  const subtotal = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);
  const hasFreeShippingAvailable = isLoggedIn && hasAvailableFirstShipping(user);
  const shippingFee = hasFreeShippingAvailable ? 0 : BASE_SHIPPING_FEE;
  const total = subtotal + shippingFee;

  const handleProceedToCheckout = () => {
    if (!isLoggedIn) {
      localStorage.setItem(POST_LOGIN_REDIRECT_KEY, '/checkout');
      openAuthModal('login');
      return;
    }

    navigate('/checkout');
  };

  return (
    <div className="cart-container">
      <div className="cart-box">
        <h3>Tu Carrito de Compras</h3>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '35px' }}>
          {isLoggedIn
            ? 'Revisa tus productos exclusivos antes de finalizar la compra'
            : 'Cotiza tus productos favoritos como visitante y autentificate solo al momento de pagar'}
        </p>

        {cart.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
            Tu carrito está vacío.
          </p>
        ) : (
          <>
            {cart.map((item, i) => (
              <div className="cart-item" key={i}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className="cart-item-name">{item.nombre}</span>
                  {item.color && (
                    <span style={{ color: 'var(--gold)', fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase' }}>
                      Color: {item.color}
                    </span>
                  )}
                </div>
                <span className="cart-item-price">${item.precio.toLocaleString('es-CO')}</span>
                <div className="cart-item-qty">
                  <button className="qty-btn" onClick={() => changeQty(i, -1)}>-</button>
                  <span style={{ fontWeight: 600 }}>{item.cantidad}</span>
                  <button 
                    className="qty-btn" 
                    onClick={() => changeQty(i, 1)}
                    disabled={item.stock !== undefined && item.cantidad >= item.stock}
                    style={item.stock !== undefined && item.cantidad >= item.stock ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                    title={item.stock !== undefined && item.cantidad >= item.stock ? "Stock máximo alcanzado" : ""}
                  >+</button>
                </div>
                <span className="cart-item-subtotal">${(item.precio * item.cantidad).toLocaleString('es-CO')}</span>
                <button className="btn-danger" onClick={() => remove(i)} style={{ padding: '4px 12px' }}>X</button>
              </div>
            ))}

            <div className="cart-summary-details" style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '20px', paddingTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span>${subtotal.toLocaleString('es-CO')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-muted)' }}>
                <span>Envío:</span>
                <span style={shippingFee === 0 ? { color: 'var(--gold-light)', fontWeight: 700 } : undefined}>
                  {shippingFee === 0 ? 'Gratis' : `$${shippingFee.toLocaleString('es-CO')}`}
                </span>
              </div>
              <div className="cart-total" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', marginTop: '10px' }}>
                <span>Total:</span>
                <span>${total.toLocaleString('es-CO')}</span>
              </div>
            </div>
            {hasFreeShippingAvailable && (
              <div style={{ marginTop: '18px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Detectamos que tu cuenta aún tiene disponible el <strong style={{ color: 'var(--gold-light)' }}>primer envío gratis</strong>. El beneficio se aplicará automáticamente al finalizar la compra.
              </div>
            )}

            <div className="cart-actions">
              <button className="btn-danger" onClick={requestClearCart} style={{ borderRadius: '50px', padding: '12px 24px' }}>Vaciar carrito</button>
              <button className="btn-primary" onClick={handleProceedToCheckout} style={{ borderRadius: '50px' }}>
                <span>{isLoggedIn ? 'Proceder al Pago' : 'Inicia sesion para pagar'}</span>
              </button>
            </div>
            {!isLoggedIn && (
              <div style={{ marginTop: '18px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.18)', color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Puedes usar este carrito como cotizacion. Cuando decidas continuar al pago, te pediremos iniciar sesion o crear tu cuenta.
              </div>
            )}
          </>
        )}
      </div>

      {showClearConfirm && (
        <>
          <div className="overlay" style={{ backdropFilter: 'blur(10px)', background: 'rgba(8, 8, 8, 0.85)', zIndex: 9999 }} onClick={() => setShowClearConfirm(false)} />
          <div className="cart-confirm-modal" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000,
            background: 'linear-gradient(145deg, rgba(20, 20, 20, 0.95), rgba(12, 12, 12, 0.98))',
            borderRadius: '16px', border: '1px solid rgba(231, 76, 60, 0.3)', padding: '48px',
            width: '90%', maxWidth: '440px', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            <button onClick={() => setShowClearConfirm(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.3s' }} onMouseOver={e=>e.currentTarget.style.color='var(--text-primary)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-muted)'}>
              <X size={24} />
            </button>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(231, 76, 60, 0.08)', color: 'var(--danger)', marginBottom: '24px', border: '1px solid rgba(231, 76, 60, 0.2)' }}>
               <AlertCircle size={36} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '1px' }}>¿Vaciar Carrito?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '32px', fontWeight: '300' }}>
              Estás a punto de descartar todas las piezas exclusivas de tu selección. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="btn-outline" onClick={() => setShowClearConfirm(false)} style={{ flex: 1, padding: '14px', borderRadius: '50px', fontSize: '0.8rem', letterSpacing: '1.5px' }}>MANTENER</button>
              <button onClick={confirmClearCart} style={{ flex: 1, padding: '14px', background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: '50px', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1.5px', cursor: 'pointer', transition: 'all 0.35s', boxShadow: '0 4px 15px rgba(231, 76, 60, 0.3)' }} onMouseOver={e=>{e.currentTarget.style.filter='brightness(1.15)'; e.currentTarget.style.transform='translateY(-2px)'}} onMouseOut={e=>{e.currentTarget.style.filter='none'; e.currentTarget.style.transform='translateY(0)'}}>VACIAR TODO</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
