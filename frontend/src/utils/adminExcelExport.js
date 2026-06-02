import * as XLSX from 'xlsx';

const PERIOD_LABELS = {
  daily: 'diario',
  weekly: 'semanal',
  monthly: 'mensual',
  all: 'historico'
};

const formatCurrency = (value) => Number(value || 0);

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleString('es-CO');
};

const getPeriodRange = (periodKey) => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (periodKey === 'daily') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (periodKey === 'weekly') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  if (periodKey === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  return null;
};

const filterOrdersByPeriod = (orders, periodKey) => {
  if (periodKey === 'all') {
    return orders;
  }

  const range = getPeriodRange(periodKey);
  if (!range) return orders;

  return orders.filter((order) => {
    const createdAt = new Date(order.creado_en);
    return createdAt >= range.start && createdAt <= range.end;
  });
};

const createSheet = (rows) => XLSX.utils.json_to_sheet(rows);

const appendSheet = (workbook, rows, name) => {
  const safeRows = rows.length > 0 ? rows : [{ mensaje: 'Sin registros para este periodo' }];
  XLSX.utils.book_append_sheet(workbook, createSheet(safeRows), name);
};

export function exportSalesReportToExcel(orders, periodKey) {
  const filteredOrders = filterOrdersByPeriod(orders, periodKey);
  const deliveredOrders = filteredOrders.filter((order) => order.estado === 'entregado');
  const cancelledOrders = filteredOrders.filter((order) => order.estado === 'cancelado');
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + formatCurrency(order.total), 0);
  const uniqueClients = new Set(filteredOrders.map((order) => order.usuario_id)).size;
  const totalItems = filteredOrders.reduce((sum, order) => sum + (order.items || []).reduce((itemsSum, item) => itemsSum + Number(item.cantidad || 0), 0), 0);
  const averageTicket = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, [
    { indicador: 'Periodo exportado', valor: PERIOD_LABELS[periodKey] || periodKey },
    { indicador: 'Fecha de generacion', valor: formatDate(new Date()) },
    { indicador: 'Ventas registradas', valor: filteredOrders.length },
    { indicador: 'Ventas entregadas', valor: deliveredOrders.length },
    { indicador: 'Ventas canceladas', valor: cancelledOrders.length },
    { indicador: 'Clientes unicos', valor: uniqueClients },
    { indicador: 'Items vendidos', valor: totalItems },
    { indicador: 'Facturacion total', valor: totalRevenue },
    { indicador: 'Ticket promedio', valor: averageTicket }
  ], 'Resumen');

  appendSheet(
    workbook,
    filteredOrders.map((order) => ({
      pedido_id: `#${String(order.id).padStart(5, '0')}`,
      fecha: formatDate(order.creado_en),
      cliente: order.usuario_nombre,
      email: order.usuario_email,
      telefono: order.telefono_envio || order.usuario_telefono || '',
      ciudad: order.ciudad_envio,
      direccion: order.direccion_envio,
      estado: order.estado,
      total: formatCurrency(order.total),
      costo_envio: formatCurrency(order.costo_envio),
      notas: order.notas || ''
    })),
    'Facturas'
  );

  appendSheet(
    workbook,
    filteredOrders.flatMap((order) =>
      (order.items || []).map((item) => ({
        pedido_id: `#${String(order.id).padStart(5, '0')}`,
        fecha: formatDate(order.creado_en),
        cliente: order.usuario_nombre,
        producto: item.producto_nombre,
        precio_unitario: formatCurrency(item.producto_precio),
        cantidad: Number(item.cantidad || 0),
        subtotal: formatCurrency(item.subtotal),
        estado_pedido: order.estado
      }))
    ),
    'Detalle Items'
  );

  XLSX.writeFile(workbook, `reporte-ventas-${PERIOD_LABELS[periodKey] || periodKey}.xlsx`);
}

export function exportClientsToExcel(clients) {
  const customerRows = clients
    .filter((client) => client.rol !== 'admin')
    .map((client) => ({
      id: client.id,
      nombre: client.nombre,
      email: client.email,
      telefono: client.telefono || '',
      direccion: client.direccion || '',
      rol: client.rol,
      total_pedidos: Number(client.total_pedidos || 0)
    }));

  const adminRows = clients
    .filter((client) => client.rol === 'admin')
    .map((client) => ({
      id: client.id,
      nombre: client.nombre,
      email: client.email,
      telefono: client.telefono || '',
      direccion: client.direccion || '',
      rol: client.rol
    }));

  const workbook = XLSX.utils.book_new();

  appendSheet(workbook, [
    { indicador: 'Fecha de generacion', valor: formatDate(new Date()) },
    { indicador: 'Clientes exportados', valor: customerRows.length },
    { indicador: 'Clientes VIP', valor: customerRows.filter((client) => client.rol === 'vip').length },
    { indicador: 'Compradores registrados', valor: customerRows.filter((client) => Number(client.total_pedidos || 0) > 0).length },
    { indicador: 'Administradores', valor: adminRows.length }
  ], 'Resumen');

  appendSheet(workbook, customerRows, 'Clientes');
  appendSheet(workbook, adminRows, 'Equipo Admin');

  XLSX.writeFile(workbook, 'base-clientes-luxury-jewelry.xlsx');
}
