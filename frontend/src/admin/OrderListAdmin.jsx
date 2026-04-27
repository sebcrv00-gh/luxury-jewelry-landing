import { useState, useEffect } from 'react';
import { RefreshCw, PackageOpen, AlertCircle, Eye } from 'lucide-react';
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

  return (
    <div className="inventory-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 className="text-gold" style={{ fontSize: '1.4rem' }}>Registro de Pedidos</h2>
        <button onClick={fetchOrders} className="btn-outline" style={{ padding: '8px 16px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          {loading ? 'Sincronizando...' : 'Actualizar Registro'}
        </button>
      </div>

      <div className="table-wrapper">
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
                    <span style={{ 
                      padding: '4px 12px', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600', 
                      textTransform: 'uppercase',
                      background: order.estado === 'pendiente' ? 'rgba(231, 76, 60, 0.1)' : 'rgba(78, 205, 196, 0.1)',
                      color: order.estado === 'pendiente' ? 'var(--danger)' : 'var(--success)',
                      border: order.estado === 'pendiente' ? '1px solid rgba(231, 76, 60, 0.3)' : '1px solid rgba(78, 205, 196, 0.3)'
                    }}>
                      {order.estado}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {new Date(order.creado_en).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
