import { useState, useEffect } from 'react';
import { RefreshCw, PackageOpen, AlertCircle, Receipt, Clock3, CircleDollarSign, Truck } from 'lucide-react';
import api from '../api/axios';

export default function OrderListAdmin({ refreshTrigger }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/admin/all');
      setOrders(res.data);
    } catch (err) {
      setError('Error al sincronizar con el registro de pedidos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [refreshTrigger]);

  if (loading && orders.length === 0) {
    return (
      <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0' }}>
        <RefreshCw size={40} className="text-gold" style={{ animation: 'spin 2s linear infinite', marginBottom: '20px' }} />
        <h3 className="text-gold-light">Sincronizando Registro de Pedidos...</h3>
        <p className="text-muted">Desencriptando transferencias y despachos.</p>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
        <AlertCircle size={20} />
        {error}
      </div>
    );
  }

  const pendingOrders = orders.filter(order => order.estado === 'pendiente').length;
  const deliveredOrders = orders.filter(order => order.estado === 'entregado').length;
  const revenue = orders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const latestOrderDate = orders[0]?.creado_en
    ? new Date(orders[0].creado_en).toLocaleDateString('es-CO')
    : 'Sin registros';

  const getStatusClass = (status) => {
    if (status === 'entregado') return 'success';
    if (status === 'pendiente') return 'pending';
    if (status === 'cancelado') return 'danger';
    return 'info';
  };

  return (
    <div className="admin-section-shell">
      <div className="admin-section-header-block">
        <div>
          <h2>Gestión Operativa de Pedidos</h2>
          <p>Consolida órdenes, monitorea estados de atención y detecta carga operativa desde un panel orientado a seguimiento comercial.</p>
        </div>
        <button onClick={fetchOrders} className="btn-outline" style={{ padding: '10px 18px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          {loading ? 'Sincronizando...' : 'Actualizar pedidos'}
        </button>
      </div>

      <div className="admin-summary-grid">
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Total de pedidos</strong>
            <span className="admin-info-card-icon"><Receipt size={18} /></span>
          </div>
          <span className="admin-info-card-value">{orders.length}</span>
          <span className="admin-info-card-meta">Volumen total registrado en el sistema</span>
        </div>
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Pendientes</strong>
            <span className="admin-info-card-icon"><Clock3 size={18} /></span>
          </div>
          <span className="admin-info-card-value">{pendingOrders}</span>
          <span className="admin-info-card-meta">Órdenes que requieren gestión inmediata</span>
        </div>
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Valor procesado</strong>
            <span className="admin-info-card-icon"><CircleDollarSign size={18} /></span>
          </div>
          <span className="admin-info-card-value">${revenue.toLocaleString('es-CO')}</span>
          <span className="admin-info-card-meta">Facturación agregada del historial</span>
        </div>
        <div className="admin-info-card">
          <div className="admin-info-card-top">
            <strong>Despachos completados</strong>
            <span className="admin-info-card-icon"><Truck size={18} /></span>
          </div>
          <span className="admin-info-card-value">{deliveredOrders}</span>
          <span className="admin-info-card-meta">Último movimiento: {latestOrderDate}</span>
        </div>
      </div>

      <div className="admin-table-card">
        <div className="table-wrapper">
          <div className="table-header-flex">
            <div>
              <h3 className="text-gold-light" style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.35rem' }}>Registro consolidado</h3>
              <p className="admin-muted-note">Vista transversal de clientes, estado logístico y volumen monetario por pedido.</p>
            </div>
            <div className="admin-inline-actions">
              <span className="admin-badge-pill pending">{pendingOrders} pendientes</span>
              <span className="admin-badge-pill success">{deliveredOrders} entregados</span>
            </div>
          </div>

          <table className="luxury-table">
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Cliente</th>
                <th>Ciudad Destino</th>
                <th>Total (COP)</th>
                <th>Estado</th>
                <th style={{ textAlign: 'center' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '80px 0' }}>
                    <PackageOpen size={48} className="text-muted" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h4 className="text-gold-light" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Sin Pedidos Registrados</h4>
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <code style={{ background: 'rgba(0,0,0,0.5)', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        #{String(order.id).padStart(5, '0')}
                      </code>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="text-gold-light">{order.usuario_nombre}</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>{order.usuario_email}</span>
                      </div>
                    </td>
                    <td>{order.ciudad_envio}</td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                      ${parseFloat(order.total).toLocaleString('es-CO')}
                    </td>
                    <td>
                      <span className={`admin-badge-pill ${getStatusClass(order.estado)}`}>
                        {order.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {new Date(order.creado_en).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
