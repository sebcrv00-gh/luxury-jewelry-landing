import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  LayoutDashboard, ShoppingBag, Truck, CreditCard, MapPin, RotateCcw,
  Heart, FileText, UserCog, MessageCircle, LogOut, Crown, Package,
  ChevronRight, Clock, CheckCircle, AlertCircle, Plus, Trash2, Star, Send, Eye, X, Minus,
  Gem, Phone
} from 'lucide-react';
import './client-dashboard.css';

const SECTIONS = [
  { id: 'panel', icon: LayoutDashboard, label: 'Mi Panel' },
  { id: 'pedidos', icon: ShoppingBag, label: 'Mis Pedidos' },
  { id: 'seguimiento', icon: Truck, label: 'Seguimiento' },
  { id: 'wishlist', icon: Heart, label: 'Lista de Deseos' },
  { id: 'direcciones', icon: MapPin, label: 'Direcciones' },
  { id: 'devoluciones', icon: RotateCcw, label: 'Devoluciones' },
  { id: 'facturas', icon: FileText, label: 'Facturas' },
  { id: 'perfil', icon: UserCog, label: 'Mi Perfil' },
  { id: 'soporte', icon: MessageCircle, label: 'Soporte' },
];

const STATUS_MAP = {
  pendiente: { label: 'Pendiente', color: '#f39c12', icon: Clock },
  procesando: { label: 'Procesando', color: '#3498db', icon: Package },
  enviado: { label: 'Enviado', color: '#9b59b6', icon: Truck },
  entregado: { label: 'Entregado', color: '#2ecc71', icon: CheckCircle },
  cancelado: { label: 'Cancelado', color: '#e74c3c', icon: AlertCircle },
};

export default function ClientDashboard() {
  const { user, isLoggedIn, loading, logout, updateProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const pathSegment = location.pathname.split('/mi-cuenta/')[1] || 'panel';
  const [activeSection, setActiveSection] = useState(pathSegment);

  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Profile state
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [profileMsg, setProfileMsg] = useState(null);

  // Address form
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrForm, setAddrForm] = useState({ etiqueta: 'Casa', nombre_completo: '', telefono: '', direccion: '', ciudad: '', departamento: '', es_principal: false });

  // Ticket form
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketForm, setTicketForm] = useState({ asunto: '', mensaje: '' });

  const fotoSrc = user?.foto ? `http://localhost:3001/${user.foto}` : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

  useEffect(() => {
    if (!loading && !isLoggedIn) navigate('/login');
  }, [loading, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      loadOrders();
      loadWishlist();
      loadAddresses();
      loadTickets();
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (user) { setNombre(user.nombre || ''); setEmail(user.email || ''); setTelefono(user.telefono || ''); setDireccion(user.direccion || ''); }
  }, [user]);

  useEffect(() => {
    const seg = location.pathname.split('/mi-cuenta/')[1] || 'panel';
    setActiveSection(seg);
  }, [location.pathname]);

  const loadOrders = async () => { try { const { data } = await api.get('/orders/mine/detailed'); setOrders(data); } catch (e) { console.error(e); } };
  const loadWishlist = async () => { try { const { data } = await api.get('/wishlist'); setWishlist(data); } catch (e) { console.error(e); } };
  const loadAddresses = async () => { try { const { data } = await api.get('/addresses'); setAddresses(data); } catch (e) { console.error(e); } };
  const loadTickets = async () => { try { const { data } = await api.get('/tickets'); setTickets(data); } catch (e) { console.error(e); } };

  const removeWishlistItem = async (productId) => { await api.delete(`/wishlist/${productId}`); loadWishlist(); };
  const deleteAddress = async (id) => { await api.delete(`/addresses/${id}`); loadAddresses(); };
  const setDefaultAddress = async (id) => { await api.put(`/addresses/${id}/default`); loadAddresses(); };

  const saveAddress = async (e) => {
    e.preventDefault();
    await api.post('/addresses', addrForm);
    setShowAddrForm(false);
    setAddrForm({ etiqueta: 'Casa', nombre_completo: '', telefono: '', direccion: '', ciudad: '', departamento: '', es_principal: false });
    loadAddresses();
  };

  const submitTicket = async (e) => {
    e.preventDefault();
    await api.post('/tickets', ticketForm);
    setShowTicketForm(false);
    setTicketForm({ asunto: '', mensaje: '' });
    loadTickets();
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('nombre', nombre); formData.append('email', email);
      formData.append('telefono', telefono); formData.append('direccion', direccion);
      await updateProfile(formData);
      setProfileMsg({ type: 'success', text: 'Perfil actualizado correctamente' });
    } catch (err) { setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Error' }); }
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const goTo = (section) => {
    setActiveSection(section);
    navigate(`/mi-cuenta/${section === 'panel' ? '' : section}`);
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  if (loading) return <div className="cd-loading"><div className="spinner"></div><p>Cargando tu espacio exclusivo...</p></div>;
  if (!user) return null;

  const recentOrders = orders.slice(0, 5);
  const statusInfo = (s) => STATUS_MAP[s] || STATUS_MAP.pendiente;

  return (
    <div className="cd-layout">
      {/* SIDEBAR */}
      <aside className="cd-sidebar">
        <div className="cd-profile-card">
          <img src={fotoSrc} alt="Avatar" className="cd-avatar" />
          <h3 className="cd-user-name">{user.nombre}</h3>
          <span className="cd-user-role">
            {user.rol === 'vip' && <><Crown size={14} /> Cliente VIP</>}
            {user.rol === 'admin' && 'Administrador'}
            {user.rol === 'cliente' && 'Miembro Exclusivo'}
          </span>
        </div>

        <nav className="cd-nav">
          {SECTIONS.map(s => (
            <div key={s.id} className={`cd-nav-item ${activeSection === s.id ? 'active' : ''}`} onClick={() => goTo(s.id)}>
              <s.icon size={18} /><span>{s.label}</span>
            </div>
          ))}
        </nav>

        <button className="cd-logout-btn" onClick={handleLogout}><LogOut size={16} /><span>Cerrar Sesión</span></button>
      </aside>

      {/* MAIN */}
      <main className="cd-main">

        {/* ═══ MI PANEL ═══ */}
        {activeSection === 'panel' && (
          <div className="cd-section">
            <h2 className="cd-title">Bienvenido, {user.nombre?.split(' ')[0]}</h2>
            <p className="cd-subtitle">Tu resumen de actividad en Luxury Jewelry</p>

            <div className="cd-stats-row">
              <div className="cd-stat-card"><ShoppingBag size={28} /><div><span className="cd-stat-val">{orders.length}</span><span className="cd-stat-lbl">Pedidos</span></div></div>
              <div className="cd-stat-card"><Heart size={28} /><div><span className="cd-stat-val">{wishlist.length}</span><span className="cd-stat-lbl">Deseados</span></div></div>
              <div className="cd-stat-card"><MapPin size={28} /><div><span className="cd-stat-val">{addresses.length}</span><span className="cd-stat-lbl">Direcciones</span></div></div>
              <div className="cd-stat-card"><MessageCircle size={28} /><div><span className="cd-stat-val">{tickets.length}</span><span className="cd-stat-lbl">Tickets</span></div></div>
            </div>

            <div className="cd-card">
              <h3>Últimos Pedidos</h3>
              {recentOrders.length === 0 ? (
                <p className="cd-empty">Aún no tienes pedidos. ¡Explora nuestro catálogo!</p>
              ) : (
                <div className="cd-table-wrap">
                  <table className="cd-table">
                    <thead><tr><th>Pedido</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
                    <tbody>
                      {recentOrders.map(o => { const si = statusInfo(o.estado); return (
                        <tr key={o.id}>
                          <td style={{fontWeight:600}}>#{o.id}</td>
                          <td>{new Date(o.creado_en).toLocaleDateString('es-CO')}</td>
                          <td>${Number(o.total).toLocaleString('es-CO')}</td>
                          <td><span className="cd-badge" style={{background:`${si.color}20`,color:si.color,border:`1px solid ${si.color}40`}}><si.icon size={12}/>{si.label}</span></td>
                          <td><button className="cd-link-btn" onClick={() => { setSelectedOrder(o); goTo('pedidos'); }}>Ver <ChevronRight size={14}/></button></td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ MIS PEDIDOS ═══ */}
        {activeSection === 'pedidos' && (
          <div className="cd-section">
            <h2 className="cd-title">Historial de Compras</h2>
            <p className="cd-subtitle">Todas tus compras realizadas en Luxury Jewelry</p>
            {selectedOrder ? (
              <div className="cd-card">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                  <h3>Pedido #{selectedOrder.id}</h3>
                  <button className="cd-link-btn" onClick={() => setSelectedOrder(null)}><X size={16}/> Cerrar</button>
                </div>
                <div className="cd-order-meta">
                  <span>📅 {new Date(selectedOrder.creado_en).toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' })}</span>
                  <span className="cd-badge" style={{background:`${statusInfo(selectedOrder.estado).color}20`,color:statusInfo(selectedOrder.estado).color,border:`1px solid ${statusInfo(selectedOrder.estado).color}40`}}>{statusInfo(selectedOrder.estado).label}</span>
                </div>
                <div className="cd-table-wrap" style={{marginTop:20}}>
                  <table className="cd-table">
                    <thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr></thead>
                    <tbody>
                      {(selectedOrder.items || []).map((it, i) => (
                        <tr key={i}><td>{it.producto_nombre}</td><td>${Number(it.producto_precio).toLocaleString('es-CO')}</td><td>{it.cantidad}</td><td>${Number(it.subtotal).toLocaleString('es-CO')}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{textAlign:'right',marginTop:20,fontSize:'1.3rem',color:'var(--gold-light)',fontFamily:'var(--font-display)'}}>Total: ${Number(selectedOrder.total).toLocaleString('es-CO')}</div>
                <div className="cd-ship-info">
                  <h4>Datos de Envío</h4>
                  <p>{selectedOrder.nombre_envio} · {selectedOrder.telefono_envio}</p>
                  <p>{selectedOrder.direccion_envio}, {selectedOrder.ciudad_envio}</p>
                  {selectedOrder.notas && <p style={{fontStyle:'italic',opacity:0.7}}>Nota: {selectedOrder.notas}</p>}
                </div>
              </div>
            ) : (
              <>
                {orders.length === 0 ? <div className="cd-empty-state"><ShoppingBag size={48}/><p>No tienes pedidos aún</p></div> : (
                  <div className="cd-table-wrap">
                    <table className="cd-table">
                      <thead><tr><th>#</th><th>Fecha</th><th>Productos</th><th>Total</th><th>Estado</th><th></th></tr></thead>
                      <tbody>
                        {orders.map(o => { const si = statusInfo(o.estado); return (
                          <tr key={o.id}>
                            <td style={{fontWeight:600}}>#{o.id}</td>
                            <td>{new Date(o.creado_en).toLocaleDateString('es-CO')}</td>
                            <td>{o.items?.length || 0} artículos</td>
                            <td style={{color:'var(--gold-light)'}}>${Number(o.total).toLocaleString('es-CO')}</td>
                            <td><span className="cd-badge" style={{background:`${si.color}20`,color:si.color,border:`1px solid ${si.color}40`}}><si.icon size={12}/>{si.label}</span></td>
                            <td><button className="cd-link-btn" onClick={() => setSelectedOrder(o)}><Eye size={14}/> Detalles</button></td>
                          </tr>
                        ); })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ SEGUIMIENTO ═══ */}
        {activeSection === 'seguimiento' && (
          <div className="cd-section">
            <h2 className="cd-title">Seguimiento de Pedidos</h2>
            <p className="cd-subtitle">Monitorea el progreso de tus envíos en tiempo real</p>
            {orders.length === 0 ? <div className="cd-empty-state"><Truck size={48}/><p>No hay pedidos para seguir</p></div> : (
              <div className="cd-tracking-list">
                {orders.filter(o => o.estado !== 'cancelado').map(o => {
                  const steps = ['pendiente', 'procesando', 'enviado', 'entregado'];
                  const currentIdx = steps.indexOf(o.estado);
                  return (
                    <div className="cd-card cd-tracking-card" key={o.id}>
                      <div className="cd-tracking-header">
                        <span style={{fontWeight:600,fontSize:'1.1rem'}}>Pedido #{o.id}</span>
                        <span style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>{new Date(o.creado_en).toLocaleDateString('es-CO')}</span>
                      </div>
                      <div className="cd-progress-bar">
                        {steps.map((step, idx) => {
                          const si = STATUS_MAP[step];
                          const done = idx <= currentIdx;
                          return (
                            <div key={step} className={`cd-progress-step ${done ? 'done' : ''}`}>
                              <div className="cd-step-dot" style={done ? {background: si.color, boxShadow: `0 0 12px ${si.color}50`} : {}}>
                                <si.icon size={14} />
                              </div>
                              <span className="cd-step-label">{si.label}</span>
                              {idx < steps.length - 1 && <div className={`cd-step-line ${idx < currentIdx ? 'filled' : ''}`}/>}
                            </div>
                          );
                        })}
                      </div>
                      <p style={{color:'var(--text-muted)',fontSize:'0.8rem',marginTop:16}}>Total: ${Number(o.total).toLocaleString('es-CO')} · Envío a: {o.ciudad_envio}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ WISHLIST ═══ */}
        {activeSection === 'wishlist' && (
          <div className="cd-section">
            <h2 className="cd-title">Lista de Deseos</h2>
            <p className="cd-subtitle">Piezas exclusivas que has guardado</p>
            {wishlist.length === 0 ? <div className="cd-empty-state"><Heart size={48}/><p>Tu lista de deseos está vacía</p><button className="cd-action-btn" onClick={() => navigate('/catalogo')}>Explorar Catálogo</button></div> : (
              <div className="cd-wish-grid">
                {wishlist.map(item => (
                  <div className="cd-wish-card" key={item.id}>
                    <div className="cd-wish-img">
                      {item.imagen_url ? <img src={`http://localhost:3001/${item.imagen_url}`} alt={item.nombre}/> : <div className="cd-wish-placeholder"><Heart size={32}/></div>}
                    </div>
                    <div className="cd-wish-info">
                      <h4>{item.nombre}</h4>
                      <p className="cd-wish-price">${Number(item.precio).toLocaleString('es-CO')}</p>
                      <span className="cd-wish-stock">{item.stock > 0 ? `${item.stock} en stock` : 'Agotado'}</span>
                    </div>
                    <div className="cd-wish-actions">
                      <button className="cd-action-btn small" onClick={() => navigate('/catalogo')}>Ver en tienda</button>
                      <button className="cd-remove-btn" onClick={() => removeWishlistItem(item.producto_id)}><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ DIRECCIONES ═══ */}
        {activeSection === 'direcciones' && (
          <div className="cd-section">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <div><h2 className="cd-title" style={{margin:0}}>Direcciones de Envío</h2><p className="cd-subtitle" style={{margin:0}}>Gestiona tus direcciones para despacho</p></div>
              <button className="cd-action-btn" onClick={() => setShowAddrForm(!showAddrForm)}><Plus size={16}/> Nueva Dirección</button>
            </div>
            {showAddrForm && (
              <form className="cd-card cd-form" onSubmit={saveAddress} style={{marginBottom:24}}>
                <div className="cd-form-grid">
                  <div><label>Etiqueta</label><select value={addrForm.etiqueta} onChange={e => setAddrForm({...addrForm, etiqueta: e.target.value})} className="cd-input"><option>Casa</option><option>Oficina</option><option>Otro</option></select></div>
                  <div><label>Nombre completo</label><input className="cd-input" required value={addrForm.nombre_completo} onChange={e => setAddrForm({...addrForm, nombre_completo: e.target.value})}/></div>
                  <div><label>Teléfono</label><input className="cd-input" value={addrForm.telefono} onChange={e => setAddrForm({...addrForm, telefono: e.target.value})}/></div>
                  <div style={{gridColumn:'span 2'}}><label>Dirección</label><input className="cd-input" required value={addrForm.direccion} onChange={e => setAddrForm({...addrForm, direccion: e.target.value})}/></div>
                  <div><label>Ciudad</label><input className="cd-input" required value={addrForm.ciudad} onChange={e => setAddrForm({...addrForm, ciudad: e.target.value})}/></div>
                  <div><label>Departamento</label><input className="cd-input" value={addrForm.departamento} onChange={e => setAddrForm({...addrForm, departamento: e.target.value})}/></div>
                </div>
                <label style={{display:'flex',alignItems:'center',gap:8,marginTop:16,color:'var(--text-secondary)',fontSize:'0.85rem',cursor:'pointer'}}>
                  <input type="checkbox" checked={addrForm.es_principal} onChange={e => setAddrForm({...addrForm, es_principal: e.target.checked})}/> Marcar como dirección principal
                </label>
                <div style={{display:'flex',gap:12,marginTop:20}}>
                  <button type="submit" className="cd-action-btn">Guardar</button>
                  <button type="button" className="cd-link-btn" onClick={() => setShowAddrForm(false)}>Cancelar</button>
                </div>
              </form>
            )}
            {addresses.length === 0 && !showAddrForm ? <div className="cd-empty-state"><MapPin size={48}/><p>No tienes direcciones guardadas</p></div> : (
              <div className="cd-addr-grid">
                {addresses.map(a => (
                  <div className={`cd-card cd-addr-card ${a.es_principal ? 'primary' : ''}`} key={a.id}>
                    {a.es_principal && <span className="cd-primary-badge"><Star size={12}/> Principal</span>}
                    <h4>{a.etiqueta}</h4>
                    <p>{a.nombre_completo}</p>
                    <p className="cd-addr-detail">{a.direccion}</p>
                    <p className="cd-addr-detail">{a.ciudad}{a.departamento ? `, ${a.departamento}` : ''}</p>
                    {a.telefono && <p className="cd-addr-detail">Tel: {a.telefono}</p>}
                    <div className="cd-addr-actions">
                      {!a.es_principal && <button className="cd-link-btn" onClick={() => setDefaultAddress(a.id)}>Hacer principal</button>}
                      <button className="cd-remove-btn" onClick={() => deleteAddress(a.id)}><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ DEVOLUCIONES ═══ */}
        {activeSection === 'devoluciones' && (
          <div className="cd-section">
            <h2 className="cd-title">Devoluciones y Reclamos</h2>
            <p className="cd-subtitle">Gestiona tus solicitudes de devolución</p>
            <div className="cd-card">
              <p className="cd-empty">Para solicitar una devolución, abre un <button className="cd-link-btn" onClick={() => goTo('soporte')} style={{display:'inline'}}>ticket de soporte</button> indicando el número de pedido y el motivo de la devolución. Nuestro equipo te atenderá en menos de 24 horas.</p>
            </div>
            {tickets.filter(t => t.asunto.toLowerCase().includes('devol') || t.asunto.toLowerCase().includes('reclam')).length > 0 && (
              <div className="cd-card" style={{marginTop:16}}>
                <h3>Solicitudes Relacionadas</h3>
                {tickets.filter(t => t.asunto.toLowerCase().includes('devol') || t.asunto.toLowerCase().includes('reclam')).map(t => (
                  <div key={t.id} className="cd-ticket-row">
                    <span>#{t.id} — {t.asunto}</span>
                    <span className="cd-badge" style={{background: t.estado === 'abierto' ? 'rgba(243,156,18,0.15)' : 'rgba(46,204,113,0.15)', color: t.estado === 'abierto' ? '#f39c12' : '#2ecc71'}}>{t.estado}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ FACTURAS ═══ */}
        {activeSection === 'facturas' && (
          <div className="cd-section">
            <h2 className="cd-title">Facturas</h2>
            <p className="cd-subtitle">Historial de facturación de tus compras</p>
            {orders.length === 0 ? <div className="cd-empty-state"><FileText size={48}/><p>No hay facturas generadas</p></div> : (
              <div className="cd-table-wrap">
                <table className="cd-table">
                  <thead><tr><th>Factura</th><th>Fecha</th><th>Total</th><th>Estado</th><th></th></tr></thead>
                  <tbody>
                    {orders.map(o => (
                      <tr key={o.id}>
                        <td style={{fontWeight:600}}>LJ-{String(o.id).padStart(5, '0')}</td>
                        <td>{new Date(o.creado_en).toLocaleDateString('es-CO')}</td>
                        <td>${Number(o.total).toLocaleString('es-CO')}</td>
                        <td><span className="cd-badge" style={{background:'rgba(46,204,113,0.15)',color:'#2ecc71'}}>Pagada</span></td>
                        <td><button className="cd-link-btn" onClick={() => { setSelectedOrder(o); goTo('pedidos'); }}><Eye size={14}/> Ver detalle</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ PERFIL (MEMBRESÍA) ═══ */}
        {activeSection === 'perfil' && (() => {
          // Calcular estadísticas avanzadas
          const totalOrders = orders.length;
          const allItems = orders.flatMap(o => o.items || []);
          
          // Encontrar el artículo más comprado
          const itemCounts = allItems.reduce((acc, item) => {
            acc[item.producto_nombre] = (acc[item.producto_nombre] || 0) + item.cantidad;
            return acc;
          }, {});
          
          let bestItem = "Aún no hay compras";
          let maxQty = 0;
          Object.entries(itemCounts).forEach(([name, qty]) => {
            if (qty > maxQty) {
              maxQty = qty;
              bestItem = name;
            }
          });

          return (
            <div className="cd-section">
              <h2 className="cd-title">Membresía Luxury</h2>
              <p className="cd-subtitle">Detalles de tu estatus exclusivo en nuestra joyería</p>
              
              <div className="cd-membership-card" style={{ 
                background: 'linear-gradient(135deg, rgba(20,20,20,0.8), rgba(10,10,10,0.95))',
                border: '1px solid var(--gold)',
                borderRadius: '24px',
                padding: '50px',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                marginTop: '30px'
              }}>
                {/* Decoración de fondo */}
                <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '200px', height: '200px', background: 'radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)', borderRadius: '50%' }}></div>
                <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(201,168,76,0.1) 0%, transparent 70%)', borderRadius: '50%' }}></div>

                <div style={{ display: 'flex', gap: '50px', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                  {/* Foto y Badge */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: '160px', height: '160px', borderRadius: '50%', border: '3px solid var(--gold)', padding: '6px', background: 'rgba(201,168,76,0.1)', marginBottom: '20px' }}>
                      <img src={fotoSrc} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    </div>
                    {user.rol === 'admin' ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(201,168,76,0.2)', color: 'var(--gold-light)', padding: '8px 24px', borderRadius: '50px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', border: '1px solid var(--gold)' }}>
                        <Crown size={16} /> ADMINISTRADOR
                      </div>
                    ) : user.rol === 'vip' ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(90deg, #FFD700, #C9A84C)', color: 'black', padding: '8px 24px', borderRadius: '50px', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', boxShadow: '0 10px 20px rgba(255,215,0,0.2)' }}>
                        <Crown size={16} /> CLIENTE VIP
                      </div>
                    ) : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '8px 24px', borderRadius: '50px', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '2px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        MIEMBRO ESTÁNDAR
                      </div>
                    )}
                  </div>

                  {/* Datos y Stats */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '2.8rem', color: 'var(--text-primary)', marginBottom: '5px', letterSpacing: '1px' }}>{user.nombre}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '35px', letterSpacing: '1px' }}>{user.email}</p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Compras Realizadas</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <ShoppingBag size={22} style={{ color: 'var(--gold-light)' }} />
                          <span style={{ fontSize: '1.6rem', fontWeight: '600', color: 'var(--text-primary)' }}>{totalOrders}</span>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '8px' }}>Tu Joya Predilecta</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <Gem size={22} style={{ color: 'var(--gold-light)' }} />
                          <span style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{bestItem}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '30px', display: 'flex', gap: '20px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={14} /> {user.telefono || 'Sin teléfono'}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><MapPin size={14} /> {user.direccion || 'Sin dirección'}</div>
                    </div>
                  </div>
                </div>

                {/* Sello de Autenticidad */}
                <div style={{ position: 'absolute', bottom: '20px', right: '30px', opacity: 0.1, transform: 'rotate(-10deg)' }}>
                  <img src="/images/Logo_Luxury_Joyeria-removebg-preview.png" alt="Seal" style={{ width: '120px' }} />
                </div>
              </div>
              
              <div style={{ marginTop: '30px', padding: '20px', borderRadius: '12px', background: 'rgba(255,193,7,0.05)', border: '1px solid rgba(255,193,7,0.1)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                <AlertCircle size={20} style={{ color: '#ffc107' }} />
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', margin: 0 }}>
                  Esta es tu tarjeta de membresía digital. Tus datos han sido verificados por nuestros expertos joyeros. 
                  ¿Deseas actualizar tu información? <span onClick={() => navigate(user.rol === 'admin' ? '/admin?tab=profile' : '/perfil')} style={{ color: 'var(--gold-light)', cursor: 'pointer', textDecoration: 'underline', fontWeight: 'bold' }}>Haz clic aquí para editar tu perfil.</span>
                </p>
              </div>
            </div>
          );
        })()}

        {/* ═══ SOPORTE ═══ */}
        {activeSection === 'soporte' && (
          <div className="cd-section">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <div><h2 className="cd-title" style={{margin:0}}>Soporte y Mensajes</h2><p className="cd-subtitle" style={{margin:0}}>Comunícate con nuestro equipo de atención</p></div>
              <button className="cd-action-btn" onClick={() => setShowTicketForm(!showTicketForm)}><Plus size={16}/> Nuevo Ticket</button>
            </div>
            {showTicketForm && (
              <form className="cd-card cd-form" onSubmit={submitTicket} style={{marginBottom:24}}>
                <div><label>Asunto</label><input className="cd-input" required value={ticketForm.asunto} onChange={e => setTicketForm({...ticketForm, asunto: e.target.value})} placeholder="Ej: Devolución del pedido #42"/></div>
                <div style={{marginTop:16}}><label>Mensaje</label><textarea className="cd-input cd-textarea" required value={ticketForm.mensaje} onChange={e => setTicketForm({...ticketForm, mensaje: e.target.value})} placeholder="Describe tu solicitud en detalle..." rows={5}/></div>
                <div style={{display:'flex',gap:12,marginTop:20}}>
                  <button type="submit" className="cd-action-btn"><Send size={14}/> Enviar Ticket</button>
                  <button type="button" className="cd-link-btn" onClick={() => setShowTicketForm(false)}>Cancelar</button>
                </div>
              </form>
            )}
            {tickets.length === 0 && !showTicketForm ? <div className="cd-empty-state"><MessageCircle size={48}/><p>No tienes tickets abiertos</p></div> : (
              <div className="cd-tickets-list">
                {tickets.map(t => (
                  <div className="cd-card cd-ticket-card" key={t.id}>
                    <div className="cd-ticket-header">
                      <span style={{fontWeight:600}}>#{t.id} — {t.asunto}</span>
                      <span className="cd-badge" style={{background: t.estado === 'abierto' ? 'rgba(243,156,18,0.15)' : t.estado === 'resuelto' ? 'rgba(46,204,113,0.15)' : 'rgba(52,152,219,0.15)', color: t.estado === 'abierto' ? '#f39c12' : t.estado === 'resuelto' ? '#2ecc71' : '#3498db', border: `1px solid ${t.estado === 'abierto' ? 'rgba(243,156,18,0.3)' : t.estado === 'resuelto' ? 'rgba(46,204,113,0.3)' : 'rgba(52,152,219,0.3)'}`}}>{t.estado}</span>
                    </div>
                    <p style={{color:'var(--text-muted)',fontSize:'0.85rem',marginTop:8,lineHeight:1.6}}>{t.mensaje}</p>
                    <span style={{color:'var(--text-muted)',fontSize:'0.72rem',marginTop:12,display:'block'}}>{new Date(t.creado_en).toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
