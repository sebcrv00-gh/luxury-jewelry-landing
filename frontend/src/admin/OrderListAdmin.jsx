import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RefreshCw, PackageOpen, AlertCircle, Receipt, Clock3, CircleDollarSign, Truck, FileDown, FileSpreadsheet, ChevronDown } from 'lucide-react';
import api from '../api/axios';
import { downloadInvoicePdf } from '../utils/invoicePdf';
import { exportSalesReportToExcel } from '../utils/adminExcelExport';

const ORDER_STATUSES = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];
const CASH_PAYMENT_STATUSES = ['pendiente', 'aprobado'];
const REPORT_PERIODS = [
  { key: 'daily', label: 'Diario', description: 'Base operativa completa del dia' },
  { key: 'weekly', label: 'Semanal', description: 'Base completa de los ultimos 7 dias' },
  { key: 'monthly', label: 'Mensual', description: 'Base completa del mes actual' },
  { key: 'all', label: 'Completo', description: 'Base historica integral de ventas' }
];
const ORDER_SORT_OPTIONS = [
  { value: 'recent-desc', label: 'Mas recientes' },
  { value: 'oldest-asc', label: 'Mas antiguos' },
  { value: 'items-desc', label: 'Mas productos' },
  { value: 'items-asc', label: 'Menos productos' },
  { value: 'total-desc', label: 'Mayor monto total' },
  { value: 'total-asc', label: 'Menor monto total' }
];

const getPaymentLabel = (paymentMethod) => {
  if (paymentMethod === 'wompi') return 'Wompi';
  if (paymentMethod === 'efectivo') return 'Efectivo';
  return 'Pendiente';
};

const getPaymentStatusLabel = (paymentStatus, paymentMethod) => {
  if (paymentMethod === 'efectivo' && paymentStatus === 'aprobado') return 'Cobrado';
  if (paymentMethod === 'efectivo' && paymentStatus === 'pendiente') return 'Pendiente de cobro';
  if (paymentStatus === 'aprobado') return 'Aprobado';
  if (paymentStatus === 'rechazado') return 'Rechazado';
  if (paymentStatus === 'error') return 'Error';
  if (paymentStatus === 'pendiente_confirmacion') return 'Pendiente confirmacion';
  if (paymentStatus === 'checkout_generado') return 'Checkout generado';
  if (paymentStatus === 'pendiente_checkout') return 'Pendiente checkout';
  return 'Pendiente';
};

const getPaymentStatusClass = (paymentStatus) => {
  if (paymentStatus === 'aprobado') return 'success';
  if (paymentStatus === 'rechazado' || paymentStatus === 'error') return 'danger';
  return 'pending';
};

export default function OrderListAdmin({ refreshTrigger }) {
  const location = useLocation();
  const navigate = useNavigate();
  const exportMenuRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [updatingPaymentOrderId, setUpdatingPaymentOrderId] = useState(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState(null);
  const [exportingPeriod, setExportingPeriod] = useState('');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState('');
  const [sortBy, setSortBy] = useState('recent-desc');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/orders/admin/detailed');
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

  const updateCashPaymentStatus = async (orderId, nextStatus) => {
    setUpdatingPaymentOrderId(orderId);
    setStatusFeedback('');
    try {
      const { data } = await api.put(`/orders/${orderId}/payment-status`, { estado_pago: nextStatus });
      setOrders(prev => prev.map(order => (
        order.id === orderId ? { ...order, ...data.order } : order
      )));
      setStatusFeedback(`Pago del pedido #${String(orderId).padStart(5, '0')} actualizado a ${nextStatus === 'aprobado' ? 'cobrado' : 'pendiente'}.`);
    } catch (err) {
      setStatusFeedback(err.response?.data?.error || 'No fue posible actualizar el estado de cobro.');
    } finally {
      setUpdatingPaymentOrderId(null);
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

  const countsAsProcessedRevenue = (order) => {
    if (order.metodo_pago === 'wompi') {
      return order.estado_pago === 'aprobado';
    }
    if (order.metodo_pago === 'efectivo') {
      return order.estado_pago === 'aprobado' && order.estado === 'entregado';
    }
    return false;
  };
  const activeExportLabel = REPORT_PERIODS.find((period) => period.key === exportingPeriod)?.label || 'Periodo';
  const searchParams = new URLSearchParams(location.search);
  const clientFilterId = String(searchParams.get('clientId') || '').trim();
  const clientFilterName = String(searchParams.get('clientName') || '').trim();
  const getItemCount = (order) => (order.items || []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
  const filteredOrders = useMemo(() => {
    const baseOrders = clientFilterId
      ? orders.filter((order) => String(order.usuario_id) === clientFilterId)
      : orders;

    return baseOrders.slice().sort((a, b) => {
      const aDate = new Date(a.creado_en || 0).getTime();
      const bDate = new Date(b.creado_en || 0).getTime();
      const aItems = getItemCount(a);
      const bItems = getItemCount(b);
      const aTotal = Number(a.total || 0);
      const bTotal = Number(b.total || 0);

      switch (sortBy) {
        case 'oldest-asc':
          return aDate - bDate || a.id - b.id;
        case 'items-desc':
          return bItems - aItems || bDate - aDate;
        case 'items-asc':
          return aItems - bItems || bDate - aDate;
        case 'total-asc':
          return aTotal - bTotal || bDate - aDate;
        case 'total-desc':
          return bTotal - aTotal || bDate - aDate;
        case 'recent-desc':
        default:
          return bDate - aDate || b.id - a.id;
      }
    });
  }, [clientFilterId, orders, sortBy]);
  const pendingOrders = filteredOrders.filter(order => order.estado === 'pendiente').length;
  const deliveredOrders = filteredOrders.filter(order => order.estado === 'entregado').length;
  const revenue = filteredOrders
    .filter(countsAsProcessedRevenue)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const latestOrderDate = filteredOrders[0]?.creado_en
    ? new Date(filteredOrders[0].creado_en).toLocaleDateString('es-CO')
    : 'Sin registros';

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
          <span className="admin-info-card-value">{filteredOrders.length}</span>
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
          <span className="admin-info-card-meta">Solo ingresos realmente cobrados y validados</span>
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

          <div className="admin-clients-toolbar" style={{ marginBottom: '18px' }}>
            <div className="admin-clients-filter-grid">
              <label className="admin-clients-select">
                <span><Clock3 size={14} /> Ordenar pedidos</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  {ORDER_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="admin-clients-toolbar-meta">
              <span className="admin-badge-pill info">{filteredOrders.length} pedidos visibles</span>
              {clientFilterId && (
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => navigate('/admin?tab=orders')}
                  style={{ padding: '10px 16px', fontSize: '0.68rem' }}
                >
                  Limpiar filtro de cliente{clientFilterName ? `: ${clientFilterName}` : ''}
                </button>
              )}
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
                <th>Productos</th>
                <th>Total (COP)</th>
                <th>Pago</th>
                <th>Estado pago</th>
                <th>Estado</th>
                <th>Gestión</th>
                <th>Factura</th>
                <th style={{ textAlign: 'center' }}>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center', padding: '80px 0' }}>
                    <PackageOpen size={48} className="text-muted" style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                    <h4 className="text-gold-light" style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Sin Pedidos Registrados</h4>
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
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
                    <td style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                      {getItemCount(order)}
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                      ${parseFloat(order.total).toLocaleString('es-CO')}
                    </td>
                    <td>
                      <span className="admin-badge-pill info">
                        {getPaymentLabel(order.metodo_pago)}
                      </span>
                    </td>
                    <td>
                      <span className={`admin-badge-pill ${getPaymentStatusClass(order.estado_pago)}`}>
                        {getPaymentStatusLabel(order.estado_pago, order.metodo_pago)}
                      </span>
                      {order.metodo_pago === 'efectivo' && (
                        <div className={`admin-status-select ${updatingPaymentOrderId === order.id ? 'is-updating' : ''}`}>
                          <select
                            value={order.estado_pago === 'aprobado' ? 'aprobado' : 'pendiente'}
                            onChange={(e) => updateCashPaymentStatus(order.id, e.target.value)}
                            disabled={updatingPaymentOrderId === order.id}
                            aria-label={`Actualizar estado de cobro del pedido ${order.id}`}
                          >
                            {CASH_PAYMENT_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status === 'aprobado' ? 'Cobrado' : 'Pendiente de cobro'}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`admin-badge-pill ${getStatusClass(order.estado)}`}>
                        {order.estado}
                      </span>
                    </td>
                    <td>
                      <div className={`admin-status-select ${updatingOrderId === order.id ? 'is-updating' : ''}`}>
                        <select
                          value={order.estado}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          disabled={updatingOrderId === order.id}
                          aria-label={`Actualizar estado logistico del pedido ${order.id}`}
                        >
                          {ORDER_STATUSES.map(status => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={14} />
                      </div>
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
