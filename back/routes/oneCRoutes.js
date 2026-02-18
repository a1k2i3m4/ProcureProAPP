const express = require('express');
const pool = require('../db');

const router = express.Router();

function unauthorized(res) {
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

function oneCAuth(req, res, next) {
  const apiKey = process.env.ONEC_API_KEY;

  // If key isn't configured, keep integration route closed by default.
  if (!apiKey) {
    console.warn('[1C] ONEC_API_KEY is not set; integration endpoints are disabled');
    return unauthorized(res);
  }

  const header = String(req.headers['authorization'] || '').trim();
  const xApiKey = String(req.headers['x-api-key'] || '').trim();

  const bearer = header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : null;

  if (xApiKey === apiKey || bearer === apiKey) {
    return next();
  }

  return unauthorized(res);
}

function normalizeFast(value) {
  const v = String(value || '').toLowerCase().trim();
  if (['1', 'true', 'yes', 'y', 'да'].includes(v)) return 'yes';
  return 'no';
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return null;

  const normalized = [];
  for (const it of items) {
    if (!it || typeof it !== 'object') return null;

    const tovar = String(it.tovar ?? it.name ?? '').trim();
    if (!tovar) return null;

    const specificRaw = it.specific ?? it.spec ?? it.description ?? '';
    const specific = specificRaw === null || specificRaw === undefined ? '' : String(specificRaw).trim();

    const qtyRaw = it.qty ?? it.quantity ?? it.count;
    const qty = Number(qtyRaw);
    if (!Number.isFinite(qty) || qty <= 0) return null;

    normalized.push({ tovar, specific, qty });
  }

  return normalized;
}

// POST /api/integrations/1c/orders
// Body example:
// {"order_id":"000000014","fast":"yes","items":[{"tovar":"Paper A4","specific":"80gsm","qty":10}]}
router.post('/integrations/1c/orders', oneCAuth, async (req, res) => {
  const startedAt = Date.now();
  const payload = req.body || {};

  const orderId = String(payload.order_id || payload.orderId || '').trim();
  if (!orderId) {
    return res.status(400).json({ ok: false, error: 'VALIDATION_ERROR', details: ['order_id is required'] });
  }

  const items = normalizeItems(payload.items);
  if (!items) {
    return res.status(400).json({ ok: false, error: 'VALIDATION_ERROR', details: ['items must be a non-empty array of {tovar,specific,qty}'] });
  }

  const fast = normalizeFast(payload.fast);
  const itemsCount = items.length;

  try {
    const existing = await pool.query('SELECT id FROM orders WHERE order_id = $1', [orderId]);
    const existed = existing.rows.length > 0;

    await pool.query(
      `INSERT INTO orders(order_id, fast, items, items_count, source_file, status, imported_at)
       VALUES ($1,$2,$3,$4,$5,'new',NOW())
       ON CONFLICT (order_id) DO UPDATE SET
         fast = EXCLUDED.fast,
         items = EXCLUDED.items,
         items_count = EXCLUDED.items_count,
         status = 'new',
         imported_at = NOW()`,
      [orderId, fast, JSON.stringify(items), itemsCount, '1c_api']
    );

    const ms = Date.now() - startedAt;
    console.log(`[1C] order ${orderId} upserted existed=${existed} items=${itemsCount} in ${ms}ms`);

    return res.status(existed ? 200 : 201).json({
      ok: true,
      order_id: orderId,
      updated: existed,
      received_at: new Date().toISOString()
    });
  } catch (e) {
    console.error('[1C] Failed to upsert order', orderId, e);
    return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR', message: String(e.message || e) });
  }
});

module.exports = router;

