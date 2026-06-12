const Order = require('../models/Order');
const {
  amountToCents,
  buildCheckoutUrl,
  buildIntegritySignature,
  buildReference,
  fetchTransactionById,
  getEnvironment,
  getPublicKey,
  isConfigured,
  mapTransactionStatusToPaymentStatus,
  validateEventChecksum
} = require('../services/wompiService');
const { syncVipStatusByPurchases } = require('../services/vipAutomationService');

function getFrontendBaseUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function formatPaymentSnapshot(order, transaction = null) {
  return {
    orderId: order.id,
    metodo_pago: order.metodo_pago,
    estado_pago: order.estado_pago,
    wompi_reference: order.wompi_reference,
    wompi_transaction_id: order.wompi_transaction_id,
    wompi_status: order.wompi_status,
    total: order.total,
    transaction: transaction
      ? {
          id: transaction.id,
          status: transaction.status,
          status_message: transaction.status_message || null,
          payment_method_type: transaction.payment_method_type || null
        }
      : null
  };
}

function canAccessOrder(req, order) {
  return Boolean(
    req.session?.rol === 'admin' ||
    (req.session?.userId && Number(order.usuario_id) === Number(req.session.userId))
  );
}

async function syncOrderFromTransaction(order, transaction) {
  const nextPaymentStatus = mapTransactionStatusToPaymentStatus(transaction?.status);
  const updatedOrder = await Order.updatePaymentFields(order.id, {
    estado_pago: nextPaymentStatus,
    wompi_transaction_id: transaction?.id || order.wompi_transaction_id || null,
    wompi_status: transaction?.status || order.wompi_status || null,
    wompi_payload: JSON.stringify(transaction || {}),
    pago_actualizado_en: new Date()
  });
  await syncVipStatusByPurchases(updatedOrder?.usuario_id || order?.usuario_id);
  return updatedOrder;
}

const paymentController = {
  async createWompiCheckout(req, res) {
    try {
      if (!isConfigured()) {
        return res.status(500).json({ error: 'Wompi no esta configurado en el servidor.' });
      }

      const order = await Order.getByIdWithUser(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: 'Orden no encontrada.' });
      }

      if (!canAccessOrder(req, order)) {
        return res.status(403).json({ error: 'No puedes iniciar el pago de esta orden.' });
      }

      if (String(order.metodo_pago).toLowerCase() !== 'wompi') {
        return res.status(400).json({ error: 'Esta orden no fue creada para pago con Wompi.' });
      }

      const amountInCents = amountToCents(order.total);
      const reference = order.wompi_reference || buildReference(order.id);
      const redirectBase = process.env.WOMPI_REDIRECT_URL || `${getFrontendBaseUrl()}/checkout`;
      const redirectUrl = `${redirectBase}${redirectBase.includes('?') ? '&' : '?'}payment_return=wompi&order=${order.id}`;
      const signature = buildIntegritySignature({
        reference,
        amountInCents,
        currency: process.env.WOMPI_CURRENCY || 'COP'
      });

      const checkoutUrl = buildCheckoutUrl({
        'public-key': getPublicKey(),
        currency: process.env.WOMPI_CURRENCY || 'COP',
        'amount-in-cents': amountInCents,
        reference,
        'signature:integrity': signature,
        'redirect-url': redirectUrl,
        'customer-data:email': order.usuario_email,
        'customer-data:full-name': order.nombre_envio || order.usuario_nombre,
        'customer-data:phone-number': order.telefono_envio || order.usuario_telefono,
        'customer-data:phone-number-prefix': '+57',
        'shipping-address:address-line-1': order.direccion_envio,
        'shipping-address:country': 'CO',
        'shipping-address:city': order.ciudad_envio,
        'shipping-address:region': order.ciudad_envio,
        'shipping-address:phone-number': order.telefono_envio,
        'shipping-address:name': order.nombre_envio,
        'collect-shipping': 'false'
      });

      const updatedOrder = await Order.updatePaymentFields(order.id, {
        estado_pago: 'checkout_generado',
        wompi_reference: reference,
        wompi_checkout_url: checkoutUrl,
        pago_actualizado_en: new Date()
      });

      return res.json({
        ok: true,
        orderId: updatedOrder.id,
        environment: getEnvironment(),
        checkoutUrl,
        reference,
        amountInCents
      });
    } catch (err) {
      console.error('Error al generar checkout de Wompi:', err);
      return res.status(500).json({ error: err.message || 'No fue posible iniciar el pago con Wompi.' });
    }
  },

  async getWompiOrderStatus(req, res) {
    try {
      const order = await Order.getById(req.params.orderId);
      if (!order) {
        return res.status(404).json({ error: 'Orden no encontrada.' });
      }

      const transactionId = req.query.id || req.query.transactionId || order.wompi_transaction_id;
      const hasOrderAccess = canAccessOrder(req, order);

      if (!hasOrderAccess && !transactionId) {
        return res.status(403).json({ error: 'No tienes permisos para consultar esta orden.' });
      }

      let updatedOrder = order;
      let transaction = null;

      if (transactionId) {
        transaction = await fetchTransactionById(transactionId);

        if (!transaction) {
          return res.status(404).json({ error: 'Wompi no devolvio informacion de la transaccion.' });
        }

        if (order.wompi_reference && transaction.reference !== order.wompi_reference) {
          return res.status(400).json({ error: 'La transaccion no coincide con la referencia de la orden.' });
        }

        updatedOrder = await syncOrderFromTransaction(order, transaction);
      }

      return res.json({
        ok: true,
        payment: formatPaymentSnapshot(updatedOrder, transaction)
      });
    } catch (err) {
      console.error('Error al consultar estado de pago Wompi:', err);
      return res.status(500).json({ error: err.message || 'No fue posible consultar el estado del pago.' });
    }
  },

  async handleWompiWebhook(req, res) {
    try {
      const checksumHeader = req.get('X-Event-Checksum');
      if (!validateEventChecksum(req.body, checksumHeader)) {
        return res.status(400).json({ error: 'Checksum de Wompi invalido.' });
      }

      if (req.body?.event !== 'transaction.updated') {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const transaction = req.body?.data?.transaction;
      if (!transaction?.reference) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const order = await Order.getByWompiReference(transaction.reference);
      if (!order) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      await syncOrderFromTransaction(order, transaction);
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Error al procesar webhook de Wompi:', err);
      return res.status(500).json({ error: 'No fue posible procesar el evento de Wompi.' });
    }
  }
};

module.exports = paymentController;
