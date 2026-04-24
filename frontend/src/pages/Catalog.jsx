import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const STATIC_PRODUCTS = [
  { id: 's1', nombre: 'Reloj Invicta Original', precio: 790000, img: '/images/WhatsApp Image 2025-10-02 at 10.03.51 AM.jpeg' },
  { id: 's2', nombre: 'Curren Cronograph', precio: 170000, img: '/images/WhatsApp Image 2025-10-02 at 10.06.07 AM.jpeg' },
  { id: 's3', nombre: 'Q&Q Metálico Hombre', precio: 98000, img: '/images/WhatsApp Image 2025-10-02 at 10.06.59 AM.jpeg' },
  { id: 's4', nombre: 'Q&Q Sumergible Dama', precio: 75000, img: '/images/WhatsApp Image 2025-10-02 at 10.11.35 AM.jpeg' },
  { id: 's5', nombre: 'Pulsera Elegante', precio: 44000, img: '/images/WhatsApp Image 2025-10-10 at 10.24.10 AM.jpeg' },
  { id: 's6', nombre: 'Pulsera Oro Laminado', precio: 35000, img: '/images/WhatsApp Image 2025-10-10 at 10.24.08 AM.jpeg' },
  { id: 's7', nombre: 'Conjunto Collar y Aretes', precio: 38000, img: '/images/WhatsApp Image 2025-10-10 at 10.24.04 AM.jpeg' },
  { id: 's8', nombre: 'Pulsera Dorada', precio: 38000, img: '/images/WhatsApp Image 2025-10-10 at 10.23.51 AM.jpeg' },
  { id: 's9', nombre: 'Aretes Artesanales', precio: 28000, img: '/images/WhatsApp Image 2025-10-10 at 10.23.34 AM.jpeg' },
];

export default function Catalog() {
  const { isLoggedIn, user } = useAuth();
  const [search, setSearch] = useState('');
  const [dbProducts, setDbProducts] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');

  useEffect(() => {
    api.get('/products').then(r => setDbProducts(r.data)).catch(() => {});
  }, []);

  const allProducts = [
    ...STATIC_PRODUCTS,
    ...dbProducts.map(p => ({
      id: `db_${p.id}`,
      nombre: p.nombre,
      precio: Number(p.precio),
      img: p.imagen_url ? `http://localhost:3001/${p.imagen_url}` : '/images/Logo_Luxury_Joyeria-removebg-preview.png'
    }))
  ];

  const filtered = allProducts.filter(p =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    if (!isLoggedIn) {
      setShowPopup(true);
      return;
    }
    
    // Si el producto no tiene stock, no permitir agregarlo
    if (product.stock === 0) return;

    const key = `carrito_${user.id}`;
    const cart = JSON.parse(localStorage.getItem(key) || '[]');
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.cantidad += 1;
    } else {
      cart.push({ 
        id: product.id, 
        nombre: product.nombre, 
        precio: product.precio, 
        cantidad: 1,
        // Mantener info del stock si es necesario para el carrito
      });
    }
    localStorage.setItem(key, JSON.stringify(cart));
    setAddedMsg(product.nombre);
    setTimeout(() => setAddedMsg(''), 2000);
  };

  return (
    <>
      <div className="search-box">
        <input
          type="text"
          placeholder="Buscar reloj, pulsera, collar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {addedMsg && (
        <div style={{
          position: 'fixed', top: '90px', right: '30px', zIndex: 9999,
          background: 'var(--bg-elevated)', border: '1px solid var(--success)',
          color: 'var(--success)', padding: '14px 24px', borderRadius: '10px',
          fontSize: '0.88rem', fontWeight: 500, letterSpacing: '0.3px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          animation: 'popIn 0.3s ease forwards'
        }}>
          ✓ {addedMsg} añadido al carrito
        </div>
      )}

      <div className="catalog-container">
        <div className="product-grid">
          {filtered.map(p => (
            <div className={`product-card ${p.stock === 0 ? 'out-of-stock' : ''}`} key={p.id}>
              <div className="product-image-wrap">
                <img src={p.img} alt={p.nombre} style={p.stock === 0 ? { filter: 'grayscale(0.8) opacity(0.6)' } : {}} />
                {p.stock === 0 && (
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)',
                    background: 'var(--danger)', color: 'white', padding: '8px 20px',
                    fontSize: '0.9rem', fontWeight: 'bold', textTransform: 'uppercase',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)', zIndex: 2, borderRadius: '4px'
                  }}>
                    Agotado
                  </div>
                )}
              </div>
              <div className="product-info">
                <h3>{p.nombre}</h3>
                <p className="price">${p.precio.toLocaleString('es-CO')}</p>
                <button 
                  className={p.stock === 0 ? 'btn-outline disabled' : 'btn-outline'} 
                  onClick={() => addToCart(p)}
                  disabled={p.stock === 0}
                  style={p.stock === 0 ? { cursor: 'not-allowed', color: 'var(--text-muted)', borderColor: 'var(--text-muted)' } : {}}
                >
                  {p.stock === 0 ? 'No disponible' : 'Agregar al carrito'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showPopup && (
        <>
          <div className="overlay" onClick={() => setShowPopup(false)} />
          <div className="popup">
            <h4>Acceso Restringido</h4>
            <p>Debes crear una cuenta o iniciar sesión para poder usar el carrito de compras.</p>
            <div className="popup-actions">
              <Link to="/login"><button className="btn-primary"><span>Iniciar Sesión</span></button></Link>
              <Link to="/registro"><button className="btn-outline">Registrarme</button></Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
