import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Cart() {
  const { user, isLoggedIn } = useAuth();
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

  const clearCart = () => {
    if (confirm('¿Seguro que deseas vaciar el carrito?')) save([]);
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
              <button className="btn-danger" onClick={clearCart}>Vaciar carrito</button>
              <button className="btn-primary">Proceder al Pago</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
