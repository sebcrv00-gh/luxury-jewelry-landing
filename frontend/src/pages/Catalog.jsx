import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, X, Minus, Plus, Crown, Heart } from 'lucide-react';
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

const CATEGORIES = ['Todas las colecciones', 'Relojes', 'Pulseras', 'Collares', 'Aretes', 'Anillos', 'Otros'];

const getCategoryFromName = (name) => {
  const n = name.toLowerCase();
  if (n.includes('reloj') || n.includes('cronograph') || n.includes('q&q') || n.includes('invicta') || n.includes('rolex') || n.includes('casio')) return 'Relojes';
  if (n.includes('pulsera') || n.includes('manilla') || n.includes('brazalete')) return 'Pulseras';
  if (n.includes('collar') || n.includes('cadena') || n.includes('gargantilla') || n.includes('conjunto')) return 'Collares';
  if (n.includes('arete') || n.includes('candonga') || n.includes('topo')) return 'Aretes';
  if (n.includes('anillo') || n.includes('sortija') || n.includes('argolla') || n.includes('compromiso')) return 'Anillos';
  return 'Otros';
};

export default function Catalog() {
  const { isLoggedIn, user } = useAuth();
  const carouselRef = useRef(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas las colecciones');
  const [dbProducts, setDbProducts] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const isVip = user?.rol === 'vip';
  const VIP_DISCOUNT = 0.10;
  const [wishlistIds, setWishlistIds] = useState(new Set());

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -340 : 340;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    api.get('/products').then(r => setDbProducts(r.data)).catch(() => { });
    if (isLoggedIn) {
      api.get('/wishlist').then(r => {
        setWishlistIds(new Set(r.data.map(w => w.producto_id)));
      }).catch(() => {});
    }
  }, [isLoggedIn]);

  const toggleWishlist = async (productId) => {
    if (!isLoggedIn) { setShowPopup(true); return; }
    try {
      if (wishlistIds.has(productId)) {
        await api.delete(`/wishlist/${productId}`);
        setWishlistIds(prev => { const n = new Set(prev); n.delete(productId); return n; });
      } else {
        await api.post(`/wishlist/${productId}`);
        setWishlistIds(prev => new Set(prev).add(productId));
      }
    } catch (e) { console.error(e); }
  };

  const allProducts = [
    ...STATIC_PRODUCTS.map(p => ({ ...p, categoria: getCategoryFromName(p.nombre) })),
    ...dbProducts.map(p => ({
      id: `db_${p.id}`,
      nombre: p.nombre,
      precio: Number(p.precio),
      img: p.imagen_url ? `http://localhost:3001/${p.imagen_url}` : '/images/Logo_Luxury_Joyeria-removebg-preview.png',
      stock: p.stock,
      categoria: getCategoryFromName(p.nombre)
    }))
  ];

  const filtered = allProducts.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase());
    const matchCategory = activeCategory === 'Todas las colecciones' || p.categoria === activeCategory;
    return matchSearch && matchCategory;
  });

  const addToCart = (product, qty = 1) => {
    if (!isLoggedIn) {
      setShowPopup(true);
      return;
    }

    if (product.stock === 0) return;

    const finalPrice = isVip ? Math.round(product.precio * (1 - VIP_DISCOUNT)) : product.precio;

    const key = `carrito_${user.id}`;
    const cart = JSON.parse(localStorage.getItem(key) || '[]');
    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      existing.cantidad += qty;
    } else {
      cart.push({
        id: product.id,
        nombre: product.nombre,
        precio: finalPrice,
        cantidad: qty,
      });
    }
    localStorage.setItem(key, JSON.stringify(cart));
    setAddedMsg(product.nombre);
    setTimeout(() => setAddedMsg(''), 3500);
  };

  return (
    <>
      {/* ── MENÚ DE CATEGORÍAS ── */}
      <div className="catalog-header" style={{ paddingTop: 'calc(var(--header-height) + 50px)', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', color: 'var(--gold-light)', letterSpacing: '4px', marginBottom: '12px', textTransform: 'uppercase' }}>
          Colecciones
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '40px' }}>
          Descubre nuestra exclusiva selección
        </p>
        
        {isVip && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(135deg, rgba(255,215,0,0.08), rgba(201,168,76,0.05))', border: '1px solid rgba(255,215,0,0.25)', padding: '12px 28px', borderRadius: '50px', marginBottom: '32px' }}>
            <Crown size={18} style={{ color: '#FFD700' }}/>
            <span style={{ color: '#FFD700', fontSize: '0.82rem', fontWeight: '600', letterSpacing: '2px', textTransform: 'uppercase' }}>Beneficio VIP — 10% de descuento aplicado</span>
          </div>
        )}
        
        <div className="search-box" style={{ margin: '0 auto 32px' }}>
          <input
            type="text"
            placeholder="Buscar por nombre, marca o modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <nav className="category-menu">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`category-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </nav>
      </div>

      {addedMsg && (
        <div className="toast-premium">
          <div className="toast-icon">
             <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(201, 168, 76, 0.4))' }}>
               <polyline points="20 6 9 17 4 12"></polyline>
             </svg>
          </div>
          <div className="toast-text-box">
            <span className="toast-subtitle">AÑADIDO AL BOLSO</span>
            <span className="toast-title">{addedMsg}</span>
          </div>
        </div>
      )}

      <div className="catalog-container">
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
            <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: '16px' }}>No hay piezas en esta colección</h3>
            <p>Intenta con otra búsqueda u otra categoría.</p>
          </div>
        ) : (
          <div className="carousel-wrapper">
            <button className="carousel-arrow left" onClick={() => scrollCarousel('left')} aria-label="Anterior">
              <ChevronLeft size={28} />
            </button>
            <button className="carousel-arrow right" onClick={() => scrollCarousel('right')} aria-label="Siguiente">
              <ChevronRight size={28} />
            </button>
            
            <div className="carousel-track" ref={carouselRef}>
              {filtered.map(p => (
                <div className={`product-card ${p.stock === 0 ? 'out-of-stock' : ''}`} key={p.id}>
                  <div className="product-image-wrap">
                    <img src={p.img} alt={p.nombre} style={p.stock === 0 ? { filter: 'grayscale(0.8) opacity(0.6)' } : {}} />
                    {typeof p.id === 'number' && (
                      <button onClick={(e) => { e.stopPropagation(); toggleWishlist(p.id); }} style={{ position: 'absolute', top: '12px', right: '12px', background: wishlistIds.has(p.id) ? 'rgba(231,76,60,0.9)' : 'rgba(10,10,10,0.6)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', zIndex: 3, color: '#fff' }}
                        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.15)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <Heart size={16} fill={wishlistIds.has(p.id) ? '#fff' : 'none'} />
                      </button>
                    )}
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
                    <div className="category-badge">{p.categoria}</div>
                  </div>
                  <div className="product-info">
                    <h3>{p.nombre}</h3>
                    {isVip ? (
                      <div className="price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem' }}>${p.precio.toLocaleString('es-CO')}</span>
                        <span style={{ color: '#FFD700', fontSize: '1.1rem' }}>${Math.round(p.precio * (1 - VIP_DISCOUNT)).toLocaleString('es-CO')}</span>
                      </div>
                    ) : (
                      <p className="price">${p.precio.toLocaleString('es-CO')}</p>
                    )}
                    <button
                      className={p.stock === 0 ? 'btn-outline disabled' : 'btn-outline'}
                      onClick={() => { if(p.stock !== 0) { setSelectedProduct(p); setQuantity(1); } }}
                      disabled={p.stock === 0}
                      style={p.stock === 0 ? { cursor: 'not-allowed', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'transparent' } : {}}
                    >
                      {p.stock === 0 ? 'No disponible' : 'Ver Detalles'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selectedProduct && (
        <>
          <div className="overlay" style={{ backdropFilter: 'blur(15px)', background: 'rgba(5, 5, 5, 0.85)', zIndex: 9999 }} onClick={() => setSelectedProduct(null)} />
          <div className="product-detail-modal" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000,
            width: '90%', maxWidth: '900px', background: 'linear-gradient(145deg, rgba(20, 20, 20, 0.95), rgba(10, 10, 10, 0.98))',
            borderRadius: '16px', border: '1px solid var(--border-gold)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
            display: 'flex', overflow: 'hidden'
          }}>
            <button onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 2, transition: 'color 0.3s' }} onMouseOver={e => e.currentTarget.style.color='var(--rose-gold)'} onMouseOut={e => e.currentTarget.style.color='var(--text-muted)'}>
              <X size={32} strokeWidth={1} />
            </button>
            <div className="modal-img-col" style={{ flex: '1', position: 'relative', minHeight: '480px' }}>
               <img src={selectedProduct.img} alt={selectedProduct.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.95)' }} />
               <div style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(4px)', border: '1px solid var(--gold)', padding: '6px 16px', borderRadius: '4px', color: 'var(--gold)', letterSpacing: '2px', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  {selectedProduct.categoria}
               </div>
            </div>
            <div className="modal-info-col" style={{ flex: '1', padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.1' }}>{selectedProduct.nombre}</h2>
               {isVip ? (
                 <div style={{ marginBottom: '24px' }}>
                   <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1rem', marginRight: '14px' }}>${selectedProduct.precio.toLocaleString('es-CO')}</span>
                   <span style={{ fontSize: '1.8rem', color: '#FFD700', fontWeight: '500', letterSpacing: '1px' }}>${Math.round(selectedProduct.precio * (1 - VIP_DISCOUNT)).toLocaleString('es-CO')}</span>
                   <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '12px', background: 'rgba(255,215,0,0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,215,0,0.25)' }}>
                     <Crown size={12} style={{ color: '#FFD700' }}/>
                     <span style={{ color: '#FFD700', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase' }}>-10% VIP</span>
                   </div>
                 </div>
               ) : (
                 <p style={{ fontSize: '1.6rem', color: 'var(--gold-light)', fontWeight: '400', marginBottom: '24px', letterSpacing: '1px' }}>${selectedProduct.precio.toLocaleString('es-CO')}</p>
               )}
               <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '40px', fontWeight: '300' }}>
                  Descubre la majestuosidad de esta pieza exclusiva. Diseñada con los estándares más estrictos y finos materiales de la alta joyería, ofrece un nivel de perfeccionismo impecable que iluminará y transformará cualquier ocasión especial en un evento memorable.
               </p>
               <div style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>Cantidad</span>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(201, 168, 76, 0.4)', borderRadius: '50px', padding: '4px' }}>
                     <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }} onMouseOver={e=>e.currentTarget.style.color='var(--gold)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-secondary)'}><Minus size={16} /></button>
                     <span style={{ width: '40px', textAlign: 'center', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{quantity}</span>
                     <button onClick={() => setQuantity(selectedProduct.stock !== undefined ? Math.min(selectedProduct.stock, quantity + 1) : quantity + 1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }} onMouseOver={e=>e.currentTarget.style.color='var(--gold)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-secondary)'}><Plus size={16} /></button>
                  </div>
               </div>
               <button 
                  className="btn-primary" 
                  onClick={() => { addToCart(selectedProduct, quantity); setSelectedProduct(null); }} 
                  disabled={selectedProduct.stock === 0}
                  style={{ padding: '18px', fontSize: '0.9rem', letterSpacing: '3px', width: '100%', textAlign: 'center', justifyContent: 'center' }}>
                  {selectedProduct.stock === 0 ? 'AGOTADO' : 'AÑADIR AL CARRITO'}
               </button>
            </div>
          </div>
        </>
      )}

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
