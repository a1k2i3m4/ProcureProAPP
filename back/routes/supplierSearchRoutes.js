'use strict';

const express = require('express');
const pool    = require('../db');
const { searchAndSave } = require('../services/supplierSearchService');
const authMiddleware    = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * POST /api/supplier-search
 * Запускает поиск поставщиков в интернете по номенклатуре.
 *
 * Body:
 *   nomenclature  {string}  — обязательно, название товара
 *   specs         {string}  — необязательно, ГОСТ / спецификация
 *   region        {string}  — необязательно, регион
 *   maxResults    {number}  — необязательно, макс. кол-во (1-20, по умолч. 10)
 *
 * Response:
 *   { ok: true, count: N, suppliers: [...] }
 */
router.post('/supplier-search', authMiddleware, async (req, res) => {
  const { nomenclature, specs = '', region = null, maxResults = 10 } = req.body;

  if (!nomenclature || !String(nomenclature).trim()) {
    return res.status(400).json({ ok: false, message: 'nomenclature обязателен' });
  }

  const max = Math.min(Math.max(parseInt(maxResults) || 10, 1), 20);

  try {
    const suppliers = await searchAndSave(pool, String(nomenclature).trim(), {
      specs:      String(specs || '').trim(),
      region:     region ? String(region).trim() : null,
      maxResults: max,
    });

    res.json({ ok: true, count: suppliers.length, suppliers });
  } catch (e) {
    console.error('[POST /supplier-search] error:', e.message);
    res.status(500).json({ ok: false, message: 'Ошибка поиска поставщиков', detail: e.message });
  }
});

/**
 * GET /api/supplier-search?query=...&limit=20&offset=0
 * Возвращает кэшированные результаты из БД.
 */
router.get('/supplier-search', authMiddleware, async (req, res) => {
  const { query = '', limit = 20, offset = 0 } = req.query;

  try {
    const params = [];
    let sql = `
      SELECT id, query, company_name, website, description, found_via,
             emails, phones, telegrams, created_at
      FROM internet_suppliers
    `;

    if (query.trim()) {
      params.push(`%${query.trim()}%`);
      sql += ` WHERE query ILIKE $1 OR company_name ILIKE $1`;
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit) || 20, Number(offset) || 0);

    const result = await pool.query(sql, params);
    res.json({ ok: true, count: result.rows.length, suppliers: result.rows });
  } catch (e) {
    console.error('[GET /supplier-search] error:', e.message);
    res.status(500).json({ ok: false, message: 'Ошибка получения результатов', detail: e.message });
  }
});

/**
 * DELETE /api/supplier-search/:id
 * Удаляет запись из кэша.
 */
router.delete('/supplier-search/:id', authMiddleware, async (req, res) => {
  try {
    await pool.query('DELETE FROM internet_suppliers WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
});

module.exports = router;

