import { useState, useEffect, useRef } from 'react';
import { RefreshCw, PackageOpen, AlertCircle, Receipt, Clock3, CircleDollarSign, Truck, FileDown, FileSpreadsheet, ChevronDown } from 'lucide-react';
import api from '../api/axios';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { exportSalesReportToExcel } from '../utils/adminExcelExport';

const ORDER_STATUSES = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];
const REPORT_PERIODS = [
  { key: 'daily', label: 'Diario', description: 'Base operativa completa del dia' },
  { key: 'weekly', label: 'Semanal', description: 'Base completa de los ultimos 7 dias' },
  { key: 'monthly', label: 'Mensual', description: 'Base completa del mes actual' },
  { key: 'all', label: 'Completo', description: 'Base historica integral de ventas' }
];

const getPaymentLabel = (paymentMethod) => {
  if (paymentMethod === 'wompi') return 'Wompi';
  if (paymentMethod === 'efectivo') return 'Efectivo';
  return 'Pendiente';
};

export default function OrderListAdmin({ refreshTrigger }) {
  const exportMenuRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [exportingPeriod, setExportingPeriod] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');

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

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const updateOrderStatus = async (orderId, nextStatus) => {
    setUpdatingOrderId(orderId);
    setStatusFeedback('');
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { estado: nextStatus });
      setOrders(prev => prev.map(order => (
        order.id === orderId ? { ...order, ...data.order } : order
      )));
      setStatusFeedback(`Pedido #${String(orderId).padStart(5, '0')} actualizado a ${nextStatus}.`);
    } catch (err) {
      setStatusFeedback(err.response?.data?.error || 'No fue posible actualizar el estado del pedido.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const downloadOrderInvoice = async (order) => {
    setDownloadingInvoiceId(order.id);
    setStatusFeedback('');
    try {
      const { data } = await api.get(`/orders/${order.id}`);
      downloadInvoicePdf({
        order: {
          ...data,
          usuario_nombre: order.usuario_nombre,
          usuario_email: order.usuario_email
        },
        customerName: order.usuario_nombre,
        customerEmail: order.usuario_email,
        paymentLabel: getPaymentLabel(order.metodo_pago),
        generatedBy: 'Panel administrativo'
      });
    } catch (err) {
      setStatusFeedback('No fue posible generar la factura del pedido.');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const exportSalesReport = async (periodKey) => {
    setExportingPeriod(periodKey);
    setStatusFeedback('');
    setIsExportMenuOpen(false);
    try {
      const { data } = await api.get('/orders/admin/detailed');
      exportSalesReportToExcel(Array.isArray(data) ? data : [], periodKey);
      const periodLabel = REPORT_PERIODS.find((period) => period.key === periodKey)?.label || 'Base';
      setStatusFeedback(`Base operativa ${periodLabel.toLowerCase()} exportada correctamente en formato Excel.`);
    } catch (err) {
      setStatusFeedback(err.response?.data?.error || 'No fue posible exportar el reporte de ventas.');
    } finally {
      setExportingPeriod('');
    }
  };

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
  const activeExportLabel = REPORT_PERIODS.find((period) => period.key === exportingPeriod)?.label || 'Periodo';

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
        <div className="admin-inline-actions" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className={`admin-action-dropdown ${isExportMenuOpen ? 'open' : ''}`} ref={exportMenuRef}>
            <button
              type="button"
              className={`admin-action-trigger ${isExportMenuOpen ? 'active' : ''}`}
              onClick={() => setIsExportMenuOpen((current) => !current)}
              disabled={Boolean(exportingPeriod)}
            >
              <FileSpreadsheet size={14} />
              <span>{exportingPeriod ? `Exportando ${activeExportLabel.toLowerCase()}...` : 'Exportar base de datos XLSX'}</span>
              <ChevronDown size={14} />
            </button>
            <div className="admin-action-menu" role="menu" aria-label="Opciones de exportacion Excel">
              <div className="admin-action-menu-head">
                <strong>Selecciona una base operativa</strong>
                <span>Descarga ordenes, facturas, items y clientes relacionados en hojas separadas de Excel.</span>
              </div>
              <div className="admin-action-menu-list">
                {REPORT_PERIODS.map((period) => (
                  <button
                    key={period.key}
                    type="button"
                    className="admin-action-option"
                    onClick={() => exportSalesReport(period.key)}
                    disabled={Boolean(exportingPeriod)}
                    role="menuitem"
                  >
                    <div>
                      <strong>{period.label} XLSX</strong>
                      <span>{period.description}</span>
                    </div>
                    <FileSpreadsheet size={14} />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button onClick={fetchOrders} className="btn-outline" style={{ padding: '10px 18px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            {loading ? 'Sincronizando...' : 'Actualizar pedidos'}
          </button>
        </div>
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
              <p className="admin-muted-note">Vista transversal de clientes, estado logístico, facturas y volumen monetario por pedido.</p>
            </div>
            <div className="admin-inline-actions">
              <span className="admin-badge-pill pending">{pendingOrders} pendientes</span>
              <span className="admin-badge-pill success">{deliveredOrders} entregados</span>
            </div>
          </div>

          {statusFeedback && (
            <div
              className="admin-badge-pill info"
              style={{ marginBottom: '18px', display: 'inline-flex', width: 'fit-content' }}
            >
              {statusFeedback}
            </div>
          )}

          <table className="luxury-table">
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Cliente</th>
                <th>Ciudad Destino</th>
                <th>Total (COP)</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Gestión</th>
                <th>Factura</th>
                <th style={{ textAlign: 'center' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '80px 0' }}>
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
                      <span className="admin-badge-pill info">
                        {getPaymentLabel(order.metodo_pago)}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge-pill ${getStatusClass(order.estado)}`}>
                        {order.estado}
                      </span>
                    </td>
                    <td>
                      <select
                        value={order.estado}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                        disabled={updatingOrderId === order.id}
                        style={{
                          width: '100%',
                          minWidth: '150px',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(201, 168, 76, 0.18)',
                          borderRadius: '10px',
                          color: 'var(--text-primary)',
                          padding: '10px 12px',
                          outline: 'none',
                          textTransform: 'capitalize',
                          cursor: updatingOrderId === order.id ? 'wait' : 'pointer'
                        }}
                      >
                        {ORDER_STATUSES.map(status => (
                          <option key={status} value={status} style={{ color: '#111' }}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={() => downloadOrderInvoice(order)}
                        disabled={downloadingInvoiceId === order.id}
                        style={{
                          padding: '10px 14px',
                          fontSize: '0.7rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          whiteSpace: 'nowrap',
                          opacity: downloadingInvoiceId === order.id ? 0.7 : 1
                        }}
                      >
                        <FileDown size={14} />
                        {downloadingInvoiceId === order.id ? 'Generando...' : 'PDF'}
                      </button>
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
