const crypto = require('crypto');

const CHECKOUT_BASE_URL = 'https://checkout.wompi.co/p/';
const DEFAULT_CURRENCY = process.env.WOMPI_CURRENCY || 'COP';

function getEnvironment() {
  const raw = String(process.env.WOMPI_ENVIRONMENT || 'sandbox').trim().toLowerCase();
  return raw === 'production' ? 'production' : 'sandbox';
}

function getApiBaseUrl() {
  return getEnvironment() === 'production'
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1';
}

function getPublicKey() {
  return process.env.WOMPI_PUBLIC_KEY || '';
}

function getPrivateKey() {
  return process.env.WOMPI_PRIVATE_KEY || '';
}

function getIntegritySecret() {
  return process.env.WOMPI_INTEGRITY_SECRET || '';
}

function getEventsSecret() {
  return process.env.WOMPI_EVENTS_SECRET || '';
}

function isConfigured() {
  return Boolean(getPublicKey() && getIntegritySecret());
}

function assertCheckoutConfig() {
  if (!getPublicKey() || !getIntegritySecret()) {
    throw new Error('La configuracion de Wompi esta incompleta. Verifica WOMPI_PUBLIC_KEY y WOMPI_INTEGRITY_SECRET.');
  }
}

function assertApiConfig() {
  if (!getPrivateKey()) {
    throw new Error('La configuracion de Wompi esta incompleta. Verifica WOMPI_PRIVATE_KEY.');
  }
}

function amountToCents(value) {
  return Math.round(Number(value || 0) * 100);
}

function buildReference(orderId) {
  const randomPart = crypto.randomBytes(4).toString('hex');
  return `LJ_${orderId}_${Date.now()}_${randomPart}`;
}

function buildIntegritySignature({ reference, amountInCents, currency = DEFAULT_CURRENCY, expirationTime }) {
  assertCheckoutConfig();
  const base = `${reference}${amountInCents}${currency}${expirationTime || ''}${getIntegritySecret()}`;
  return crypto.createHash('sha256').update(base).digest('hex');
}

function buildCheckoutUrl(params) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (typeof value === 'undefined' || value === null || value === '') return;
    search.append(key, String(value));
  });
  return `${CHECKOUT_BASE_URL}?${search.toString()}`;
}

async function fetchTransactionById(transactionId) {
  assertApiConfig();
  const response = await fetch(`${getApiBaseUrl()}/transactions/${encodeURIComponent(transactionId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${getPrivateKey()}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wompi no permitio consultar la transaccion (${response.status}): ${errorText}`);
  }

  const payload = await response.json();
  return payload?.data || null;
}

function getNestedValue(source, path) {
  return String(path || '')
    .split('.')
    .reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), source);
}

function validateEventChecksum(eventBody, checksumHeader) {
  const checksum = checksumHeader || eventBody?.signature?.checksum;
  const properties = eventBody?.signature?.properties;
  const timestamp = eventBody?.timestamp;
  const eventsSecret = getEventsSecret();

  if (!checksum || !Array.isArray(properties) || !timestamp || !eventsSecret) {
    return false;
  }

  const propertiesConcat = properties
    .map((propertyPath) => getNestedValue(eventBody.data, propertyPath))
    .map((value) => (typeof value === 'undefined' || value === null ? '' : String(value)))
    .join('');

  const payload = `${propertiesConcat}${timestamp}${eventsSecret}`;
  const calculated = crypto.createHash('sha256').update(payload).digest('hex').toUpperCase();
  return calculated === String(checksum).toUpperCase();
}

function mapTransactionStatusToPaymentStatus(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'APPROVED') return 'aprobado';
  if (normalized === 'DECLINED' || normalized === 'VOIDED' || normalized === 'REJECTED') return 'rechazado';
  if (normalized === 'ERROR' || normalized === 'FAILED') return 'error';
  if (normalized === 'PENDING' || normalized === 'PROCESSING') return 'pendiente_confirmacion';
  return 'pendiente';
}

module.exports = {
  amountToCents,
  buildCheckoutUrl,
  buildIntegritySignature,
  buildReference,
  fetchTransactionById,
  getEnvironment,
  getEventsSecret,
  getPublicKey,
  isConfigured,
  mapTransactionStatusToPaymentStatus,
  validateEventChecksum
};
