const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/orders
router.get('/orders', async (_req, res) => {
  try {
    const q = await pool.query(`SELECT order_id, fast, items_count, source_file, status, created_at, imported_at FROM orders ORDER BY imported_at DESC`);
    res.json(q.rows);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения заказов', error: String(e.message || e) });
  }
});

// GET /api/orders/:id
router.get('/orders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const q = await pool.query(`SELECT order_id, fast, items, items_count, source_file, status, created_at, imported_at FROM orders WHERE order_id = $1`, [id]);
    if (!q.rows.length) return res.status(404).json({ message: 'Заказ не найден' });
    res.json(q.rows[0]);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения заказа', error: String(e.message || e) });
  }
});

// GET /api/orders/today
router.get('/orders/today', async (_req, res) => {
  try {
    const q = await pool.query(`SELECT order_id, fast, items_count, source_file, status, created_at, imported_at FROM orders WHERE DATE(imported_at) = CURRENT_DATE ORDER BY imported_at DESC`);
    res.json(q.rows);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения заказов за сегодня', error: String(e.message || e) });
  }
});

// GET /api/stats
router.get('/stats', async (_req, res) => {
  try {
    const totalOrdersQ = await pool.query(`SELECT COUNT(*)::int AS total_orders FROM orders`);
    const totalItemsQ = await pool.query(`SELECT COALESCE(SUM(items_count),0)::int AS total_items FROM orders`);
    res.json({ total_orders: totalOrdersQ.rows[0].total_orders, total_items: totalItemsQ.rows[0].total_items });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения статистики', error: String(e.message || e) });
  }
});

module.exports = router;
