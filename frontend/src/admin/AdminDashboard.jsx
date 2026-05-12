import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  Home
} from 'lucide-react';
import AddProduct from './AddProduct';
import ProductListAdmin from './ProductListAdmin';
import OrderListAdmin from './OrderListAdmin';
import ClientsAdmin from './ClientsAdmin';
import SettingsAdmin from './SettingsAdmin';
import ProfileAdmin from './ProfileAdmin';
import './admin-layout.css'; // Importamos el CSS premium

export default function AdminDashboard() {
  const { isLoggedIn, isAdmin, loading, logout, user } = useAuth();
  const fotoSrc = user?.foto
    ? `http://localhost:3001/${user.foto}`
    : 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('inventory'); // 'dashboard', 'inventory', 'orders', 'clients', 'settings', 'profile'
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, categories: 0 });

  useEffect(() => {
    if (!loading && (!isLoggedIn || !isAdmin)) navigate('/');
    
    // Manejar pestaña por URL
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab && ['dashboard', 'inventory', 'orders', 'clients', 'settings', 'profile'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [loading, isLoggedIn, isAdmin, navigate, location.search]);

  const handleProductAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowAddForm(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (loading) return <div className="loading-screen text-gold">Verificando Credenciales Luxury...</div>;

  return (
    <div className="admin-layout">
      {/* ── SIDEBAR ── */}
      <aside className="admin-sidebar">
        <div className="admin-brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <img src="/images/Logo_Luxury_Joyeria-removebg-preview.png" alt="Luxury Jewelry" />
          <h2>L.J. Admin</h2>
        </div>

        <nav className="admin-nav">
          <div
            className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setShowAddForm(false); }}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </div>
          <div
            className={`admin-nav-item ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => { setActiveTab('inventory'); setShowAddForm(false); }}
          >
            <Gem size={20} />
            <span>Bóveda y Joyas</span>
          </div>
          <div
            className={`admin-nav-item ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => { setActiveTab('orders'); setShowAddForm(false); }}
          >
            <ShoppingCart size={20} />
            <span>Pedidos (Proximamente)</span>
          </div>
          <div
            className={`admin-nav-item ${activeTab === 'clients' ? 'active' : ''}`}
            onClick={() => { setActiveTab('clients'); setShowAddForm(false); }}
          >
            <Users size={20} />
            <span>Clientes</span>
          </div>
          <div
            className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => { setActiveTab('settings'); setShowAddForm(false); }}
          >
            <Settings size={20} />
            <span>Configuración</span>
          </div>
          <div
            className={`admin-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => { setActiveTab('profile'); setShowAddForm(false); }}
          >
            <Users size={20} />
            <span>Mi Perfil</span>
          </div>
        </nav>

        <div className="admin-logout">
          <button className="admin-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '38px' }}>
            <img
              src="/images/Logo_Luxury_Joyeria-removebg-preview.png"
              alt="Luxury Logo"
              style={{ width: '58px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(201, 168, 76, 0.3))', cursor: 'pointer', transition: 'filter 0.4s' }}
              onClick={() => navigate('/')}
              onMouseOver={e => e.currentTarget.style.filter = 'drop-shadow(0 0 14px rgba(201, 168, 76, 0.5))'}
              onMouseOut={e => e.currentTarget.style.filter = 'drop-shadow(0 0 8px rgba(201, 168, 76, 0.3))'}
            />
            <nav style={{ display: 'flex', gap: '26px', alignItems: 'center' }}>
              <span onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', transition: 'all 0.35s' }} onMouseOver={e => { e.currentTarget.style.color = 'var(--gold-light)'; e.currentTarget.style.textShadow = '0 0 10px rgba(201,168,76,0.3)' }} onMouseOut={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.textShadow = 'none' }}>
                <Home size={14} /> INICIO
              </span>
              <span onClick={() => navigate('/carrito')} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', transition: 'all 0.35s' }} onMouseOver={e => { e.currentTarget.style.color = 'var(--gold-light)'; e.currentTarget.style.textShadow = '0 0 10px rgba(201,168,76,0.3)' }} onMouseOut={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.textShadow = 'none' }}>
                <ShoppingCart size={14} /> CARRITO
              </span>
              <span onClick={() => setActiveTab('profile')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.78rem', fontWeight: '500', cursor: 'pointer', letterSpacing: '2px', textTransform: 'uppercase', transition: 'all 0.35s' }} onMouseOver={e => { e.currentTarget.style.color = 'var(--gold-light)'; e.currentTarget.style.textShadow = '0 0 10px rgba(201,168,76,0.3)' }} onMouseOut={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.textShadow = 'none' }}>
                <img src={fotoSrc} alt="Perfil" style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--gold)', pointerEvents: 'none' }} />
                MI PERFIL
              </span>
            </nav>
          </div>

          <div className="admin-user-info" style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 className="admin-page-title" style={{ fontSize: '1.2rem', margin: 0, paddingRight: '20px', borderRight: '1px solid rgba(201, 168, 76, 0.2)' }}>
              {activeTab === 'dashboard' && 'Panel Principal'}
              {activeTab === 'inventory' && 'Bóveda de Inventario'}
              {activeTab === 'orders' && 'Gestión de Pedidos'}
              {activeTab === 'clients' && 'Módulo de Clientes'}
              {activeTab === 'settings' && 'Configuración'}
              {activeTab === 'profile' && 'Editar Mi Perfil'}
            </h1>
            <span className="admin-badge" style={{ boxShadow: '0 0 10px rgba(201, 168, 76, 0.2)' }}>Admin</span>
          </div>
        </header>

        <div className="admin-content-area">
          {/* STATS SECTION */}
          {activeTab === 'inventory' && !showAddForm && (
            <div className="admin-stats-grid">
              <div className="admin-stat-card">
                <div className="admin-stat-icon">
                  <Package size={28} />
                </div>
                <div className="admin-stat-content">
                  <span className="admin-stat-value">{stats.total}</span>
                  <span className="admin-stat-label">Stock Total</span>
                </div>
              </div>
              <div className={`admin-stat-card ${stats.lowStock > 0 ? 'bg-danger' : ''}`}>
                <div className={`admin-stat-icon ${stats.lowStock > 0 ? 'text-danger' : ''}`}>
                  <AlertTriangle size={28} />
                </div>
                <div className="admin-stat-content">
                  <span className="admin-stat-value" style={{ color: stats.lowStock > 0 ? 'var(--rose-gold)' : 'var(--gold)' }}>
                    {stats.lowStock}
                  </span>
                  <span className="admin-stat-label">Poco Stock</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-icon">
                  <Layers size={28} />
                </div>
                <div className="admin-stat-content">
                  <span className="admin-stat-value">{stats.categories}</span>
                  <span className="admin-stat-label">Familias</span>
                </div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-icon">
                  <Database size={28} />
                </div>
                <div className="admin-stat-content">
                  <span className="admin-stat-value" style={{ color: 'var(--success)', fontSize: '1.4rem', marginTop: '10px' }}>Sincronizado</span>
                  <span className="admin-stat-label mt-1">Estado Servidor</span>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC CONTENT */}
          {activeTab === 'dashboard' && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '60px' }}>
              <img src="/images/Logo_Luxury_Joyeria-removebg-preview.png" style={{ width: '120px', opacity: 0.5, margin: '0 auto 20px' }} />
              <h2 className="text-gold-light" style={{ fontSize: '2rem', marginBottom: '10px' }}>Bienvenido a la Administración</h2>
              <p className="text-muted">Seleccione una opción en el menú lateral para gestionar el catálogo y más.</p>
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="inventory-section">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 className="text-gold" style={{ fontSize: '1.4rem' }}>
                  {showAddForm ? 'Registro de Nueva Joya' : 'Catálogo de Piezas'}
                </h2>
                <button
                  className={showAddForm ? 'btn-outline' : 'btn-primary'}
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? '✕ Cancelar Registro' : '+ Nueva Pieza Exclusiva'}
                </button>
              </div>

              {showAddForm ? (
                <div className="glass-card">
                  <AddProduct onProductAdded={handleProductAdded} />
                </div>
              ) : (
                <ProductListAdmin refreshTrigger={refreshTrigger} setStats={setStats} />
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <OrderListAdmin refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'clients' && (
            <ClientsAdmin />
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
