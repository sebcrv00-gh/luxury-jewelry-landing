import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, ChevronDown, X, Minus, Plus, Crown, Heart, CheckCircle, Lock, Star, MessageSquare, Sparkles, Clock3 } from 'lucide-react';
import api, { getImageUrl } from '../api/axios';
import { readCart, writeCart } from '../utils/cartStorage';

const DEFAULT_CATEGORY = 'Todos';
const SHOWCASE_FILTERS = {
  all: 'all',
  featured: 'featured',
  newest: 'newest'
};

const getCategoryFromName = (name) => {
  const n = name.toLowerCase();
  if (n.includes('reloj') || n.includes('cronograph') || n.includes('q&q') || n.includes('invicta') || n.includes('rolex') || n.includes('casio')) return 'Relojes';
  if (n.includes('pulsera') || n.includes('manilla') || n.includes('brazalete')) return 'Pulseras';
  if (n.includes('collar') || n.includes('cadena') || n.includes('gargantilla') || n.includes('conjunto')) return 'Collares';
  if (n.includes('arete') || n.includes('candonga') || n.includes('topo')) return 'Aretes';
  if (n.includes('anillo') || n.includes('sortija') || n.includes('argolla') || n.includes('compromiso')) return 'Anillos';
  return 'Otros';
};

const normalizeCategory = (category, name) => {
  const normalized = String(category || '').trim();
  return normalized || getCategoryFromName(name);
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
  const categoryMenuRef = useRef(null);
  const catalogResultsRef = useRef(null);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(DEFAULT_CATEGORY);
  const [activeShowcase, setActiveShowcase] = useState(SHOWCASE_FILTERS.all);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [dbProducts, setDbProducts] = useState([]);
  const [highlightedProductIds, setHighlightedProductIds] = useState([]);
  const [authPromptTarget, setAuthPromptTarget] = useState(null);
  const [addedProduct, setAddedProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewSummaryMap, setReviewSummaryMap] = useState({});
  const [selectedProductReviews, setSelectedProductReviews] = useState([]);
  const [selectedProductReviewSummary, setSelectedProductReviewSummary] = useState({ average_rating: 0, total_reviews: 0 });
  const [loadingProductReviews, setLoadingProductReviews] = useState(false);

  const isVip = user?.rol === 'vip';
  const hasUsedFirstShipping = isLoggedIn && user ? Number(user.primer_envio_gratis_usado || 0) !== 0 : false;
  const showFreeShippingNote = !isLoggedIn || (isLoggedIn && user && !hasUsedFirstShipping);
  const showVipBanner = Boolean(isLoggedIn && user);
  const VIP_DISCOUNT = 0.10;
  const [wishlistIds, setWishlistIds] = useState(new Set());

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeCategory, activeShowcase]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (categoryMenuRef.current && !categoryMenuRef.current.contains(event.target)) {
        setIsCategoryMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  useEffect(() => {
    api.get('/products').then(r => setDbProducts(r.data)).catch(() => { });
    api.get('/products/highlights', { params: { limit: 12 } })
      .then(({ data }) => {
        setHighlightedProductIds(Array.isArray(data) ? data.map(product => Number(product.id)) : []);
      })
      .catch(() => {
        setHighlightedProductIds([]);
      });
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

  const closeAuthPrompt = () => setAuthPromptTarget(null);

  const openAuthPrompt = (target) => setAuthPromptTarget(target);

  const handleAuthPromptAction = (mode) => {
    closeAuthPrompt();
    openAuthModal(mode);
  };

  const toggleWishlist = async (productId) => {
    if (!isLoggedIn) {
      setSelectedProduct(null);
      openAuthPrompt({ type: 'card', productId });
      return;
    }
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

  const handleVipCta = () => {
    if (!isLoggedIn) {
      openAuthModal('register');
      return;
    }

    const catalogGrid = document.querySelector('.catalog-container');
    catalogGrid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const allProducts = dbProducts.map(p => ({
    id: `db_${p.id}`,
    dbProductId: p.id,
    nombre: p.nombre,
    descripcion: p.descripcion || 'Sin descripcion personalizada para esta pieza.',
    precio: Number(p.precio),
    creadoEn: p.creado_en,
    img: p.imagen_url
      ? getImageUrl(p.imagen_url)
      : (p.variantes?.[0]?.imagen_url ? getImageUrl(p.variantes[0].imagen_url) : '/images/Logo_Luxury_Joyeria-removebg-preview.png'),
    stock: p.stock,
    categoria: normalizeCategory(p.categoria, p.nombre),
    reviewRef: buildProductReviewRef(p.nombre),
    variantes: Array.isArray(p.variantes)
      ? p.variantes.map(variant => ({
          ...variant,
          stock: Number(variant.stock || 0),
          img: variant.imagen_url ? getImageUrl(variant.imagen_url) : (p.imagen_url ? getImageUrl(p.imagen_url) : '/images/Logo_Luxury_Joyeria-removebg-preview.png')
        }))
      : []
  }));

  const categoryOptions = [DEFAULT_CATEGORY, ...Array.from(new Set(allProducts.map(product => product.categoria))).sort((a, b) => a.localeCompare(b))];
  const categoryCountMap = allProducts.reduce((accumulator, product) => {
    accumulator[product.categoria] = (accumulator[product.categoria] || 0) + 1;
    return accumulator;
  }, { [DEFAULT_CATEGORY]: allProducts.length });

  useEffect(() => {
    if (!categoryOptions.includes(activeCategory)) {
      setActiveCategory(DEFAULT_CATEGORY);
    }
  }, [activeCategory, categoryOptions]);

  const newestProductIds = allProducts
    .slice()
    .sort((a, b) => new Date(b.creadoEn || 0).getTime() - new Date(a.creadoEn || 0).getTime())
    .slice(0, 12)
    .map(product => product.dbProductId);
  const featuredRankMap = new Map(highlightedProductIds.map((id, index) => [id, index]));
  const newestProductIdSet = new Set(newestProductIds);
  const featuredProductIdSet = new Set(highlightedProductIds);
  const showcaseCountMap = {
    [SHOWCASE_FILTERS.all]: allProducts.length,
    [SHOWCASE_FILTERS.featured]: highlightedProductIds.length,
    [SHOWCASE_FILTERS.newest]: newestProductIds.length
  };

  const handleShowcaseChange = (filterKey) => {
    setActiveShowcase((current) => current === filterKey ? SHOWCASE_FILTERS.all : filterKey);
    window.requestAnimationFrame(() => {
      catalogResultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const filtered = allProducts.filter(p => {
    const searchTerm = search.trim().toLowerCase();
    const matchSearch = searchTerm
      ? [p.nombre, p.descripcion, p.categoria]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(searchTerm))
      : true;
    const matchCategory = activeCategory === DEFAULT_CATEGORY || p.categoria === activeCategory;
    const matchShowcase =
      activeShowcase === SHOWCASE_FILTERS.all
        ? true
        : activeShowcase === SHOWCASE_FILTERS.featured
          ? featuredRankMap.has(p.dbProductId)
          : newestProductIds.includes(p.dbProductId);
    return matchSearch && matchCategory && matchShowcase;
  }).sort((a, b) => {
    if (activeShowcase === SHOWCASE_FILTERS.featured) {
      return (featuredRankMap.get(a.dbProductId) ?? Number.MAX_SAFE_INTEGER)
        - (featuredRankMap.get(b.dbProductId) ?? Number.MAX_SAFE_INTEGER);
    }

    if (activeShowcase === SHOWCASE_FILTERS.newest) {
      return new Date(b.creadoEn || 0).getTime() - new Date(a.creadoEn || 0).getTime();
    }

    return 0;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentItems = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const addToCart = (product, qty = 1) => {
    const activeStock = product.selectedVariant ? product.selectedVariant.stock : product.stock;
    if (activeStock === 0) return;

    const finalPrice = isVip ? Math.round(product.precio * (1 - VIP_DISCOUNT)) : product.precio;
    const cartItemId = product.selectedVariant
      ? `db_${product.dbProductId}__variant_${product.selectedVariant.id}`
      : product.id;

    const cart = readCart(user?.id);
    const existing = cart.find(i => i.id === cartItemId);
    if (existing) {
      existing.cantidad = Math.min(existing.cantidad + qty, activeStock);
    } else {
      cart.push({
        id: cartItemId,
        baseProductId: product.dbProductId,
        variantId: product.selectedVariant?.id || null,
        nombre: product.nombre,
        precio: finalPrice,
        cantidad: Math.min(qty, activeStock),
        stock: activeStock,
      });
    }
    writeCart(user?.id, cart);
    setAddedProduct({ id: cartItemId });
    setTimeout(() => setAddedProduct(null), 3500);
  };

  const getProductReviewSummary = (product) => {
    if (!product) return { average_rating: 0, total_reviews: 0 };
    return reviewSummaryMap[product.dbProductId ? `db_${product.dbProductId}` : product.reviewRef]
      || reviewSummaryMap[product.reviewRef]
      || { average_rating: 0, total_reviews: 0 };
  };

  const renderAuthPrompt = (variant = 'card') => (
    <div className={`catalog-auth-prompt catalog-auth-prompt--${variant}`} role="alert" aria-live="polite">
      <button
        type="button"
        className="catalog-auth-prompt-close"
        aria-label="Cerrar aviso"
        onClick={closeAuthPrompt}
      >
        <X size={16} />
      </button>
      <div className="catalog-auth-prompt-icon">
        <Lock size={18} />
      </div>
      <div className="catalog-auth-prompt-copy">
        <span className="catalog-auth-prompt-kicker">Acceso requerido</span>
        <strong>Inicia sesion o crea tu cuenta para guardar favoritos.</strong>
        <p>Tu carrito ya puede funcionar como cotizacion, pero la cuenta sigue siendo necesaria para wishlist y una experiencia personalizada.</p>
      </div>
      <div className="catalog-auth-prompt-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleAuthPromptAction('login')}
        >
          <span>Iniciar sesión</span>
        </button>
        <button
          type="button"
          className="btn-outline"
          onClick={() => handleAuthPromptAction('register')}
        >
          Registrarme
        </button>
      </div>
    </div>
  );

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

  useEffect(() => {
    if (!selectedProduct || !carouselRef.current) {
      return;
    }

    const activeThumb = carouselRef.current.querySelector('.product-detail-thumbnail.active');
    if (activeThumb) {
      activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [selectedProduct, selectedVariant]);

  const scrollGallery = (direction) => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({
      left: direction * 180,
      behavior: 'smooth'
    });
  };

  return (
    <>
      {/* ── MENÚ DE CATEGORÍAS ── */}
      <div className="catalog-header catalog-header-shell">
        <h1 className="catalog-header-title">Colecciones</h1>
        <p className="catalog-header-subtitle">Descubre nuestra exclusiva selección</p>
        
        {showVipBanner && (
        <div className={`catalog-vip-banner ${isVip ? 'is-active' : ''}`}>
          <div className="catalog-vip-main">
            <div className="catalog-vip-badge">
              <Crown size={18} />
              <span>{isVip ? 'VIP activo' : 'Programa VIP'}</span>
            </div>
            <div className="catalog-vip-copy">
              <h2>
                {isVip
                  ? 'Tu beneficio VIP ya esta activo.'
                  : 'Compra mas y accede a categoria VIP con 10% de descuento.'}
              </h2>
              <p>
                {isVip
                  ? 'Tu descuento exclusivo ya se aplica automaticamente en toda la coleccion.'
                  : 'Una forma elegante de premiar a quienes mas confian en Luxury Jewelry.'}
              </p>
            </div>
          </div>
          <div className="catalog-vip-actions">
            <div className="catalog-vip-highlight">
              <span className="catalog-vip-highlight-value">10%</span>
              <span className="catalog-vip-highlight-label">descuento VIP</span>
            </div>
            <button
              type="button"
              className="catalog-vip-cta"
              onClick={handleVipCta}
            >
              {isVip ? 'Ver coleccion' : isLoggedIn ? 'Comprar ahora' : 'Registrarme'}
            </button>
          </div>
        </div>
        )}

        {showFreeShippingNote && (
          <div className="catalog-free-shipping-note" role="note">
            <div className="catalog-free-shipping-note-icon" aria-hidden="true">
              <Sparkles size={16} />
            </div>
            <div className="catalog-free-shipping-note-copy">
              <strong>{isLoggedIn ? 'Tu primer envio gratis sigue activo' : 'Envío gratis en tu primera compra'}</strong>
              <span>
                {isLoggedIn
                  ? 'Haz tu primer pedido y el sistema aplicará el envío sin costo automáticamente.'
                  : 'Regístrate y el sistema aplicará el envío sin costo automáticamente en tu primer pedido.'}
              </span>
            </div>
            {!isLoggedIn ? (
              <button
                type="button"
                className="catalog-free-shipping-note-cta"
                onClick={() => openAuthModal('register')}
              >
                Crear cuenta
              </button>
            ) : (
              <button
                type="button"
                className="catalog-free-shipping-note-cta"
                onClick={handleVipCta}
              >
                Aprovechar
              </button>
            )}
          </div>
        )}
        
        <div className="catalog-premium-toolbar">
          <div className={`catalog-category-shell ${isCategoryMenuOpen ? 'open' : ''}`} ref={categoryMenuRef}>
            <div className="catalog-toolbar-main">
              <button
                id="catalog-category-trigger"
                type="button"
                className={`catalog-category-trigger ${isCategoryMenuOpen ? 'active' : ''}`}
                onClick={() => setIsCategoryMenuOpen((current) => !current)}
                aria-haspopup="listbox"
                aria-expanded={isCategoryMenuOpen}
              >
                <span className="catalog-category-trigger-copy">
                  <strong>Categorias</strong>
                  <small>{activeCategory} · {categoryCountMap[activeCategory] || 0} piezas</small>
                </span>
                <ChevronDown size={16} />
              </button>

              <div className="catalog-search-hero">
                <div className="search-box catalog-search-box">
                  <input
                    type="text"
                    placeholder="Buscar piezas, categorias o descripciones..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="catalog-toolbar-secondary">
              <div className="catalog-spotlight-actions" role="group" aria-label="Filtros destacados del catalogo">
                <button
                  type="button"
                  className={`catalog-spotlight-btn catalog-spotlight-btn--featured ${activeShowcase === SHOWCASE_FILTERS.featured ? 'active' : ''}`}
                  onClick={() => handleShowcaseChange(SHOWCASE_FILTERS.featured)}
                  aria-pressed={activeShowcase === SHOWCASE_FILTERS.featured}
                >
                  <span className="catalog-spotlight-btn-icon">
                    <Sparkles size={16} />
                  </span>
                  <span className="catalog-spotlight-btn-copy">
                    <strong>Productos mas destacados</strong>
                    <small>{showcaseCountMap[SHOWCASE_FILTERS.featured]} piezas recomendadas</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={`catalog-spotlight-btn catalog-spotlight-btn--new ${activeShowcase === SHOWCASE_FILTERS.newest ? 'active' : ''}`}
                  onClick={() => handleShowcaseChange(SHOWCASE_FILTERS.newest)}
                  aria-pressed={activeShowcase === SHOWCASE_FILTERS.newest}
                >
                  <span className="catalog-spotlight-btn-icon">
                    <Clock3 size={16} />
                  </span>
                  <span className="catalog-spotlight-btn-copy">
                    <strong>Productos nuevos</strong>
                    <small>{showcaseCountMap[SHOWCASE_FILTERS.newest]} ingresos recientes</small>
                  </span>
                </button>
              </div>
              {activeShowcase !== SHOWCASE_FILTERS.all && (
                <button
                  type="button"
                  className="catalog-spotlight-reset"
                  onClick={() => setActiveShowcase(SHOWCASE_FILTERS.all)}
                >
                  Quitar filtro
                </button>
              )}
            </div>

            <div className="catalog-category-rail" role="listbox" aria-label="Categorias del catalogo">
              {categoryOptions.map(cat => (
                <button
                  key={cat}
                  type="button"
                  className={`catalog-category-chip ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setActiveCategory(cat);
                    setIsCategoryMenuOpen(false);
                  }}
                  role="option"
                  aria-selected={activeCategory === cat}
                >
                  <span>{cat}</span>
                  <small>{categoryCountMap[cat] || 0}</small>
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Toast removed in favor of in-card validation */}

      <div className="catalog-container" ref={catalogResultsRef}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-muted)' }}>
            <h3 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--gold)', marginBottom: '16px' }}>No encontramos piezas para este filtro</h3>
            <p>Prueba con otra categoria, otra busqueda o cambia entre destacados y nuevos.</p>
          </div>
        ) : (
          <>
            <div className="catalog-results-head">
              <div>
                <span className="catalog-results-kicker">
                  {activeShowcase === SHOWCASE_FILTERS.featured
                    ? 'Seleccion destacada'
                    : activeShowcase === SHOWCASE_FILTERS.newest
                      ? 'Novedades del catalogo'
                      : 'Resultados del catalogo'}
                </span>
                <h2>
                  {activeShowcase === SHOWCASE_FILTERS.featured
                    ? 'Piezas mas destacadas'
                    : activeShowcase === SHOWCASE_FILTERS.newest
                      ? 'Ultimos ingresos'
                      : 'Coleccion disponible'}
                </h2>
              </div>
              <span className="catalog-results-count">{filtered.length} productos</span>
            </div>
            <div className="catalog-grid">
              {currentItems.map(p => {
                const reviewSummary = getProductReviewSummary(p);
                const isFeaturedProduct = featuredProductIdSet.has(p.dbProductId);
                const isNewestProduct = newestProductIdSet.has(p.dbProductId);
                return (
                <div className={`product-card catalog-product-card ${p.stock === 0 ? 'out-of-stock' : ''}`} key={p.id}>
                  <div className="product-image-wrap">
                    <img src={p.img} alt={p.nombre} style={p.stock === 0 ? { filter: 'grayscale(0.8) opacity(0.6)' } : {}} />
                    <button onClick={(e) => { e.stopPropagation(); toggleWishlist(p.dbProductId); }} style={{ position: 'absolute', top: '12px', left: '12px', background: isInWishlist(p.dbProductId) ? 'rgba(231,76,60,0.9)' : 'rgba(10,10,10,0.6)', backdropFilter: 'blur(4px)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.3s', zIndex: 3, color: '#fff' }}
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
                    {(isFeaturedProduct || isNewestProduct) && (
                      <div className="catalog-product-tags">
                        {isFeaturedProduct && (
                          <span className="catalog-product-tag catalog-product-tag--featured">
                            <Sparkles size={12} />
                            Destacado
                          </span>
                        )}
                        {isNewestProduct && (
                          <span className="catalog-product-tag catalog-product-tag--new">
                            <Clock3 size={12} />
                            Nuevo
                          </span>
                        )}
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
                        {p.variantes.length} variantes disponibles
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
                    {authPromptTarget?.type === 'card' && authPromptTarget.productId === p.dbProductId && (
                      renderAuthPrompt('card')
                    )}
                  </div>
                </div>
              )})}
            </div>
            
            {totalPages > 1 && (
              <div className="pagination-container">
                <button 
                  className="pagination-btn" 
                  disabled={currentPage === 1} 
                  onClick={() => {
                    setCurrentPage(prev => prev - 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page} 
                    className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentPage(page);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    {page}
                  </button>
                ))}
                
                <button 
                  className="pagination-btn" 
                  disabled={currentPage === totalPages} 
                  onClick={() => {
                    setCurrentPage(prev => prev + 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {selectedProduct && (
          (() => {
            const activeVariant = selectedVariant || null;
            const selectedStock = activeVariant ? activeVariant.stock : selectedProduct.stock;
            const activeImage = activeVariant?.img || selectedProduct.img;
            const galleryImages = [
              {
                key: 'base',
                src: selectedProduct.img,
                alt: selectedProduct.nombre,
                isActive: !activeVariant,
                onClick: () => {
                  setSelectedVariant(null);
                  setQuantity(1);
                }
              },
              ...(selectedProduct.variantes || []).map((variant) => ({
                key: `variant_${variant.id}`,
                src: variant.img,
                alt: `Variante ${variant.orden + 1}`,
                isActive: activeVariant?.id === variant.id,
                onClick: () => {
                  setSelectedVariant(variant);
                  setQuantity(1);
                }
              }))
            ];
            const cartSelectionId = activeVariant
              ? `db_${selectedProduct.dbProductId}__variant_${activeVariant.id}`
              : selectedProduct.id;
            return createPortal(
        <div 
          className="modal-overlay"
          style={{ 
            position: 'fixed', inset: 0,
            background: 'rgba(5, 5, 5, 0.95)', backdropFilter: 'blur(15px)', zIndex: 99999, 
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            paddingTop: 'calc(var(--header-height) + 20px)'
          }} 
          onClick={(e) => { if(e.target === e.currentTarget) setSelectedProduct(null) }}
        >
          <div className="product-detail-modal" style={{
            width: '100%', maxWidth: '960px',
            maxHeight: 'calc(100vh - var(--header-height) - 60px)',
            background: 'linear-gradient(145deg, rgba(20, 20, 20, 0.95), rgba(10, 10, 10, 0.98))',
            borderRadius: '16px', border: '1px solid var(--border-gold)', boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
            display: 'flex', overflow: 'hidden', position: 'relative'
          }}>
            <button className="product-detail-close" onClick={() => setSelectedProduct(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(10,10,10,0.5)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', zIndex: 10, width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }} onMouseOver={e => {e.currentTarget.style.color='var(--rose-gold)'; e.currentTarget.style.background='rgba(30,30,30,0.8)'}} onMouseOut={e => {e.currentTarget.style.color='var(--text-muted)'; e.currentTarget.style.background='rgba(10,10,10,0.5)'}}>
              <X size={32} strokeWidth={1} />
            </button>
            <div className="modal-img-col" style={{ flex: '1', position: 'relative', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
               <img src={activeImage} alt={selectedProduct.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.95)', flex: 1 }} />
               <div className="product-detail-category" style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(10,10,10,0.6)', backdropFilter: 'blur(4px)', border: '1px solid var(--gold)', padding: '6px 16px', borderRadius: '4px', color: 'var(--gold)', letterSpacing: '2px', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                  {selectedProduct.categoria}
               </div>
               {galleryImages.length > 1 && (
                 <div className="product-detail-gallery-shell">
                   <button
                     type="button"
                     className="product-detail-gallery-arrow product-detail-gallery-arrow--prev"
                     onClick={() => scrollGallery(-1)}
                     aria-label="Ver imagenes anteriores"
                   >
                     <ChevronLeft size={16} />
                   </button>
                   <div className="product-detail-gallery" ref={carouselRef}>
                     {galleryImages.map((image) => (
                       <img
                         key={image.key}
                         src={image.src}
                         alt={image.alt}
                         className={`product-detail-thumbnail ${image.isActive ? 'active' : ''}`}
                         onClick={image.onClick}
                       />
                     ))}
                   </div>
                   <button
                     type="button"
                     className="product-detail-gallery-arrow product-detail-gallery-arrow--next"
                     onClick={() => scrollGallery(1)}
                     aria-label="Ver imagenes siguientes"
                   >
                     <ChevronRight size={16} />
                   </button>
                 </div>
               )}
            </div>
            <div className="modal-info-col" style={{ flex: '1', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', overflowY: 'auto', minHeight: 0 }}>
               <h2 className="product-detail-title" style={{ marginTop: '0', fontFamily: 'var(--font-display)', fontSize: '2.2rem', color: 'var(--text-primary)', marginBottom: '16px', lineHeight: '1.2' }}>{selectedProduct.nombre}</h2>
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
               {authPromptTarget?.type === 'modal' && authPromptTarget.productId === selectedProduct.dbProductId && (
                 renderAuthPrompt('modal')
               )}
            </div>
          </div>
        </div>,
        document.body
            );
          })()
      )}

    </>
  );
}
