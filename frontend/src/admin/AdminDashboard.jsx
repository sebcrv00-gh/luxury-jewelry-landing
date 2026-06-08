import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getImageUrl } from '../api/axios';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Gem,
  AlertTriangle,
  Layers,
  Database,
  MessageSquare,
  Crown,
  Menu,
  X
} from 'lucide-react';
import AddProduct from './AddProduct';
import ProductListAdmin from './ProductListAdmin';
import OrderListAdmin from './OrderListAdmin';
import ClientsAdmin from './ClientsAdmin';
import TicketListAdmin from './TicketListAdmin';
import SettingsAdmin from './SettingsAdmin';
import ProfileAdmin from './ProfileAdmin';
import './admin-layout.css'; // Importamos el CSS premium

const TAB_META = {
  dashboard: {
    title: 'Centro de Control'
  },
  inventory: {
    title: 'Catálogo e Inventario'
  },
  orders: {
    title: 'Gestión de Pedidos'
  },
  clients: {
    title: 'Gestión de Clientes'
  },
  tickets: {
    title: 'Soporte'
  },
  settings: {
    title: 'Configuración'
  },
  profile: {
    title: 'Perfil Administrativo'
  }
};

const ADMIN_NAV_ITEMS = [
  { key: 'dashboard', icon: LayoutDashboard, label: 'Resumen' },
  { key: 'inventory', icon: Gem, label: 'Inventario' },
  { key: 'orders', icon: ShoppingCart, label: 'Pedidos' },
  { key: 'clients', icon: Users, label: 'Clientes' },
  { key: 'tickets', icon: MessageSquare, label: 'Soporte' },
  { key: 'settings', icon: Settings, label: 'Configuración' },
  { key: 'profile', icon: Users, label: 'Perfil' }
];

function countsAsProcessedRevenue(order) {
  if (order?.metodo_pago === 'wompi') {
    return order?.estado_pago === 'aprobado';
  }

  if (order?.metodo_pago === 'efectivo') {
    return order?.estado_pago === 'aprobado' && order?.estado === 'entregado';
  }

  return false;
}

export default function AdminDashboard() {
  const { isLoggedIn, isAdmin, loading, logout, user } = useAuth();
  const fotoSrc = user?.foto
    ? getImageUrl(user.foto)
    : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('inventory'); // 'dashboard', 'inventory', 'orders', 'clients', 'tickets' , 'settings', 'profile'
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overview, setOverview] = useState({
    products: 0,
    lowStock: 0,
    categories: 0,
    orders: 0,
    pendingOrders: 0,
    revenue: 0,
    clients: 0,
    vipClients: 0,
    admins: 0,
    openTickets: 0
  });

  const loadOverview = async () => {
    setOverviewLoading(true);
    try {
      const [productsRes, ordersRes, clientsRes, ticketsRes] = await Promise.all([
        api.get('/products/admin/all'),
        api.get('/orders/admin/all'),
        api.get('/auth/users'),
        api.get('/tickets/admin/all')
      ]);

      const products = productsRes.data || [];
      const orders = ordersRes.data || [];
      const clients = clientsRes.data || [];
      const tickets = ticketsRes.data || [];

      setOverview({
        products: products.length,
        lowStock: products.filter(product => Number(product.stock) <= 2).length,
        categories: [...new Set(products.map(product => product.categoria).filter(Boolean))].length,
        orders: orders.length,
        pendingOrders: orders.filter(order => order.estado === 'pendiente').length,
        revenue: orders
          .filter(countsAsProcessedRevenue)
          .reduce((sum, order) => sum + Number(order.total || 0), 0),
        clients: clients.filter(client => client.rol !== 'admin').length,
        vipClients: clients.filter(client => client.rol === 'vip').length,
        admins: clients.filter(client => client.rol === 'admin').length,
        openTickets: tickets.filter(ticket => ticket.estado === 'abierto').length
      });
    } catch (error) {
      console.error('Error al cargar el resumen del panel:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && (!isLoggedIn || !isAdmin)) navigate('/');

    // Manejar pestaña por URL
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['dashboard', 'inventory', 'orders', 'clients', 'tickets', 'settings', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [loading, isLoggedIn, isAdmin, navigate, location.search]);

  useEffect(() => {
    if (!loading && isLoggedIn && isAdmin) {
      loadOverview();
    }
  }, [loading, isLoggedIn, isAdmin, activeTab, refreshTrigger]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) {
        setIsMobileSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setInventoryStats = ({ total, lowStock, categories }) => {
    setOverview(prev => ({
      ...prev,
      products: total,
      lowStock,
      categories
    }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowAddForm(false);
    setIsMobileSidebarOpen(false);
    navigate(`/admin?tab=${tab}`);
  };

  const handleProductAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowAddForm(false);
    loadOverview();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const tabInfo = TAB_META[activeTab] || TAB_META.dashboard;
  const primaryStats = [
    {
      key: 'products',
      icon: Package,
      value: overview.products,
      label: 'Productos activos',
      helper: `${overview.categories} categorias registradas`
    },
    {
      key: 'orders',
      icon: ShoppingCart,
      value: overview.pendingOrders,
      label: 'Pedidos pendientes',
      helper: `${overview.orders} pedidos acumulados`
    },
    {
      key: 'clients',
      icon: Users,
      value: overview.clients,
      label: 'Clientes registrados',
      helper: `${overview.vipClients} clientes VIP`
    },
    {
      key: 'tickets',
      icon: MessageSquare,
      value: overview.openTickets,
      label: 'Tickets abiertos',
      helper: `${overview.admins} administradores activos`
    }
  ];
  const quickAccess = [
    {
      key: 'inventory',
      icon: Gem,
      title: 'Inventario',
      description: 'Consulta, crea y edita productos del catálogo central.',
      action: 'Abrir inventario'
    },
    {
      key: 'orders',
      icon: ShoppingCart,
      title: 'Pedidos',
      description: 'Revisa operaciones pendientes y comportamiento comercial.',
      action: 'Ver pedidos'
    },
    {
      key: 'clients',
      icon: Users,
      title: 'Clientes',
      description: 'Administra perfiles, membresías VIP y actividad de compra.',
      action: 'Ver clientes'
    },
    {
      key: 'tickets',
      icon: MessageSquare,
      title: 'Soporte',
      description: 'Atiende mensajes, devoluciones y solicitudes abiertas.',
      action: 'Abrir soporte'
    }
  ];
  const executiveSummary = [
    { label: 'Valor procesado', value: `$${overview.revenue.toLocaleString('es-CO')}` },
    { label: 'Alertas de stock', value: `${overview.lowStock} referencias` },
    { label: 'Categorías activas', value: `${overview.categories} grupos` },
    { label: 'Cobertura del equipo', value: `${overview.admins} administradores` }
  ];

  if (loading) return <div className="loading-screen text-gold">Verificando Credenciales Luxury...</div>;

  return (
    <div className="admin-layout">
      {/* ── SIDEBAR ── */}
      <aside className={`admin-sidebar ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="admin-sidebar-head">
          <div className="admin-brand" onClick={() => handleTabChange('dashboard')} style={{ cursor: 'pointer' }}>
            <div className="admin-brand-badge-wrap">
              <img src="/images/Logo_Luxury_Joyeria-removebg-preview.png" alt="Luxury Jewelry" />
            </div>
            <div className="admin-brand-copy">
              <h2>L.J. Admin</h2>
              <span className="admin-brand-subtitle">Enterprise Console</span>
            </div>
          </div>
          <button
            type="button"
            className="admin-sidebar-close"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Cerrar navegación del panel admin"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="admin-nav">
          {ADMIN_NAV_ITEMS.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              type="button"
              className={`admin-nav-item ${activeTab === key ? 'active' : ''}`}
              onClick={() => handleTabChange(key)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="admin-logout">
          <div className="admin-logout-panel">
            <span className="admin-logout-kicker">Sesión actual</span>
            <strong>{user?.nombre || 'Administrador'}</strong>
            <p>Acceso administrativo activo.</p>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
      <button
        type="button"
        className={`admin-sidebar-overlay ${isMobileSidebarOpen ? 'visible' : ''}`}
        onClick={() => setIsMobileSidebarOpen(false)}
        aria-label="Cerrar navegación lateral"
      />

      {/* ── MAIN CONTENT ── */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              type="button"
              className="admin-sidebar-toggle"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Abrir navegación del panel admin"
              aria-expanded={isMobileSidebarOpen}
            >
              <Menu size={18} />
            </button>
            <h1 className="admin-page-title">{tabInfo.title}</h1>
          </div>

          <div className="admin-user-info">
            <div className="admin-status-card">
              <span className="admin-status-label">Estado</span>
              <strong>{overviewLoading ? 'Sincronizando...' : 'Sincronizado'}</strong>
            </div>
            <div className="admin-identity-card" onClick={() => handleTabChange('profile')}>
              <img src={fotoSrc} alt="Perfil" />
              <div>
                <strong>{user?.nombre}</strong>
                <span>Administrador del sistema</span>
              </div>
            </div>
          </div>
        </header>

        <div className="admin-content-area">
          {/* DYNAMIC CONTENT */}
          {activeTab === 'dashboard' && (
            <>
              <div className="admin-dashboard-grid">
                <section className="admin-surface admin-hero-card">
                  <span className="admin-surface-kicker">Centro de Operaciones</span>
                  <div className="admin-hero-layout">
                    <div className="admin-hero-copy">
                      <h2>Controla catálogo, pedidos y servicio desde una vista ejecutiva.</h2>
                      <p>
                        Una lectura central para supervisar la operación diaria, mantener trazabilidad y actuar con criterio en tiempo real.
                      </p>
                    </div>
                    <div className="admin-hero-highlights">
                      <div className="admin-hero-highlight">
                        <strong>Operación</strong>
                        <span>Inventario y flujo comercial en una sola capa visual.</span>
                      </div>
                      <div className="admin-hero-highlight">
                        <strong>Seguimiento</strong>
                        <span>Clientes, órdenes y soporte con lectura inmediata.</span>
                      </div>
                      <div className="admin-hero-highlight">
                        <strong>Decisión</strong>
                        <span>Indicadores preparados para responder con consistencia.</span>
                      </div>
                    </div>
                  </div>
                  <div className="admin-hero-pills">
                    <span className="admin-mini-pill"><Database size={14} /> Datos centralizados</span>
                    <span className="admin-mini-pill"><Layers size={14} /> Flujo consolidado</span>
                    <span className="admin-mini-pill"><Crown size={14} /> Consola premium</span>
                  </div>
                </section>

                <section className="admin-surface admin-summary-card">
                  <span className="admin-surface-kicker">Resumen Ejecutivo</span>
                  <div className="admin-summary-list">
                    {executiveSummary.map(item => (
                      <div key={item.label} className="admin-summary-item">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <div className="admin-stats-grid">
                {primaryStats.map(({ key, icon: Icon, value, label, helper }) => (
                  <div key={key} className={`admin-stat-card ${key === 'products' && overview.lowStock > 0 ? 'admin-stat-alert' : ''}`}>
                    <div className={`admin-stat-icon ${key === 'products' && overview.lowStock > 0 ? 'text-danger' : ''}`}>
                      <Icon size={28} />
                    </div>
                    <div className="admin-stat-content">
                      <span className="admin-stat-value">{overviewLoading ? '...' : value}</span>
                      <span className="admin-stat-label">{label}</span>
                      <span className="admin-stat-helper">{helper}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="admin-module-grid">
                {quickAccess.map(({ key, icon: Icon, title, description, action }) => (
                  <button key={key} className="admin-module-card" onClick={() => handleTabChange(key)}>
                    <div className="admin-module-icon">
                      <Icon size={20} />
                    </div>
                    <div className="admin-module-content">
                      <strong>{title}</strong>
                      <p>{description}</p>
                      <span>{action}</span>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {activeTab === 'inventory' && (
            <div className="inventory-section">
              {!showAddForm && (
                <div className="admin-stats-grid" style={{ marginBottom: '32px' }}>
                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">
                      <Package size={28} />
                    </div>
                    <div className="admin-stat-content">
                      <span className="admin-stat-value">{overview.products}</span>
                      <span className="admin-stat-label">Productos activos</span>
                      <span className="admin-stat-helper">Catálogo central disponible</span>
                    </div>
                  </div>
                  <div className={`admin-stat-card ${overview.lowStock > 0 ? 'admin-stat-alert' : ''}`}>
                    <div className={`admin-stat-icon ${overview.lowStock > 0 ? 'text-danger' : ''}`}>
                      <AlertTriangle size={28} />
                    </div>
                    <div className="admin-stat-content">
                      <span className="admin-stat-value" style={{ color: overview.lowStock > 0 ? 'var(--rose-gold)' : 'var(--gold)' }}>
                        {overview.lowStock}
                      </span>
                      <span className="admin-stat-label">Stock crítico</span>
                      <span className="admin-stat-helper">Referencias con alerta</span>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">
                      <Layers size={28} />
                    </div>
                    <div className="admin-stat-content">
                      <span className="admin-stat-value">{overview.categories}</span>
                      <span className="admin-stat-label">Categorías</span>
                      <span className="admin-stat-helper">Estructura del catálogo</span>
                    </div>
                  </div>
                  <div className="admin-stat-card">
                    <div className="admin-stat-icon">
                      <Database size={28} />
                    </div>
                    <div className="admin-stat-content">
                      <span className="admin-stat-value" style={{ color: 'var(--success)', fontSize: '1.4rem', marginTop: '10px' }}>Activo</span>
                      <span className="admin-stat-label">Estado del sistema</span>
                      <span className="admin-stat-helper">Sincronización operativa</span>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="text-gold" style={{ fontSize: '1.4rem' }}>
                  {showAddForm ? 'Alta de Producto' : 'Catálogo Central de Productos'}
                </h2>
                <button
                  className={showAddForm ? 'btn-outline' : 'btn-primary'}
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? 'Cerrar formulario' : 'Agregar producto'}
                </button>
              </div>

              {showAddForm ? (
                <div className="glass-card">
                  <AddProduct onProductAdded={handleProductAdded} />
                </div>
              ) : (
                <ProductListAdmin refreshTrigger={refreshTrigger} setStats={setInventoryStats} />
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <OrderListAdmin refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'clients' && (
            <ClientsAdmin />
          )}

          {activeTab === 'tickets' && (
            <TicketListAdmin refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'settings' && (
            <SettingsAdmin />
          )}

          {activeTab === 'profile' && (
            <ProfileAdmin />
          )}
        </div>
      </main>
    </div>
  );
}
