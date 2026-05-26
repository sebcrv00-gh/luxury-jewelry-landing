import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, X, Minus, Plus, Crown, Heart, CheckCircle, Lock, Star, MessageSquare } from 'lucide-react';
import api, { getImageUrl } from '../api/axios';

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

const buildProductReviewRef = (name) => {
  return String(name || 'producto')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' y ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'producto';
};

const RatingStars = ({ rating, size = 14 }) => (
  <span className="catalog-rating-stars" aria-hidden="true">
    {[1, 2, 3, 4, 5].map(star => (
      <Star
        key={star}
        size={size}
        fill={star <= Math.round(rating) ? 'currentColor' : 'none'}
      />
    ))}
  </span>
);

export default function Catalog() {
  const { isLoggedIn, user, openAuthModal } = useAuth();
  const carouselRef = useRef(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todas las colecciones');
  const [dbProducts, setDbProducts] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [addedProduct, setAddedProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewSummaryMap, setReviewSummaryMap] = useState({});
  const [selectedProductReviews, setSelectedProductReviews] = useState([]);
  const [selectedProductReviewSummary, setSelectedProductReviewSummary] = useState({ average_rating: 0, total_reviews: 0 });
  const [loadingProductReviews, setLoadingProductReviews] = useState(false);

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
    api.get('/reviews/summary')
      .then(({ data }) => {
        const mapped = {};
        data.forEach(item => {
          const summary = {
            average_rating: Number(item.average_rating || 0),
            total_reviews: Number(item.total_reviews || 0)
          };
          if (item.producto_id) mapped[`db_${item.producto_id}`] = summary;
          if (item.producto_ref) mapped[item.producto_ref] = summary;
        });
        setReviewSummaryMap(mapped);
      })
      .catch(() => {});
    if (isLoggedIn) {
      api.get('/wishlist').then(r => {
        setWishlistIds(new Set(r.data.map(w => w.producto_id)));
      }).catch(() => {});
    }
  }, [isLoggedIn]);

  const isInWishlist = (productId) => wishlistIds.has(productId);

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

  const allProducts = dbProducts.map(p => ({
    id: `db_${p.id}`,
    dbProductId: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion || 'Sin descripcion personalizada para esta pieza.',
    precio: Number(p.precio),
    img: p.imagen_url
      ? getImageUrl(p.imagen_url)
      : (p.variantes?.[0]?.imagen_url ? getImageUrl(p.variantes[0].imagen_url) : '/images/Logo_Luxury_Joyeria-removebg-preview.png'),
    stock: p.stock,
    categoria: getCategoryFromName(p.nombre),
    reviewRef: buildProductReviewRef(p.nombre),
    variantes: Array.isArray(p.variantes)
      ? p.variantes.map(variant => ({
          ...variant,
          stock: Number(variant.stock || 0),
          img: variant.imagen_url ? getImageUrl(variant.imagen_url) : (p.imagen_url ? getImageUrl(p.imagen_url) : '/images/Logo_Luxury_Joyeria-removebg-preview.png')
        }))
      : []
  }));

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

    const activeStock = product.selectedVariant ? product.selectedVariant.stock : product.stock;
    if (activeStock === 0) return;

    const finalPrice = isVip ? Math.round(product.precio * (1 - VIP_DISCOUNT)) : product.precio;
    const cartItemId = product.selectedVariant
      ? `db_${product.dbProductId}__variant_${product.selectedVariant.id}`
      : product.id;

    const key = `carrito_${user.id}`;
    const cart = JSON.parse(localStorage.getItem(key) || '[]');
    const existing = cart.find(i => i.id === cartItemId);
    if (existing) {
      existing.cantidad += qty;
    } else {
      cart.push({
        id: cartItemId,
        baseProductId: product.dbProductId,
        variantId: product.selectedVariant?.id || null,
        color: product.selectedVariant?.color_nombre || null,
        nombre: product.nombre,
        precio: finalPrice,
        cantidad: qty,
      });
    }
    localStorage.setItem(key, JSON.stringify(cart));
    setAddedProduct({ id: cartItemId });
    setTimeout(() => setAddedProduct(null), 3500);
  };

  const getProductReviewSummary = (product) => {
    if (!product) return { average_rating: 0, total_reviews: 0 };
    return reviewSummaryMap[product.dbProductId ? `db_${product.dbProductId}` : product.reviewRef]
      || reviewSummaryMap[product.reviewRef]
      || { average_rating: 0, total_reviews: 0 };
  };

  useEffect(() => {
    if (!selectedProduct) {
      setSelectedProductReviews([]);
      setSelectedProductReviewSummary({ average_rating: 0, total_reviews: 0 });
      setSelectedVariant(null);
      return;
    }

    setSelectedVariant(selectedProduct.variantes?.[0] || null);

    let ignore = false;
    const loadProductReviews = async () => {
      setLoadingProductReviews(true);
      try {
        const { data } = await api.get('/reviews/product', {
          params: {
            productId: selectedProduct.dbProductId || undefined,
            productRef: selectedProduct.reviewRef
          }
        });

        if (!ignore) {
          setSelectedProductReviewSummary({
            average_rating: Number(data.summary?.average_rating || 0),
            total_reviews: Number(data.summary?.total_reviews || 0)
          });
          setSelectedProductReviews(data.reviews || []);
        }
      } catch (err) {
        if (!ignore) {
          setSelectedProductReviews([]);
          setSelectedProductReviewSummary({ average_rating: 0, total_reviews: 0 });
        }
      } finally {
        if (!ignore) setLoadingProductReviews(false);
      }
    };

    loadProductReviews();
    return () => { ignore = true; };
  }, [selectedProduct]);

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

      {/* Toast removed in favor of in-card validation */}

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
              {filtered.map(p => {
                const reviewSummary = getProductReviewSummary(p);
                return (
                <div className={`product-card catalog-product-card ${p.stock === 0 ? 'out-of-stock' : ''}`} key={p.id}>
                  <div className="product-image-wrap">
                    <img src={p.img} alt={p.nombre} style={p.stock === 0 ? { filter: 'grayscale(0.8) opacity(0.6)' } : {}} />
                    <button onClick={(e) => { e.stopPropagation(); toggleWishlist(p.dbProductId); }} style={{ position: 'absolute', top: '12px', right: '12px', background: isInWishlist(p.dbProductId) ? 'rgba(231,76,60,0.9)' : 'rgba(10,10,10,0.6)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', zIndex: 3, color: '#fff' }}
                      onMouseOver={e => e.currentTarget.style.transform = 'scale(1.15)'}
                      onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <Heart size={16} fill={isInWishlist(p.dbProductId) ? '#fff' : 'none'} />
                    </button>
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
                    <p className="catalog-product-desc" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: '1.55', minHeight: '42px', marginBottom: '14px' }}>
                      {p.descripcion.length > 92 ? `${p.descripcion.slice(0, 92)}...` : p.descripcion}
                    </p>
                    {isVip ? (
                      <div className="price" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '0.8rem' }}>${p.precio.toLocaleString('es-CO')}</span>
                        <span style={{ color: '#FFD700', fontSize: '1.1rem' }}>${Math.round(p.precio * (1 - VIP_DISCOUNT)).toLocaleString('es-CO')}</span>
                      </div>
                    ) : (
                      <p className="price">${p.precio.toLocaleString('es-CO')}</p>
                    )}
                    <div className="catalog-card-review-meta">
                      <div className="catalog-card-review-stars">
                        <RatingStars rating={reviewSummary.average_rating} size={13} />
                        <span>{reviewSummary.average_rating ? reviewSummary.average_rating.toFixed(1) : 'Nuevo'}</span>
                      </div>
                      <span className="catalog-card-review-count">
                        <MessageSquare size={12} />
                        {reviewSummary.total_reviews} reseñas
                      </span>
                    </div>
                    {p.variantes.length > 0 && (
                      <div className="catalog-product-colors-note" style={{ color: 'var(--gold)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
                        {p.variantes.length} colores disponibles
                      </div>
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
              )})}
            </div>
          </div>
        )}
      </div>

      {selectedProduct && (
          (() => {
            const activeVariant = selectedVariant || null;
            const selectedStock = activeVariant ? activeVariant.stock : selectedProduct.stock;
            const activeImage = activeVariant?.img || selectedProduct.img;
            const cartSelectionId = activeVariant
              ? `db_${selectedProduct.dbProductId}__variant_${activeVariant.id}`
              : selectedProduct.id;
            return (
        <>
          <div className="overlay" style={{ backdropFilter: 'blur(15px)', background: 'rgba(5, 5, 5, 0.85)', zIndex: 9999 }} onClick={() => setSelectedProduct(null)} />
          <div className="product-detail-modal" style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10000,
            width: '90%', maxWidth: '900px', background: 'linear-gradient(145deg, rgba(20, 20, 20, 0.95), rgba(10, 10, 10, 0.98))',
            borderRadius: '16px', border: '1px solid var(--border-gold)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
            display: 'flex', overflow: 'hidden'
          }}>
            <button className="product-detail-close" onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 2, transition: 'color 0.3s' }} onMouseOver={e => e.currentTarget.style.color='var(--rose-gold)'} onMouseOut={e => e.currentTarget.style.color='var(--text-muted)'}>
              <X size={32} strokeWidth={1} />
            </button>
            <div className="modal-img-col" style={{ flex: '1', position: 'relative', minHeight: '480px' }}>
               <img src={activeImage} alt={selectedProduct.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.95)' }} />
               <div className="product-detail-category" style={{ position: 'absolute', top: '24px', left: '24px', background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(4px)', border: '1px solid var(--gold)', padding: '6px 16px', borderRadius: '4px', color: 'var(--gold)', letterSpacing: '2px', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  {selectedProduct.categoria}
               </div>
               {selectedProduct.variantes.length > 0 && (
                 <div className="product-detail-gallery">
                   <img 
                     src={selectedProduct.img} 
                     alt="Original"
                     className={`product-detail-thumbnail ${!activeVariant ? 'active' : ''}`}
                     onClick={() => setSelectedVariant(null)}
                   />
                   {selectedProduct.variantes.map(variant => (
                     <img
                       key={variant.id}
                       src={variant.img}
                       alt={variant.color_nombre}
                       className={`product-detail-thumbnail ${activeVariant?.id === variant.id ? 'active' : ''}`}
                       onClick={() => {
                         setSelectedVariant(variant);
                         setQuantity(1);
                       }}
                     />
                   ))}
                 </div>
               )}
            </div>
            <div className="modal-info-col" style={{ flex: '1', padding: '60px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
               <h2 className="product-detail-title" style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.1' }}>{selectedProduct.nombre}</h2>
               {isVip ? (
                 <div className="product-detail-price-block" style={{ marginBottom: '24px' }}>
                   <span className="product-detail-price-original" style={{ textDecoration: 'line-through', color: 'var(--text-muted)', fontSize: '1rem', marginRight: '14px' }}>${selectedProduct.precio.toLocaleString('es-CO')}</span>
                   <span className="product-detail-price-vip" style={{ fontSize: '1.8rem', color: '#FFD700', fontWeight: '500', letterSpacing: '1px' }}>${Math.round(selectedProduct.precio * (1 - VIP_DISCOUNT)).toLocaleString('es-CO')}</span>
                   <div className="product-detail-vip-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginLeft: '12px', background: 'rgba(255,215,0,0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,215,0,0.25)' }}>
                     <Crown size={12} style={{ color: '#FFD700' }}/>
                     <span style={{ color: '#FFD700', fontSize: '0.65rem', fontWeight: '600', letterSpacing: '1.5px', textTransform: 'uppercase' }}>-10% VIP</span>
                   </div>
                 </div>
               ) : (
                 <p className="product-detail-price" style={{ fontSize: '1.6rem', color: 'var(--gold-light)', fontWeight: '400', marginBottom: '24px', letterSpacing: '1px' }}>${selectedProduct.precio.toLocaleString('es-CO')}</p>
               )}
               <p className="product-detail-description" style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '40px', fontWeight: '300' }}>
                  {selectedProduct.descripcion}
               </p>
               {selectedProduct.variantes.length > 0 && (
                 <div className="product-detail-variants" style={{ marginBottom: '28px' }}>
                   <div className="product-detail-variants-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                     <span className="product-detail-variants-label" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>
                       Selecciona un color
                     </span>
                     <strong className="product-detail-variant-name" style={{ color: 'var(--gold-light)', fontSize: '0.9rem' }}>
                       {activeVariant?.color_nombre || 'Sin color seleccionado'}
                     </strong>
                   </div>
                   <div className="product-detail-variants-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                     {selectedProduct.variantes.map(variant => {
                       const isActive = activeVariant?.id === variant.id;
                       return (
                         <button
                           className={`product-detail-variant-chip ${isActive ? 'active' : ''}`}
                           key={variant.id}
                           type="button"
                           onClick={() => {
                             setSelectedVariant(variant);
                             setQuantity(1);
                           }}
                           style={{
                             display: 'inline-flex',
                             alignItems: 'center',
                             gap: '10px',
                             borderRadius: '999px',
                             padding: '10px 14px',
                             border: isActive ? '1px solid rgba(201,168,76,0.8)' : '1px solid rgba(255,255,255,0.12)',
                             background: isActive ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.03)',
                             color: 'var(--text-primary)',
                             cursor: 'pointer'
                           }}
                         >
                           <span className="product-detail-variant-swatch" style={{
                             width: '16px',
                             height: '16px',
                             borderRadius: '50%',
                             background: variant.color_codigo || '#D4AF37',
                             border: '1px solid rgba(255,255,255,0.4)'
                           }} />
                           <span className="product-detail-variant-chip-name">{variant.color_nombre}</span>
                           <span className="product-detail-variant-chip-stock" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                             {variant.stock > 0 ? `${variant.stock} uds` : 'Agotado'}
                           </span>
                         </button>
                       );
                     })}
                   </div>
                 </div>
               )}
               <div className="catalog-product-reviews-box">
                 <div className="catalog-product-reviews-head">
                   <div>
                     <span className="catalog-product-reviews-kicker">Reseñas verificadas</span>
                     <div className="catalog-product-reviews-score">
                       <RatingStars rating={selectedProductReviewSummary.average_rating} size={15} />
                       <strong>
                         {selectedProductReviewSummary.total_reviews > 0
                           ? `${selectedProductReviewSummary.average_rating.toFixed(1)} / 5`
                           : 'Sin reseñas aún'}
                       </strong>
                     </div>
                   </div>
                   <span className="catalog-product-reviews-count">
                     {selectedProductReviewSummary.total_reviews} opiniones publicadas
                   </span>
                 </div>

                 {loadingProductReviews ? (
                   <div className="catalog-product-review-empty">Cargando reseñas del producto...</div>
                 ) : selectedProductReviews.length === 0 ? (
                   <div className="catalog-product-review-empty">
                     Este producto aún no tiene reseñas visibles. Sé de los primeros en compartir tu experiencia cuando recibas tu pedido.
                   </div>
                 ) : (
                   <div className="catalog-product-review-list">
                     {selectedProductReviews.slice(0, 3).map(review => (
                       <div key={review.id} className="catalog-product-review-item">
                         <div className="catalog-product-review-item-head">
                           <strong>{review.usuario_nombre}</strong>
                           <span>{new Date(review.creado_en).toLocaleDateString('es-CO')}</span>
                         </div>
                         <RatingStars rating={review.calificacion} size={13} />
                         <p>{review.comentario}</p>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               <div className="product-detail-quantity-row" style={{ display: 'flex', alignItems: 'center', gap: '30px', marginBottom: '40px' }}>
                  <span className="product-detail-quantity-label" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '2px' }}>Cantidad</span>
                  <div className="product-detail-quantity-box" style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(201, 168, 76, 0.4)', borderRadius: '50px', padding: '4px' }}>
                     <button className="product-detail-quantity-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }} onMouseOver={e=>e.currentTarget.style.color='var(--gold)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-secondary)'}><Minus size={16} /></button>
                     <span className="product-detail-quantity-value" style={{ width: '40px', textAlign: 'center', fontSize: '1rem', color: 'var(--text-primary)', fontWeight: '500' }}>{quantity}</span>
                     <button className="product-detail-quantity-btn" onClick={() => setQuantity(selectedStock !== undefined ? Math.min(selectedStock, quantity + 1) : quantity + 1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s' }} onMouseOver={e=>e.currentTarget.style.color='var(--gold)'} onMouseOut={e=>e.currentTarget.style.color='var(--text-secondary)'}><Plus size={16} /></button>
                  </div>
               </div>
               <button 
                  className={`product-detail-cta ${addedProduct && addedProduct.id === cartSelectionId ? "btn-success" : "btn-primary"}`} 
                  onClick={() => addToCart({ ...selectedProduct, selectedVariant: activeVariant }, quantity)} 
                  disabled={selectedStock === 0 || (addedProduct && addedProduct.id === cartSelectionId)}
                  style={{ padding: '18px', fontSize: '0.9rem', letterSpacing: '3px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.3s' }}>
                  {selectedStock === 0 ? 'AGOTADO' : (
                    (addedProduct && addedProduct.id === cartSelectionId) 
                      ? <><CheckCircle size={18} /> AÑADIDO EXITOSAMENTE</> 
                      : 'AÑADIR AL CARRITO'
                  )}
               </button>
            </div>
          </div>
        </>
            );
          })()
      )}

      {showPopup && (
        <div className="catalog-auth-prompt" role="alert" aria-live="polite">
          <button
            type="button"
            className="catalog-auth-prompt-close"
            aria-label="Cerrar aviso"
            onClick={() => setShowPopup(false)}
          >
            <X size={16} />
          </button>
          <div className="catalog-auth-prompt-icon">
            <Lock size={18} />
          </div>
          <div className="catalog-auth-prompt-copy">
            <span className="catalog-auth-prompt-kicker">Acceso requerido</span>
            <strong>Inicia sesión o crea tu cuenta para usar el carrito.</strong>
            <p>Activa una experiencia de compra completa y guarda tus piezas favoritas con seguridad.</p>
          </div>
          <div className="catalog-auth-prompt-actions">
            <button
              className="btn-primary"
              onClick={() => { setShowPopup(false); openAuthModal('login'); }}
            >
              <span>Iniciar Sesión</span>
            </button>
            <button
              className="btn-outline"
              onClick={() => { setShowPopup(false); openAuthModal('register'); }}
            >
              Registrarme
            </button>
          </div>
        </div>
      )}
    </>
  );
}
