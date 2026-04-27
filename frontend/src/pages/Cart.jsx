import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, X } from 'lucide-react';

export default function Cart() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);

  const cartKey = isLoggedIn ? `carrito_${user.id}` : null;

  useEffect(() => {
    if (cartKey) {
      const saved = JSON.parse(localStorage.getItem(cartKey) || '[]');
      setCart(saved.map(i => ({ ...i, cantidad: i.cantidad || 1 })));
    }
  }, [cartKey]);

  const save = (newCart) => {
    setCart(newCart);
    if (cartKey) localStorage.setItem(cartKey, JSON.stringify(newCart));
  };

  const changeQty = (index, delta) => {
    const updated = [...cart];
    updated[index].cantidad += delta;
    if (updated[index].cantidad <= 0) updated.splice(index, 1);
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

  const total = cart.reduce((sum, i) => sum + i.precio * i.cantidad, 0);

  if (!isLoggedIn) {
    return (
      <div className="cart-container">
        <div className="cart-box" style={{ textAlign: 'center' }}>
          <h3>Acceso Restringido</h3>
          <p style={{ color: 'var(--text-muted)', margin: '20px 0' }}>
            Debes iniciar sesión para ver tu carrito de compras.
          </p>
          <Link to="/login"><button className="btn-primary">Iniciar Sesión</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-container">
      <div className="cart-box">
        <h3>Tu Carrito de Compras</h3>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '35px' }}>
          Revisa tus productos exclusivos antes de finalizar la compra
        </p>

        {cart.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
            Tu carrito está vacío.
          </p>
        ) : (
          <>
            {cart.map((item, i) => (
              <div className="cart-item" key={i}>
                <span className="cart-item-name">{item.nombre}</span>
                <span className="cart-item-price">${item.precio.toLocaleString('es-CO')}</span>
                <div className="cart-item-qty">
                  <button className="qty-btn" onClick={() => changeQty(i, -1)}>-</button>
                  <span style={{ fontWeight: 600 }}>{item.cantidad}</span>
                  <button className="qty-btn" onClick={() => changeQty(i, 1)}>+</button>
                </div>
                <span className="cart-item-subtotal">${(item.precio * item.cantidad).toLocaleString('es-CO')}</span>
                <button className="btn-danger" onClick={() => remove(i)} style={{ padding: '4px 12px' }}>X</button>
              </div>
            ))}

            <div className="cart-total">Total: ${total.toLocaleString('es-CO')}</div>

            <div className="cart-actions">
              <button className="btn-danger" onClick={requestClearCart} style={{ borderRadius: '50px', padding: '12px 24px' }}>Vaciar carrito</button>
              <button className="btn-primary" onClick={() => navigate('/checkout')} style={{ borderRadius: '50px' }}><span>Proceder al Pago</span></button>
            </div>
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
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '1px' }}>¿Vaciar Bolso?</h3>
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
