import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getImageUrl } from '../api/axios';
import {
  LayoutDashboard,
  Bell,
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

const RECENT_ACTIVITY_HOURS = 72;
const ADMIN_NOTIFICATION_STORAGE_KEY = 'luxury-jewelry-admin-notifications-read';
const TRACKED_NOTIFICATION_SECTIONS = ['inventory', 'orders', 'clients', 'tickets'];

const TAB_META = {
  dashboard: {
    title: 'Centro de Control'
  },
  notifications: {
    title: 'Notificaciones'
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
  { key: 'notifications', icon: Bell, label: 'Notificaciones' },
  { key: 'inventory', icon: Gem, label: 'Inventario' },
  { key: 'orders', icon: ShoppingCart, label: 'Pedidos' },
  { key: 'clients', icon: Users, label: 'Clientes' },
  { key: 'tickets', icon: MessageSquare, label: 'Soporte' },
  { key: 'settings', icon: Settings, label: 'Configuración' },
  { key: 'profile', icon: Users, label: 'Perfil' }
];

function parseDateValue(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isRecentTimestamp(value, hours = RECENT_ACTIVITY_HOURS) {
  const parsed = parseDateValue(value);
  if (!parsed) return false;
  return Date.now() - parsed.getTime() <= hours * 60 * 60 * 1000;
}

function formatIndicatorCount(value) {
  if (!value) return '';
  return value > 9 ? '9+' : String(value);
}

function getTimestampValue(value) {
  const parsed = parseDateValue(value);
  return parsed ? parsed.getTime() : 0;
}

function formatNotificationDate(value) {
  const parsed = parseDateValue(value);
  if (!parsed) return 'Seguimiento vigente';
  return parsed.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function buildNotificationStorageKey(adminId) {
  return `${ADMIN_NOTIFICATION_STORAGE_KEY}:${adminId || 'global'}`;
}

function readNotificationReadMap(adminId) {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(buildNotificationStorageKey(adminId));
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function persistNotificationReadMap(adminId, map) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(buildNotificationStorageKey(adminId), JSON.stringify(map));
}

function buildInventoryNotifications(products) {
  return (products || [])
    .filter(product => Number(product.stock) <= 2)
    .map(product => ({
      id: `inventory-${product.id}`,
      section: 'inventory',
      sectionLabel: 'Inventario',
      title: 'Stock critico detectado',
      description: `${product.nombre} registra ${Number(product.stock || 0)} unidad${Number(product.stock || 0) === 1 ? '' : 'es'} disponibles.`,
      createdAt: product.actualizado_en || product.creado_en || null,
      ctaLabel: 'Abrir inventario'
    }));
}

function buildOrderNotifications(orders) {
  return (orders || [])
    .filter(order => order.estado === 'pendiente' || isRecentTimestamp(order.creado_en))
    .map(order => ({
      id: `orders-${order.id}`,
      section: 'orders',
      sectionLabel: 'Pedidos',
      title: order.estado === 'pendiente' ? 'Pedido pendiente por revisar' : 'Nuevo pedido registrado',
      description: `Pedido #${String(order.id).padStart(5, '0')} de ${order.usuario_nombre || 'Cliente'} por $${Number(order.total || 0).toLocaleString('es-CO')}.`,
      createdAt: order.creado_en || null,
      ctaLabel: 'Abrir pedidos'
    }));
}

function buildClientNotifications(clients) {
  return (clients || [])
    .filter(client => client.rol !== 'admin' && isRecentTimestamp(client.creado_en))
    .map(client => ({
      id: `clients-${client.id}`,
      section: 'clients',
      sectionLabel: 'Clientes',
      title: 'Nuevo cliente registrado',
      description: `${client.nombre || 'Cliente'} se unio a la base con el correo ${client.email || 'sin correo registrado'}.`,
      createdAt: client.creado_en || null,
      ctaLabel: 'Abrir clientes'
    }));
}

function buildTicketNotifications(tickets) {
  return (tickets || [])
    .filter(ticket => ticket.estado === 'abierto' || isRecentTimestamp(ticket.creado_en))
    .map(ticket => ({
      id: `tickets-${ticket.id}`,
      section: 'tickets',
      sectionLabel: 'Soporte',
      title: ticket.estado === 'abierto' ? 'Ticket abierto pendiente' : 'Nuevo ticket recibido',
      description: `${ticket.usuario_nombre || 'Cliente'} reporto "${ticket.asunto || 'Solicitud sin asunto'}".`,
      createdAt: ticket.creado_en || null,
      ctaLabel: 'Abrir soporte'
    }));
}

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
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [readNotificationsBySection, setReadNotificationsBySection] = useState({});
  const [overview, setOverview] = useState({
    products: 0,
    lowStock: 0,
    categories: 0,
    orders: 0,
    pendingOrders: 0,
    ordersAttention: 0,
    revenue: 0,
    clients: 0,
    clientsAttention: 0,
    vipClients: 0,
    admins: 0,
    openTickets: 0,
    ticketsAttention: 0
  });

  useEffect(() => {
    if (!user?.id) return;
    setReadNotificationsBySection(readNotificationReadMap(user.id));
  }, [user?.id]);

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
      const nonAdminClients = clients.filter(client => client.rol !== 'admin');
      const recentClientIds = new Set(
        nonAdminClients
          .filter(client => isRecentTimestamp(client.creado_en))
          .map(client => client.id)
      );
      const pendingOrderIds = new Set(
        orders
          .filter(order => order.estado === 'pendiente')
          .map(order => order.id)
      );
      const recentOrderIds = new Set(
        orders
          .filter(order => isRecentTimestamp(order.creado_en))
          .map(order => order.id)
      );
      const orderAttentionIds = new Set([...pendingOrderIds, ...recentOrderIds]);
      const openTicketIds = new Set(
        tickets
          .filter(ticket => ticket.estado === 'abierto')
          .map(ticket => ticket.id)
      );
      const recentTicketIds = new Set(
        tickets
          .filter(ticket => isRecentTimestamp(ticket.creado_en))
          .map(ticket => ticket.id)
      );
      const ticketAttentionIds = new Set([...openTicketIds, ...recentTicketIds]);
      const lowStockCount = products.filter(product => Number(product.stock) <= 2).length;
      const notifications = [
        ...buildInventoryNotifications(products),
        ...buildOrderNotifications(orders),
        ...buildClientNotifications(clients),
        ...buildTicketNotifications(tickets)
      ].sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt));

      setAdminNotifications(notifications);

      setOverview({
        products: products.length,
        lowStock: lowStockCount,
        categories: [...new Set(products.map(product => product.categoria).filter(Boolean))].length,
        orders: orders.length,
        pendingOrders: pendingOrderIds.size,
        ordersAttention: orderAttentionIds.size,
        revenue: orders
          .filter(countsAsProcessedRevenue)
          .reduce((sum, order) => sum + Number(order.total || 0), 0),
        clients: nonAdminClients.length,
        clientsAttention: recentClientIds.size,
        vipClients: clients.filter(client => client.rol === 'vip').length,
        admins: clients.filter(client => client.rol === 'admin').length,
        openTickets: openTicketIds.size,
        ticketsAttention: ticketAttentionIds.size
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
    if (tab && ['dashboard', 'notifications', 'inventory', 'orders', 'clients', 'tickets', 'settings', 'profile'].includes(tab)) {
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

  const markSectionNotificationsAsRead = (sectionKey) => {
    if (!TRACKED_NOTIFICATION_SECTIONS.includes(sectionKey) || !user?.id) return;

    const notificationIds = adminNotifications
      .filter(notification => notification.section === sectionKey)
      .map(notification => notification.id);

    if (notificationIds.length === 0) return;

    setReadNotificationsBySection(prev => {
      const currentIds = new Set(prev[sectionKey] || []);
      const initialSize = currentIds.size;
      notificationIds.forEach(id => currentIds.add(id));
      if (currentIds.size === initialSize) return prev;

      const next = {
        ...prev,
        [sectionKey]: Array.from(currentIds)
      };
      persistNotificationReadMap(user.id, next);
      return next;
    });
  };

  useEffect(() => {
    if (!TRACKED_NOTIFICATION_SECTIONS.includes(activeTab) || adminNotifications.length === 0) return;
    markSectionNotificationsAsRead(activeTab);
  }, [activeTab, adminNotifications]);

  const handleProductAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowAddForm(false);
    loadOverview();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleNotificationOpen = (notification) => {
    if (!notification?.section) return;
    markSectionNotificationsAsRead(notification.section);
    handleTabChange(notification.section);
  };

  const tabInfo = TAB_META[activeTab] || TAB_META.dashboard;
  const unreadCountsBySection = TRACKED_NOTIFICATION_SECTIONS.reduce((acc, section) => {
    const readIds = new Set(readNotificationsBySection[section] || []);
    acc[section] = adminNotifications.filter(notification => notification.section === section && !readIds.has(notification.id)).length;
    return acc;
  }, {});
  const totalUnreadNotifications = TRACKED_NOTIFICATION_SECTIONS.reduce((sum, section) => sum + (unreadCountsBySection[section] || 0), 0);
  const sectionIndicators = {
    dashboard: totalUnreadNotifications,
    notifications: totalUnreadNotifications,
    inventory: unreadCountsBySection.inventory || 0,
    orders: unreadCountsBySection.orders || 0,
    clients: unreadCountsBySection.clients || 0,
    tickets: unreadCountsBySection.tickets || 0,
    settings: 0,
    profile: 0
  };
  const notificationsBySection = TRACKED_NOTIFICATION_SECTIONS.reduce((acc, section) => {
    acc[section] = adminNotifications.filter(notification => notification.section === section);
    return acc;
  }, {});
  const unreadNotifications = adminNotifications.filter((notification) => {
    const readIds = new Set(readNotificationsBySection[notification.section] || []);
    return !readIds.has(notification.id);
  });
  const readNotifications = adminNotifications.filter((notification) => {
    const readIds = new Set(readNotificationsBySection[notification.section] || []);
    return readIds.has(notification.id);
  });
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
      action: 'Abrir inventario',
      noticeCount: sectionIndicators.inventory,
      noticeLabel: sectionIndicators.inventory > 0 ? `${sectionIndicators.inventory} alerta${sectionIndicators.inventory === 1 ? '' : 's'} de stock` : ''
    },
    {
      key: 'orders',
      icon: ShoppingCart,
      title: 'Pedidos',
      description: 'Revisa operaciones pendientes y comportamiento comercial.',
      action: 'Ver pedidos',
      noticeCount: sectionIndicators.orders,
      noticeLabel: sectionIndicators.orders > 0 ? `${sectionIndicators.orders} novedad${sectionIndicators.orders === 1 ? '' : 'es'} operativa${sectionIndicators.orders === 1 ? '' : 's'}` : ''
    },
    {
      key: 'clients',
      icon: Users,
      title: 'Clientes',
      description: 'Administra perfiles, membresías VIP y actividad de compra.',
      action: 'Ver clientes',
      noticeCount: sectionIndicators.clients,
      noticeLabel: sectionIndicators.clients > 0 ? `${sectionIndicators.clients} cliente${sectionIndicators.clients === 1 ? '' : 's'} nuevo${sectionIndicators.clients === 1 ? '' : 's'}` : ''
    },
    {
      key: 'tickets',
      icon: MessageSquare,
      title: 'Soporte',
      description: 'Atiende mensajes, devoluciones y solicitudes abiertas.',
      action: 'Abrir soporte',
      noticeCount: sectionIndicators.tickets,
      noticeLabel: sectionIndicators.tickets > 0 ? `${sectionIndicators.tickets} caso${sectionIndicators.tickets === 1 ? '' : 's'} por revisar` : ''
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
              title={sectionIndicators[key] > 0 ? `${sectionIndicators[key]} novedad(es) en ${label}` : label}
            >
              <Icon size={20} />
              <span className="admin-nav-item-label">{label}</span>
              {sectionIndicators[key] > 0 && (
                <span className="admin-nav-indicator" aria-label={`${sectionIndicators[key]} novedades`}>
                  {formatIndicatorCount(sectionIndicators[key])}
                </span>
              )}
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
                {quickAccess.map(({ key, icon: Icon, title, description, action, noticeCount, noticeLabel }) => (
                  <button key={key} className={`admin-module-card ${noticeCount > 0 ? 'has-notice' : ''}`} onClick={() => handleTabChange(key)}>
                    {noticeCount > 0 && (
                      <span className="admin-module-alert-dot" aria-hidden="true" />
                    )}
                    <div className="admin-module-icon">
                      <Icon size={20} />
                    </div>
                    <div className="admin-module-content">
                      <strong>{title}</strong>
                      <p>{description}</p>
                      <div className="admin-module-footer">
                        <span>{action}</span>
                        {noticeCount > 0 && (
                          <span className="admin-module-alert-label">{noticeLabel}</span>
                        )}
                      </div>
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

          {activeTab === 'notifications' && (
            <div className="admin-section-shell">
              <div className="admin-section-header-block">
                <div>
                  <h2>Centro de Notificaciones</h2>
                  <p>Consulta novedades del panel y verifica que cada alerta quede leída al entrar al módulo correspondiente.</p>
                </div>
                <span className={`admin-badge-pill ${totalUnreadNotifications > 0 ? 'pending' : 'success'}`}>
                  {totalUnreadNotifications > 0 ? `${totalUnreadNotifications} sin leer` : 'Todo al día'}
                </span>
              </div>

              <div className="admin-summary-grid">
                {TRACKED_NOTIFICATION_SECTIONS.map((section) => (
                  <div key={section} className="admin-info-card">
                    <div className="admin-info-card-top">
                      <strong>{(notificationsBySection[section] || [])[0]?.sectionLabel || section}</strong>
                      <span className="admin-info-card-icon"><Bell size={18} /></span>
                    </div>
                    <span className="admin-info-card-value">{sectionIndicators[section]}</span>
                    <span className="admin-info-card-meta">
                      {sectionIndicators[section] > 0
                        ? 'Novedades pendientes de lectura'
                        : 'Sin novedades sin leer en este módulo'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="admin-notification-layout">
                <section className="admin-surface admin-notification-panel">
                  <div className="admin-notification-panel-head">
                    <div>
                      <span className="admin-surface-kicker">Nuevas</span>
                      <h3>Alertas pendientes</h3>
                    </div>
                    <span className="admin-notification-count">{unreadNotifications.length}</span>
                  </div>

                  <div className="admin-notification-list">
                    {unreadNotifications.length === 0 ? (
                      <div className="admin-notification-empty">
                        No hay notificaciones pendientes. Todo el flujo operativo ya fue revisado.
                      </div>
                    ) : (
                      unreadNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          className="admin-notification-item is-unread"
                          onClick={() => handleNotificationOpen(notification)}
                        >
                          <div className="admin-notification-top">
                            <span className="admin-notification-section">{notification.sectionLabel}</span>
                            <span className="admin-notification-date">{formatNotificationDate(notification.createdAt)}</span>
                          </div>
                          <strong>{notification.title}</strong>
                          <p>{notification.description}</p>
                          <span className="admin-notification-action">{notification.ctaLabel}</span>
                        </button>
                      ))
                    )}
                  </div>
                </section>

                <section className="admin-surface admin-notification-panel">
                  <div className="admin-notification-panel-head">
                    <div>
                      <span className="admin-surface-kicker">Leídas</span>
                      <h3>Historial reciente</h3>
                    </div>
                    <span className="admin-notification-count">{readNotifications.length}</span>
                  </div>

                  <div className="admin-notification-list">
                    {readNotifications.length === 0 ? (
                      <div className="admin-notification-empty">
                        Aún no hay notificaciones leídas en esta sesión administrativa.
                      </div>
                    ) : (
                      readNotifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          className="admin-notification-item is-read"
                          onClick={() => handleTabChange(notification.section)}
                        >
                          <div className="admin-notification-top">
                            <span className="admin-notification-section">{notification.sectionLabel}</span>
                            <span className="admin-notification-date">{formatNotificationDate(notification.createdAt)}</span>
                          </div>
                          <strong>{notification.title}</strong>
                          <p>{notification.description}</p>
                          <span className="admin-notification-action">Reabrir módulo</span>
                        </button>
                      ))
                    )}
                  </div>
                </section>
              </div>
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
