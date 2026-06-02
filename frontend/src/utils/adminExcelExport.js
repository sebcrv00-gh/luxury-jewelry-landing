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

const formatIsoDate = (value) => {
  if (!value) return '';
  return new Date(value).toISOString();
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

const toDatabaseText = (value) => {
  if (value === null || value === undefined) return '';
  return value;
};

const buildSheet = (rows, columns, emptyMessage = 'Sin registros para esta hoja') => {
  const headerRow = columns.map((column) => column.header);
  const dataRows = rows.length > 0
    ? rows.map((row) => columns.map((column) => {
        const sourceValue = typeof column.value === 'function'
          ? column.value(row)
          : row[column.key];
        return toDatabaseText(sourceValue);
      }))
    : [columns.map((column, index) => (index === 0 ? emptyMessage : ''))];

  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
  worksheet['!cols'] = columns.map((column) => ({ wch: column.width || 18 }));

  if (rows.length > 0) {
    worksheet['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rows.length, c: columns.length - 1 }
      })
    };
  }

  return worksheet;
};

const appendSheet = (workbook, rows, name, columns, emptyMessage) => {
  XLSX.utils.book_append_sheet(workbook, buildSheet(rows, columns, emptyMessage), name);
};

export function exportSalesReportToExcel(orders, periodKey) {
  const filteredOrders = filterOrdersByPeriod(orders, periodKey);
  const workbook = XLSX.utils.book_new();

  const orderRows = filteredOrders.map((order) => {
    const totalUnits = (order.items || []).reduce((sum, item) => sum + Number(item.cantidad || 0), 0);
    const subtotalProducts = (order.items || []).reduce((sum, item) => sum + formatCurrency(item.subtotal), 0);

    return {
      orden_id: order.id,
      factura_ref: `FAC-${String(order.id).padStart(6, '0')}`,
      periodo_exportado: PERIOD_LABELS[periodKey] || periodKey,
      fecha_iso: formatIsoDate(order.creado_en),
      fecha_local: formatDate(order.creado_en),
      usuario_id: order.usuario_id,
      cliente_nombre: order.usuario_nombre,
      cliente_email: order.usuario_email,
      cliente_telefono_registro: order.usuario_telefono || '',
      cliente_direccion_registro: order.usuario_direccion || '',
      estado_orden: order.estado,
      total_items_linea: (order.items || []).length,
      total_unidades: totalUnits,
      subtotal_productos: subtotalProducts,
      costo_envio: formatCurrency(order.costo_envio),
      total_pagado: formatCurrency(order.total),
      nombre_envio: order.nombre_envio,
      telefono_envio: order.telefono_envio,
      direccion_envio: order.direccion_envio,
      ciudad_envio: order.ciudad_envio,
      notas_envio: order.notas || ''
    };
  });

  const itemRows = filteredOrders.flatMap((order) =>
    (order.items || []).map((item) => ({
      item_id: item.id,
      orden_id: order.id,
      factura_ref: `FAC-${String(order.id).padStart(6, '0')}`,
      fecha_orden_iso: formatIsoDate(order.creado_en),
      fecha_orden_local: formatDate(order.creado_en),
      usuario_id: order.usuario_id,
      cliente_nombre: order.usuario_nombre,
      cliente_email: order.usuario_email,
      estado_orden: order.estado,
      producto_id: item.producto_id || '',
      producto_ref: item.producto_ref || '',
      producto_nombre: item.producto_nombre,
      precio_unitario: formatCurrency(item.producto_precio),
      cantidad: Number(item.cantidad || 0),
      subtotal_item: formatCurrency(item.subtotal)
    }))
  );

  const invoiceRows = filteredOrders.map((order) => {
    const subtotalProducts = (order.items || []).reduce((sum, item) => sum + formatCurrency(item.subtotal), 0);
    return {
      factura_ref: `FAC-${String(order.id).padStart(6, '0')}`,
      orden_id: order.id,
      fecha_emision_iso: formatIsoDate(order.creado_en),
      fecha_emision_local: formatDate(order.creado_en),
      cliente_nombre: order.usuario_nombre,
      cliente_email: order.usuario_email,
      nombre_envio: order.nombre_envio,
      telefono_envio: order.telefono_envio,
      direccion_envio: order.direccion_envio,
      ciudad_envio: order.ciudad_envio,
      subtotal_productos: subtotalProducts,
      costo_envio: formatCurrency(order.costo_envio),
      total_factura: formatCurrency(order.total),
      estado_factura: order.estado,
      notas: order.notas || ''
    };
  });

  const relatedCustomersMap = new Map();
  filteredOrders.forEach((order) => {
    if (!relatedCustomersMap.has(order.usuario_id)) {
      relatedCustomersMap.set(order.usuario_id, {
        usuario_id: order.usuario_id,
        cliente_nombre: order.usuario_nombre,
        cliente_email: order.usuario_email,
        cliente_telefono_registro: order.usuario_telefono || '',
        cliente_direccion_registro: order.usuario_direccion || '',
        ultima_fecha_compra_iso: formatIsoDate(order.creado_en),
        ultima_fecha_compra_local: formatDate(order.creado_en),
        telefono_envio_reciente: order.telefono_envio || '',
        direccion_envio_reciente: order.direccion_envio || '',
        ciudad_envio_reciente: order.ciudad_envio || ''
      });
    }
  });
  const relatedCustomerRows = Array.from(relatedCustomersMap.values());

  appendSheet(workbook, orderRows, 'DB_Ordenes', [
    { key: 'orden_id', header: 'orden_id', width: 10 },
    { key: 'factura_ref', header: 'factura_ref', width: 15 },
    { key: 'periodo_exportado', header: 'periodo_exportado', width: 16 },
    { key: 'fecha_iso', header: 'fecha_iso', width: 24 },
    { key: 'fecha_local', header: 'fecha_local', width: 22 },
    { key: 'usuario_id', header: 'usuario_id', width: 10 },
    { key: 'cliente_nombre', header: 'cliente_nombre', width: 24 },
    { key: 'cliente_email', header: 'cliente_email', width: 30 },
    { key: 'cliente_telefono_registro', header: 'cliente_telefono_registro', width: 22 },
    { key: 'cliente_direccion_registro', header: 'cliente_direccion_registro', width: 32 },
    { key: 'estado_orden', header: 'estado_orden', width: 16 },
    { key: 'total_items_linea', header: 'total_items_linea', width: 16 },
    { key: 'total_unidades', header: 'total_unidades', width: 16 },
    { key: 'subtotal_productos', header: 'subtotal_productos', width: 18 },
    { key: 'costo_envio', header: 'costo_envio', width: 14 },
    { key: 'total_pagado', header: 'total_pagado', width: 16 },
    { key: 'nombre_envio', header: 'nombre_envio', width: 24 },
    { key: 'telefono_envio', header: 'telefono_envio', width: 18 },
    { key: 'direccion_envio', header: 'direccion_envio', width: 34 },
    { key: 'ciudad_envio', header: 'ciudad_envio', width: 18 },
    { key: 'notas_envio', header: 'notas_envio', width: 34 }
  ]);

  appendSheet(workbook, itemRows, 'DB_Items', [
    { key: 'item_id', header: 'item_id', width: 10 },
    { key: 'orden_id', header: 'orden_id', width: 10 },
    { key: 'factura_ref', header: 'factura_ref', width: 15 },
    { key: 'fecha_orden_iso', header: 'fecha_orden_iso', width: 24 },
    { key: 'fecha_orden_local', header: 'fecha_orden_local', width: 22 },
    { key: 'usuario_id', header: 'usuario_id', width: 10 },
    { key: 'cliente_nombre', header: 'cliente_nombre', width: 24 },
    { key: 'cliente_email', header: 'cliente_email', width: 30 },
    { key: 'estado_orden', header: 'estado_orden', width: 16 },
    { key: 'producto_id', header: 'producto_id', width: 12 },
    { key: 'producto_ref', header: 'producto_ref', width: 24 },
    { key: 'producto_nombre', header: 'producto_nombre', width: 34 },
    { key: 'precio_unitario', header: 'precio_unitario', width: 16 },
    { key: 'cantidad', header: 'cantidad', width: 12 },
    { key: 'subtotal_item', header: 'subtotal_item', width: 16 }
  ]);

  appendSheet(workbook, invoiceRows, 'DB_Facturas', [
    { key: 'factura_ref', header: 'factura_ref', width: 15 },
    { key: 'orden_id', header: 'orden_id', width: 10 },
    { key: 'fecha_emision_iso', header: 'fecha_emision_iso', width: 24 },
    { key: 'fecha_emision_local', header: 'fecha_emision_local', width: 22 },
    { key: 'cliente_nombre', header: 'cliente_nombre', width: 24 },
    { key: 'cliente_email', header: 'cliente_email', width: 30 },
    { key: 'nombre_envio', header: 'nombre_envio', width: 24 },
    { key: 'telefono_envio', header: 'telefono_envio', width: 18 },
    { key: 'direccion_envio', header: 'direccion_envio', width: 34 },
    { key: 'ciudad_envio', header: 'ciudad_envio', width: 18 },
    { key: 'subtotal_productos', header: 'subtotal_productos', width: 18 },
    { key: 'costo_envio', header: 'costo_envio', width: 14 },
    { key: 'total_factura', header: 'total_factura', width: 16 },
    { key: 'estado_factura', header: 'estado_factura', width: 16 },
    { key: 'notas', header: 'notas', width: 34 }
  ]);

  appendSheet(workbook, relatedCustomerRows, 'DB_Clientes', [
    { key: 'usuario_id', header: 'usuario_id', width: 10 },
    { key: 'cliente_nombre', header: 'cliente_nombre', width: 24 },
    { key: 'cliente_email', header: 'cliente_email', width: 30 },
    { key: 'cliente_telefono_registro', header: 'cliente_telefono_registro', width: 22 },
    { key: 'cliente_direccion_registro', header: 'cliente_direccion_registro', width: 32 },
    { key: 'ultima_fecha_compra_iso', header: 'ultima_fecha_compra_iso', width: 24 },
    { key: 'ultima_fecha_compra_local', header: 'ultima_fecha_compra_local', width: 22 },
    { key: 'telefono_envio_reciente', header: 'telefono_envio_reciente', width: 22 },
    { key: 'direccion_envio_reciente', header: 'direccion_envio_reciente', width: 32 },
    { key: 'ciudad_envio_reciente', header: 'ciudad_envio_reciente', width: 18 }
  ]);

  XLSX.writeFile(workbook, `base-datos-operativa-${PERIOD_LABELS[periodKey] || periodKey}.xlsx`);
}

export function exportClientsToExcel(clients) {
  const workbook = XLSX.utils.book_new();
  const allUserRows = clients.map((client) => ({
    usuario_id: client.id,
    nombre: client.nombre,
    email: client.email,
    telefono: client.telefono || '',
    direccion: client.direccion || '',
    rol: client.rol,
    total_pedidos: Number(client.total_pedidos || 0),
    foto_registrada: client.foto ? 'si' : 'no'
  }));

  const customerRows = allUserRows.filter((client) => client.rol !== 'admin');
  const adminRows = allUserRows.filter((client) => client.rol === 'admin');

  const commonColumns = [
    { key: 'usuario_id', header: 'usuario_id', width: 10 },
    { key: 'nombre', header: 'nombre', width: 24 },
    { key: 'email', header: 'email', width: 30 },
    { key: 'telefono', header: 'telefono', width: 18 },
    { key: 'direccion', header: 'direccion', width: 34 },
    { key: 'rol', header: 'rol', width: 14 },
    { key: 'total_pedidos', header: 'total_pedidos', width: 14 },
    { key: 'foto_registrada', header: 'foto_registrada', width: 16 }
  ];

  appendSheet(workbook, customerRows, 'DB_Clientes', commonColumns);
  appendSheet(workbook, adminRows, 'DB_Admin', commonColumns);
  appendSheet(workbook, allUserRows, 'DB_Todos_Usuarios', commonColumns);

  XLSX.writeFile(workbook, 'base-datos-clientes-completa.xlsx');
}
