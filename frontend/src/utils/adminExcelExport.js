import ExcelJS from 'exceljs';

const PERIOD_LABELS = {
  daily: 'diario',
  weekly: 'semanal',
  monthly: 'mensual',
  all: 'historico'
};

const THEME = {
  black: '0F0B08',
  blackSoft: '17120D',
  gold: 'C9A84C',
  goldSoft: 'E8D8A8',
  ivory: 'F8F3E7',
  text: 'F4EDE1',
  muted: 'BBAE90',
  rowAlt: '1C1610',
  border: '3A2D1A',
  accent: '8C6A2C',
  success: '1E7C54'
};

const CURRENCY_FORMAT = '"$"#,##0.00;[Red]-"$"#,##0.00';

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

const toCellValue = (value) => {
  if (value === null || value === undefined) return '';
  return value;
};

const isCurrencyColumn = (column) => column.type === 'currency';
const isNumericColumn = (column) => column.type === 'number' || column.type === 'currency';

function countsAsProcessedRevenue(order) {
  if (order?.metodo_pago === 'wompi') {
    return order?.estado_pago === 'aprobado';
  }

  if (order?.metodo_pago === 'efectivo') {
    return order?.estado_pago === 'aprobado' && order?.estado === 'entregado';
  }

  return false;
}

function downloadBuffer(buffer, fileName) {
  const blob = new Blob(
    [buffer],
    { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function createWorkbook(title, subject) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Luxury Jewelry';
  workbook.company = 'Luxury Jewelry';
  workbook.subject = subject;
  workbook.title = title;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();
  return workbook;
}

function styleCellBorders(cell) {
  cell.border = {
    top: { style: 'thin', color: { argb: THEME.border } },
    left: { style: 'thin', color: { argb: THEME.border } },
    bottom: { style: 'thin', color: { argb: THEME.border } },
    right: { style: 'thin', color: { argb: THEME.border } }
  };
}

function addLuxurySummarySheet(workbook, config) {
  const worksheet = workbook.addWorksheet(config.sheetName || 'Luxury_Resumen', {
    views: [{ showGridLines: false }]
  });

  worksheet.properties.defaultRowHeight = 22;
  worksheet.columns = [
    { width: 6 },
    { width: 24 },
    { width: 24 },
    { width: 24 },
    { width: 24 },
    { width: 6 }
  ];

  worksheet.mergeCells('B2:E2');
  const brandCell = worksheet.getCell('B2');
  brandCell.value = 'LUXURY JEWELRY';
  brandCell.font = { name: 'Georgia', size: 22, bold: true, color: { argb: THEME.goldSoft } };
  brandCell.alignment = { horizontal: 'center', vertical: 'middle' };
  brandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.black } };
  styleCellBorders(brandCell);

  worksheet.mergeCells('B3:E3');
  const titleCell = worksheet.getCell('B3');
  titleCell.value = config.title;
  titleCell.font = { name: 'Aptos', size: 15, bold: true, color: { argb: THEME.text } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blackSoft } };
  styleCellBorders(titleCell);

  worksheet.mergeCells('B4:E4');
  const subtitleCell = worksheet.getCell('B4');
  subtitleCell.value = config.subtitle;
  subtitleCell.font = { name: 'Aptos', size: 11, italic: true, color: { argb: THEME.muted } };
  subtitleCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blackSoft } };
  styleCellBorders(subtitleCell);

  worksheet.mergeCells('B6:E6');
  const metaCell = worksheet.getCell('B6');
  metaCell.value = `Documento generado el ${new Date().toLocaleString('es-CO')} · Estilo operativo premium`;
  metaCell.font = { name: 'Aptos', size: 10, color: { argb: THEME.text } };
  metaCell.alignment = { horizontal: 'center' };

  const cards = config.summaryCards || [];
  cards.forEach((card, index) => {
    const rowStart = 8 + Math.floor(index / 2) * 3;
    const isLeft = index % 2 === 0;
    const startCol = isLeft ? 'B' : 'D';
    const endCol = isLeft ? 'C' : 'E';
    worksheet.mergeCells(`${startCol}${rowStart}:${endCol}${rowStart}`);
    worksheet.mergeCells(`${startCol}${rowStart + 1}:${endCol}${rowStart + 1}`);

    const labelCell = worksheet.getCell(`${startCol}${rowStart}`);
    labelCell.value = card.label;
    labelCell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: THEME.goldSoft } };
    labelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    labelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.black } };
    styleCellBorders(labelCell);

    const valueCell = worksheet.getCell(`${startCol}${rowStart + 1}`);
    valueCell.value = card.value;
    valueCell.font = { name: 'Georgia', size: 15, bold: true, color: { argb: THEME.text } };
    valueCell.alignment = { horizontal: 'center', vertical: 'middle' };
    valueCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blackSoft } };
    styleCellBorders(valueCell);
  });

  const noteRow = 8 + Math.ceil(cards.length / 2) * 3 + 1;
  worksheet.mergeCells(`B${noteRow}:E${noteRow + 1}`);
  const noteCell = worksheet.getCell(`B${noteRow}`);
  noteCell.value = config.note;
  noteCell.font = { name: 'Aptos', size: 10, color: { argb: THEME.text } };
  noteCell.alignment = { wrapText: true, vertical: 'middle' };
  noteCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.accent } };
  styleCellBorders(noteCell);

  return worksheet;
}

function addLuxuryDataSheet(workbook, { name, title, subtitle, rows, columns, emptyMessage }) {
  const worksheet = workbook.addWorksheet(name, {
    views: [{ state: 'frozen', ySplit: 6 }]
  });

  worksheet.properties.defaultRowHeight = 20;
  worksheet.columns = columns.map((column) => ({
    key: column.key,
    width: column.width || 18
  }));

  const lastColumnLetter = worksheet.getColumn(columns.length).letter;

  worksheet.mergeCells(`A1:${lastColumnLetter}1`);
  const brandCell = worksheet.getCell('A1');
  brandCell.value = 'LUXURY JEWELRY';
  brandCell.font = { name: 'Georgia', size: 20, bold: true, color: { argb: THEME.goldSoft } };
  brandCell.alignment = { horizontal: 'center', vertical: 'middle' };
  brandCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.black } };

  worksheet.mergeCells(`A2:${lastColumnLetter}2`);
  const titleCell = worksheet.getCell('A2');
  titleCell.value = title;
  titleCell.font = { name: 'Aptos', size: 14, bold: true, color: { argb: THEME.text } };
  titleCell.alignment = { horizontal: 'center' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blackSoft } };

  worksheet.mergeCells(`A3:${lastColumnLetter}3`);
  const subtitleCell = worksheet.getCell('A3');
  subtitleCell.value = subtitle;
  subtitleCell.font = { name: 'Aptos', size: 10, italic: true, color: { argb: THEME.muted } };
  subtitleCell.alignment = { horizontal: 'center' };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.blackSoft } };

  worksheet.mergeCells(`A4:${lastColumnLetter}4`);
  const infoCell = worksheet.getCell('A4');
  infoCell.value = `Exportado el ${new Date().toLocaleString('es-CO')} · Documento interno Luxury Jewelry`;
  infoCell.font = { name: 'Aptos', size: 9, color: { argb: THEME.text } };
  infoCell.alignment = { horizontal: 'center' };
  infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.accent } };

  const headerRowIndex = 6;
  const headerRow = worksheet.getRow(headerRowIndex);
  columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = column.header;
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: THEME.black } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.gold } };
    styleCellBorders(cell);
  });
  headerRow.height = 24;

  const safeRows = rows.length > 0
    ? rows
    : [{ [columns[0].key]: emptyMessage || 'Sin registros para esta hoja' }];

  safeRows.forEach((rowData, rowOffset) => {
    const rowIndex = headerRowIndex + 1 + rowOffset;
    const row = worksheet.getRow(rowIndex);

    columns.forEach((column, columnIndex) => {
      const cell = row.getCell(columnIndex + 1);
      const rawValue = typeof column.value === 'function'
        ? column.value(rowData)
        : rowData[column.key];

      cell.value = toCellValue(rawValue);
      cell.font = { name: 'Aptos', size: 10, color: { argb: THEME.text } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: isNumericColumn(column) ? 'right' : 'left',
        wrapText: true
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: rowOffset % 2 === 0 ? THEME.blackSoft : THEME.rowAlt }
      };
      styleCellBorders(cell);

      if (isCurrencyColumn(column) && typeof cell.value === 'number') {
        cell.numFmt = CURRENCY_FORMAT;
      }
    });

    row.height = 20;
  });

  if (rows.length > 0) {
    worksheet.autoFilter = {
      from: { row: headerRowIndex, column: 1 },
      to: { row: headerRowIndex, column: columns.length }
    };
  }

  return worksheet;
}

async function finalizeWorkbook(workbook, fileName) {
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, fileName);
}

export async function exportSalesReportToExcel(orders, periodKey) {
  const filteredOrders = filterOrdersByPeriod(orders, periodKey);
  const workbook = createWorkbook('Base Operativa Luxury Jewelry', 'Base operativa de ventas y clientes');

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
      metodo_pago: order.metodo_pago || '',
      estado_pago: order.estado_pago || '',
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
      metodo_pago: order.metodo_pago || '',
      estado_pago: order.estado_pago || '',
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
      metodo_pago: order.metodo_pago || '',
      estado_pago: order.estado_pago || '',
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

  const processedRevenue = filteredOrders
    .filter(countsAsProcessedRevenue)
    .reduce((sum, order) => sum + formatCurrency(order.total), 0);

  const totalUnits = filteredOrders.reduce(
    (sum, order) => sum + (order.items || []).reduce((acc, item) => acc + Number(item.cantidad || 0), 0),
    0
  );

  addLuxurySummarySheet(workbook, {
    title: 'Base Operativa de Ventas',
    subtitle: `Periodo ${String(PERIOD_LABELS[periodKey] || periodKey).toUpperCase()} · Exportacion ejecutiva con identidad Luxury Jewelry`,
    summaryCards: [
      { label: 'Pedidos exportados', value: filteredOrders.length },
      { label: 'Items exportados', value: itemRows.length },
      { label: 'Clientes relacionados', value: relatedCustomerRows.length },
      { label: 'Valor procesado real', value: `$${processedRevenue.toLocaleString('es-CO')}` },
      { label: 'Unidades consolidadas', value: totalUnits },
      { label: 'Facturas incluidas', value: invoiceRows.length }
    ],
    note: 'Este documento mantiene una lectura operativa y ejecutiva. El valor procesado se calcula solo sobre ingresos realmente cobrados segun la logica del panel administrativo.',
    sheetName: 'Luxury_Resumen'
  });

  addLuxuryDataSheet(workbook, {
    name: 'DB_Ordenes',
    title: 'Registro Consolidado de Ordenes',
    subtitle: 'Base principal con trazabilidad comercial, logistica y datos de cliente.',
    rows: orderRows,
    columns: [
      { key: 'orden_id', header: 'orden_id', width: 10, type: 'number' },
      { key: 'factura_ref', header: 'factura_ref', width: 16 },
      { key: 'periodo_exportado', header: 'periodo_exportado', width: 16 },
      { key: 'fecha_iso', header: 'fecha_iso', width: 24 },
      { key: 'fecha_local', header: 'fecha_local', width: 22 },
      { key: 'usuario_id', header: 'usuario_id', width: 10, type: 'number' },
      { key: 'cliente_nombre', header: 'cliente_nombre', width: 24 },
      { key: 'cliente_email', header: 'cliente_email', width: 30 },
      { key: 'cliente_telefono_registro', header: 'cliente_telefono_registro', width: 22 },
      { key: 'cliente_direccion_registro', header: 'cliente_direccion_registro', width: 32 },
      { key: 'metodo_pago', header: 'metodo_pago', width: 14 },
      { key: 'estado_pago', header: 'estado_pago', width: 20 },
      { key: 'estado_orden', header: 'estado_orden', width: 16 },
      { key: 'total_items_linea', header: 'total_items_linea', width: 16, type: 'number' },
      { key: 'total_unidades', header: 'total_unidades', width: 16, type: 'number' },
      { key: 'subtotal_productos', header: 'subtotal_productos', width: 18, type: 'currency' },
      { key: 'costo_envio', header: 'costo_envio', width: 14, type: 'currency' },
      { key: 'total_pagado', header: 'total_pagado', width: 16, type: 'currency' },
      { key: 'nombre_envio', header: 'nombre_envio', width: 24 },
      { key: 'telefono_envio', header: 'telefono_envio', width: 18 },
      { key: 'direccion_envio', header: 'direccion_envio', width: 34 },
      { key: 'ciudad_envio', header: 'ciudad_envio', width: 18 },
      { key: 'notas_envio', header: 'notas_envio', width: 34 }
    ]
  });

  addLuxuryDataSheet(workbook, {
    name: 'DB_Items',
    title: 'Detalle de Items Vendidos',
    subtitle: 'Desglose unitario de productos, cantidades y subtotales por orden.',
    rows: itemRows,
    columns: [
      { key: 'item_id', header: 'item_id', width: 10, type: 'number' },
      { key: 'orden_id', header: 'orden_id', width: 10, type: 'number' },
      { key: 'factura_ref', header: 'factura_ref', width: 16 },
      { key: 'fecha_orden_iso', header: 'fecha_orden_iso', width: 24 },
      { key: 'fecha_orden_local', header: 'fecha_orden_local', width: 22 },
      { key: 'usuario_id', header: 'usuario_id', width: 10, type: 'number' },
      { key: 'cliente_nombre', header: 'cliente_nombre', width: 24 },
      { key: 'cliente_email', header: 'cliente_email', width: 30 },
      { key: 'estado_orden', header: 'estado_orden', width: 16 },
      { key: 'metodo_pago', header: 'metodo_pago', width: 14 },
      { key: 'estado_pago', header: 'estado_pago', width: 20 },
      { key: 'producto_id', header: 'producto_id', width: 12 },
      { key: 'producto_ref', header: 'producto_ref', width: 24 },
      { key: 'producto_nombre', header: 'producto_nombre', width: 34 },
      { key: 'precio_unitario', header: 'precio_unitario', width: 16, type: 'currency' },
      { key: 'cantidad', header: 'cantidad', width: 12, type: 'number' },
      { key: 'subtotal_item', header: 'subtotal_item', width: 16, type: 'currency' }
    ]
  });

  addLuxuryDataSheet(workbook, {
    name: 'DB_Facturas',
    title: 'Facturacion Operativa',
    subtitle: 'Relación de facturas con datos de emision, envio y estado.',
    rows: invoiceRows,
    columns: [
      { key: 'factura_ref', header: 'factura_ref', width: 16 },
      { key: 'orden_id', header: 'orden_id', width: 10, type: 'number' },
      { key: 'fecha_emision_iso', header: 'fecha_emision_iso', width: 24 },
      { key: 'fecha_emision_local', header: 'fecha_emision_local', width: 22 },
      { key: 'cliente_nombre', header: 'cliente_nombre', width: 24 },
      { key: 'cliente_email', header: 'cliente_email', width: 30 },
      { key: 'nombre_envio', header: 'nombre_envio', width: 24 },
      { key: 'telefono_envio', header: 'telefono_envio', width: 18 },
      { key: 'direccion_envio', header: 'direccion_envio', width: 34 },
      { key: 'ciudad_envio', header: 'ciudad_envio', width: 18 },
      { key: 'metodo_pago', header: 'metodo_pago', width: 14 },
      { key: 'estado_pago', header: 'estado_pago', width: 20 },
      { key: 'subtotal_productos', header: 'subtotal_productos', width: 18, type: 'currency' },
      { key: 'costo_envio', header: 'costo_envio', width: 14, type: 'currency' },
      { key: 'total_factura', header: 'total_factura', width: 16, type: 'currency' },
      { key: 'estado_factura', header: 'estado_factura', width: 16 },
      { key: 'notas', header: 'notas', width: 34 }
    ]
  });

  addLuxuryDataSheet(workbook, {
    name: 'DB_Clientes',
    title: 'Clientes Relacionados',
    subtitle: 'Clientes vinculados a la base exportada con su ultimo rastro de compra.',
    rows: relatedCustomerRows,
    columns: [
      { key: 'usuario_id', header: 'usuario_id', width: 10, type: 'number' },
      { key: 'cliente_nombre', header: 'cliente_nombre', width: 24 },
      { key: 'cliente_email', header: 'cliente_email', width: 30 },
      { key: 'cliente_telefono_registro', header: 'cliente_telefono_registro', width: 22 },
      { key: 'cliente_direccion_registro', header: 'cliente_direccion_registro', width: 32 },
      { key: 'ultima_fecha_compra_iso', header: 'ultima_fecha_compra_iso', width: 24 },
      { key: 'ultima_fecha_compra_local', header: 'ultima_fecha_compra_local', width: 22 },
      { key: 'telefono_envio_reciente', header: 'telefono_envio_reciente', width: 22 },
      { key: 'direccion_envio_reciente', header: 'direccion_envio_reciente', width: 32 },
      { key: 'ciudad_envio_reciente', header: 'ciudad_envio_reciente', width: 18 }
    ]
  });

  await finalizeWorkbook(workbook, `base-datos-operativa-${PERIOD_LABELS[periodKey] || periodKey}.xlsx`);
}

export async function exportClientsToExcel(clients) {
  const workbook = createWorkbook('Base de Clientes Luxury Jewelry', 'Base consolidada de clientes y administradores');

  const allUserRows = clients.map((client) => ({
    usuario_id: client.id,
    nombre: client.nombre,
    email: client.email,
    telefono: client.telefono || '',
    direccion: client.direccion || '',
    rol: client.rol,
    total_pedidos: Number(client.total_pedidos || 0),
    foto_registrada: client.foto ? 'si' : 'no',
    fecha_registro: formatDate(client.creado_en),
    fecha_registro_iso: formatIsoDate(client.creado_en)
  }));

  const customerRows = allUserRows.filter((client) => client.rol !== 'admin');
  const adminRows = allUserRows.filter((client) => client.rol === 'admin');
  const vipRows = allUserRows.filter((client) => client.rol === 'vip');
  const buyers = allUserRows.filter((client) => Number(client.total_pedidos || 0) > 0);

  addLuxurySummarySheet(workbook, {
    title: 'Base de Clientes y CRM',
    subtitle: 'Documento ejecutivo con presentacion alineada a la identidad visual de la plataforma.',
    summaryCards: [
      { label: 'Usuarios totales', value: allUserRows.length },
      { label: 'Clientes activos', value: customerRows.length },
      { label: 'Clientes VIP', value: vipRows.length },
      { label: 'Administradores', value: adminRows.length },
      { label: 'Usuarios con compras', value: buyers.length },
      { label: 'Perfiles con foto', value: allUserRows.filter((row) => row.foto_registrada === 'si').length }
    ],
    note: 'La exportacion conserva lectura operativa y una presentación premium para compartir, auditar o archivar información del CRM.',
    sheetName: 'Luxury_Resumen'
  });

  const commonColumns = [
    { key: 'usuario_id', header: 'usuario_id', width: 10, type: 'number' },
    { key: 'nombre', header: 'nombre', width: 24 },
    { key: 'email', header: 'email', width: 30 },
    { key: 'telefono', header: 'telefono', width: 18 },
    { key: 'direccion', header: 'direccion', width: 34 },
    { key: 'rol', header: 'rol', width: 14 },
    { key: 'total_pedidos', header: 'total_pedidos', width: 14, type: 'number' },
    { key: 'foto_registrada', header: 'foto_registrada', width: 16 },
    { key: 'fecha_registro', header: 'fecha_registro', width: 22 },
    { key: 'fecha_registro_iso', header: 'fecha_registro_iso', width: 24 }
  ];

  addLuxuryDataSheet(workbook, {
    name: 'DB_Clientes',
    title: 'Clientes Comerciales',
    subtitle: 'Base de clientes no administrativos lista para analisis y seguimiento.',
    rows: customerRows,
    columns: commonColumns
  });

  addLuxuryDataSheet(workbook, {
    name: 'DB_Admin',
    title: 'Usuarios Administrativos',
    subtitle: 'Perfiles internos con acceso de administración en la plataforma.',
    rows: adminRows,
    columns: commonColumns
  });

  addLuxuryDataSheet(workbook, {
    name: 'DB_Todos_Usuarios',
    title: 'Universo Completo de Usuarios',
    subtitle: 'Vista global consolidada de clientes y administradores.',
    rows: allUserRows,
    columns: commonColumns
  });

  await finalizeWorkbook(workbook, 'base-datos-clientes-completa.xlsx');
}
