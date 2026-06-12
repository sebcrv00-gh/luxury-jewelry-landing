const { pool } = require('../config/db');

const DEFAULT_VIP_MIN_TOTAL = 500000;

function getVipMinimumTotal() {
  const raw = Number(process.env.VIP_AUTO_MIN_TOTAL || DEFAULT_VIP_MIN_TOTAL);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_VIP_MIN_TOTAL;
}

async function getUserPurchaseSnapshot(userId) {
  const [rows] = await pool.query(
    `SELECT
       u.id,
       u.rol,
       COALESCE(
         SUM(
           CASE
             WHEN o.metodo_pago = 'wompi' AND o.estado_pago = 'aprobado' THEN o.total
             WHEN o.metodo_pago = 'efectivo' AND o.estado_pago = 'aprobado' AND o.estado = 'entregado' THEN o.total
             ELSE 0
           END
         ),
         0
       ) AS qualifying_total
     FROM usuarios u
     LEFT JOIN ordenes o ON o.usuario_id = u.id
     WHERE u.id = ?
     GROUP BY u.id, u.rol
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

async function syncVipStatusByPurchases(userId) {
  if (!userId) {
    return { promoted: false, minimumTotal: getVipMinimumTotal(), qualifyingTotal: 0 };
  }

  const snapshot = await getUserPurchaseSnapshot(userId);
  const minimumTotal = getVipMinimumTotal();

  if (!snapshot) {
    return { promoted: false, minimumTotal, qualifyingTotal: 0 };
  }

  const qualifyingTotal = Number(snapshot.qualifying_total || 0);
  const currentRole = String(snapshot.rol || '').toLowerCase();

  if (currentRole === 'admin' || currentRole === 'vip' || qualifyingTotal < minimumTotal) {
    return {
      promoted: false,
      minimumTotal,
      qualifyingTotal,
      currentRole
    };
  }

  await pool.query('UPDATE usuarios SET rol = ? WHERE id = ?', ['vip', userId]);

  return {
    promoted: true,
    minimumTotal,
    qualifyingTotal,
    currentRole
  };
}

module.exports = {
  DEFAULT_VIP_MIN_TOTAL,
  getVipMinimumTotal,
  syncVipStatusByPurchases
};
