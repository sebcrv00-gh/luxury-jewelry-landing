import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const BRAND_NAME = 'LUXURY JEWELRY';
const BRAND_TAGLINE = 'Enterprise Commerce Invoice';

const formatCurrency = (value) => `$${Number(value || 0).toLocaleString('es-CO')}`;

const formatDate = (value) => {
  const safeDate = value ? new Date(value) : new Date();
  if (Number.isNaN(safeDate.getTime())) return new Date().toLocaleDateString('es-CO');
  return safeDate.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const buildInvoiceFilename = (orderId) => {
  const formatted = String(orderId || '00000').padStart(5, '0');
  return `factura-lj-${formatted}.pdf`;
};

const capitalize = (value) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const normalizeItems = (order) => {
  return (order.items || []).map((item) => {
    const quantity = Number(item.cantidad || 0);
    const unitPrice = Number(item.producto_precio ?? item.precio ?? 0);
    const subtotal = Number(item.subtotal ?? quantity * unitPrice);
    const name = item.producto_nombre || item.nombre || 'Pieza Luxury Jewelry';
    const color = item.color ? ` (${item.color})` : '';

    return {
      name: `${name}${color}`,
      quantity,
      unitPrice,
      subtotal
    };
  });
};

const drawInfoBlock = (doc, options) => {
  const { x, y, width, title, rows } = options;
  doc.setDrawColor(224, 208, 170);
  doc.setFillColor(247, 244, 236);
  doc.roundedRect(x, y, width, 92, 12, 12, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(156, 121, 39);
  doc.text(title, x + 14, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(52, 52, 52);

  rows.forEach((row, index) => {
    doc.text(row, x + 14, y + 38 + index * 16);
  });
};

const drawHeaderMeta = (doc, options) => {
  const { x, y, width, rows } = options;

  doc.setDrawColor(201, 168, 76);
  doc.setFillColor(17, 17, 17);
  doc.roundedRect(x, y, width, 82, 12, 12, 'FD');

  rows.forEach((row, index) => {
    const rowY = y + 18 + index * 24;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(201, 168, 76);
    doc.text(row.label, x + 14, rowY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(255, 248, 235);
    doc.text(doc.splitTextToSize(row.value, width - 28), x + 14, rowY + 13);
  });
};

export const downloadInvoicePdf = ({
  order,
  customerName,
  customerEmail,
  paymentLabel,
  generatedBy = 'Sistema'
}) => {
  if (!order) return;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  const headerWidth = pageWidth - margin * 2;
  const items = normalizeItems(order);
  const orderId = order.orderId || order.id;
  const shippingCost = Number(order.costo_envio || 15000);
  const total = Number(order.total || 0);
  const subtotal = Math.max(0, total - shippingCost);
  const status = (order.estado || 'pendiente').toString();
  const payment = paymentLabel || order.metodo_pago || 'Pago coordinado';

  doc.setFillColor(12, 12, 12);
  doc.setDrawColor(201, 168, 76);
  doc.roundedRect(margin, 34, headerWidth, 118, 18, 18, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(201, 168, 76);
  doc.text(BRAND_NAME, margin + 22, 66);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(214, 214, 214);
  doc.text(BRAND_TAGLINE, margin + 22, 82);

  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 248, 235);
  doc.text('Factura comercial', margin + 22, 116);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Documento generado para control de compra, despacho y respaldo interno.', margin + 22, 136);

  drawHeaderMeta(doc, {
    x: pageWidth - margin - 170,
    y: 50,
    width: 148,
    rows: [
      { label: 'Factura', value: `#${String(orderId || '').padStart(5, '0')}` },
      { label: 'Fecha', value: formatDate(order.creado_en || order.createdAt) },
      { label: 'Estado', value: capitalize(status) }
    ]
  });

  drawInfoBlock(doc, {
    x: margin,
    y: 176,
    width: 248,
    title: 'Cliente',
    rows: [
      customerName || order.usuario_nombre || order.nombre_envio || 'Cliente Luxury Jewelry',
      customerEmail || order.usuario_email || 'Sin correo registrado',
      `Telefono: ${order.telefono_envio || 'No disponible'}`
    ]
  });

  drawInfoBlock(doc, {
    x: margin + 266,
    y: 176,
    width: headerWidth - 266,
    title: 'Entrega y pago',
    rows: [
      `Direccion: ${order.direccion_envio || 'No registrada'}`,
      `Ciudad: ${order.ciudad_envio || 'No registrada'}`,
      `Metodo: ${payment}`
    ]
  });

  autoTable(doc, {
    startY: 288,
    margin: { left: margin, right: margin },
    head: [['Pieza', 'Cantidad', 'Valor unitario', 'Subtotal']],
    body: items.length > 0
      ? items.map((item) => [
          item.name,
          String(item.quantity),
          formatCurrency(item.unitPrice),
          formatCurrency(item.subtotal)
        ])
      : [['Pedido registrado', '1', formatCurrency(subtotal), formatCurrency(subtotal)]],
    theme: 'grid',
    headStyles: {
      fillColor: [22, 22, 22],
      textColor: [201, 168, 76],
      lineColor: [201, 168, 76],
      lineWidth: 0.6,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [44, 44, 44],
      lineColor: [230, 223, 204],
      lineWidth: 0.5
    },
    columnStyles: {
      1: { halign: 'center', cellWidth: 70 },
      2: { halign: 'right', cellWidth: 110 },
      3: { halign: 'right', cellWidth: 110 }
    },
    styles: {
      fontSize: 10,
      cellPadding: 10
    }
  });

  const finalY = doc.lastAutoTable?.finalY || 288;
  const totalsTop = finalY + 22;
  const totalsX = pageWidth - margin - 210;

  doc.setFillColor(12, 12, 12);
  doc.setDrawColor(201, 168, 76);
  doc.roundedRect(totalsX, totalsTop, 210, 96, 14, 14, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(214, 214, 214);
  doc.text('Subtotal', totalsX + 18, totalsTop + 24);
  doc.text('Envio', totalsX + 18, totalsTop + 44);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 248, 235);
  doc.text(formatCurrency(subtotal), totalsX + 190, totalsTop + 24, { align: 'right' });
  doc.text(formatCurrency(shippingCost), totalsX + 190, totalsTop + 44, { align: 'right' });

  doc.setDrawColor(201, 168, 76);
  doc.line(totalsX + 18, totalsTop + 58, totalsX + 190, totalsTop + 58);

  doc.setTextColor(201, 168, 76);
  doc.setFontSize(11);
  doc.text('Total final', totalsX + 18, totalsTop + 80);
  doc.setFontSize(16);
  doc.text(formatCurrency(total), totalsX + 190, totalsTop + 80, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 110);
  doc.text(`Generado por: ${generatedBy}`, margin, totalsTop + 116);
  doc.text('Luxury Jewelry - Documento de respaldo comercial', margin, totalsTop + 132);

  if (order.notas) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(156, 121, 39);
    doc.text('Notas del pedido', margin, totalsTop + 166);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(70, 70, 70);
    doc.text(doc.splitTextToSize(order.notas, pageWidth - margin * 2), margin, totalsTop + 184);
  }

  doc.save(buildInvoiceFilename(orderId));
};
