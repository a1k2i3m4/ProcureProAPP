const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/categories
router.get('/categories', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id, name FROM categories ORDER BY name');
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения категорий', error: String(e.message || e) });
  }
});

// GET /api/suppliers?category=...&q=...
router.get('/suppliers', async (req, res) => {
  try {
    const { category, q } = req.query;

    const params = [];
    const where = [];

    if (category && String(category).trim()) {
      params.push(String(category).trim());
      // фильтр по имени категории
      where.push(`c.name = $${params.length}`);
    }

    if (q && String(q).trim()) {
      params.push(`%${String(q).trim()}%`);
      where.push(`s.name ILIKE $${params.length}`);
    }

    const sql = `
      SELECT s.id, s.name, s.contact_person, s.phone, c.name AS category
      FROM suppliers s
      LEFT JOIN categories c ON c.id = s.category_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY s.name
    `;

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения поставщиков', error: String(e.message || e) });
  }
});

// GET /api/debug/counts
router.get('/debug/counts', async (_req, res) => {
  try {
    const c1 = await pool.query('SELECT COUNT(*)::int AS count FROM categories');
    const c2 = await pool.query('SELECT COUNT(*)::int AS count FROM suppliers');
    res.json({ categories: c1.rows[0].count, suppliers: c2.rows[0].count });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка debug/counts', error: String(e.message || e) });
  }
});

module.exports = router;
