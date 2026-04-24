import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddProduct from './AddProduct';
import ProductListAdmin from './ProductListAdmin';

export default function AdminDashboard() {
  const { isLoggedIn, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, categories: 0 });

  useEffect(() => {
    if (!loading && (!isLoggedIn || !isAdmin)) navigate('/');
  }, [loading, isLoggedIn, isAdmin, navigate]);

  const handleProductAdded = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowForm(false);
  };

  if (loading) return <div className="loading-screen">Verificando Credenciales Luxury...</div>;

  return (
    <div className="admin-page-bg">
      <div className="dashboard-v3-layout">
        <header className="admin-hero-header">
          <div className="admin-header-main">
            <div>
              <span className="stat-label text-gold letter-spacing-lg">Lux-Inventory Management</span>
              <h2>Bóveda Administrativa</h2>
              <p className="admin-subtitle text-muted" style={{ textAlign: 'left', marginBottom: 0 }}>Gestión centralizada de piezas exclusivas y control de existencias.</p>
            </div>
            <button 
              className={showForm ? 'btn-outline' : 'btn-primary'} 
              onClick={() => setShowForm(!showForm)}
            >
              <span>{showForm ? '✕ Cancelar Registro' : '+ Nueva Pieza'}</span>
            </button>
          </div>

          <section className="admin-stats-grid">
            <div className="stat-card">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Stock Total</span>
            </div>
            <div className="stat-card">
              <span className="stat-value" style={{ color: stats.lowStock > 0 ? 'var(--rose-gold)' : 'var(--gold)' }}>
                {stats.lowStock}
              </span>
              <span className="stat-label">Bajo Stock</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">{stats.categories}</span>
              <span className="stat-label">Categorías</span>
            </div>
            <div className="stat-card">
              <span className="stat-value text-uppercase" style={{ fontSize: '1.2rem' }}>Sincronizado</span>
              <span className="stat-label">Estado DB</span>
            </div>
          </section>
        </header>

        {showForm && (
          <section>
            <AddProduct onProductAdded={handleProductAdded} />
          </section>
        )}

        <main>
          <ProductListAdmin refreshTrigger={refreshTrigger} setStats={setStats} />
        </main>
      </div>
    </div>
  );
}
