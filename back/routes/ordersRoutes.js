const express = require('express');
const pool = require('../db');
const orderAnalyzer = require('../services/orderAnalyzer');
const rankingService = require('../services/rankingService');
const whatsappService = require('../services/whatsappService');

const router = express.Router();

// GET /api/orders/next-manual-id — следующий номер ручного заказа
router.get('/orders/next-manual-id', async (_req, res) => {
  try {
    const q = await pool.query(
      `SELECT order_id FROM orders WHERE source_file = 'manual' ORDER BY imported_at DESC`
    );
    let nextNum = 1;
    if (q.rows.length > 0) {
      const nums = q.rows
        .map(r => parseInt((r.order_id || '').replace(/^manual-/i, ''), 10))
        .filter(n => !isNaN(n));
      if (nums.length > 0) nextNum = Math.max(...nums) + 1;
    }
    const nextId = `manual-${String(nextNum).padStart(3, '0')}`;
    res.json({ next_id: nextId });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка', error: String(e.message || e) });
  }
});

// POST /api/orders — ручное создание заказа с фронтенда
router.post('/orders', async (req, res) => {
  try {
    const { order_id, fast, items } = req.body;

    if (!order_id || !String(order_id).trim()) {
      return res.status(400).json({ message: 'order_id обязателен' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'items обязателен и должен быть непустым массивом' });
    }

    const orderId = String(order_id).trim();
    const fastVal = fast === 'yes' ? 'yes' : 'no';
    const normalizedItems = items.map(it => ({
      tovar:    String(it.tovar || '').trim(),
      specific: String(it.specific || '').trim(),
      qty:      Number(it.qty) || 1,
    })).filter(it => it.tovar);

    if (normalizedItems.length === 0) {
      return res.status(400).json({ message: 'Нет валидных товаров в items' });
    }

    const existing = await pool.query('SELECT id FROM orders WHERE order_id = $1', [orderId]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: `Заказ ${orderId} уже существует` });
    }

    await pool.query(
      `INSERT INTO orders(order_id, fast, items, items_count, source_file, status, created_at, imported_at)
       VALUES($1,$2,$3,$4,'manual','new',NOW(),NOW())`,
      [orderId, fastVal, JSON.stringify(normalizedItems), normalizedItems.length]
    );

    console.log(`[MANUAL] Order ${orderId} created: ${normalizedItems.length} items, fast=${fastVal}`);
    res.status(201).json({ ok: true, order_id: orderId, items_count: normalizedItems.length });
  } catch (e) {
    console.error('[POST /orders] error:', e);
    res.status(500).json({ message: 'Ошибка создания заказа', error: String(e.message || e) });
  }
});

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

// POST /api/orders/:id/analyze - Start analysis for an order
router.post('/orders/:id/analyze', async (req, res) => {
  try {
    console.log(`📊 Starting analysis for order: ${req.params.id}`);
    const { id } = req.params;

    // Check if order exists first
    const orderCheck = await pool.query(
      'SELECT order_id, fast, items_count FROM orders WHERE order_id = $1',
      [id]
    );

    if (orderCheck.rows.length === 0) {
      console.log(`❌ Order ${id} not found`);
      return res.status(404).json({
        message: 'Заказ не найден',
        error: 'Order not found'
      });
    }

    console.log(`✅ Order found: ${id}, fast: ${orderCheck.rows[0].fast}, items: ${orderCheck.rows[0].items_count}`);

    const result = await orderAnalyzer.startAnalysis(pool, id);
    console.log(`✅ Analysis started successfully for order ${id}`);
    res.json(result);
  } catch (e) {
    console.error(`❌ Error starting analysis for order ${req.params.id}:`, e);
    const statusCode = e.message.includes('already exists') ? 409 : 500;
    res.status(statusCode).json({
      message: 'Ошибка запуска анализа',
      error: String(e.message || e)
    });
  }
});

// GET /api/orders/:id/analysis-status - Get analysis status
router.get('/orders/:id/analysis-status', async (req, res) => {
  try {
    const { id } = req.params;
    const status = await orderAnalyzer.getAnalysisStatus(pool, id);

    if (!status) {
      return res.status(404).json({ message: 'Анализ не найден' });
    }

    res.json(status);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения статуса анализа', error: String(e.message || e) });
  }
});

// POST /api/orders/:id/complete-analysis - Manually complete analysis
router.post('/orders/:id/complete-analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await orderAnalyzer.completeAnalysisManually(pool, id);

    if (!success) {
      return res.status(404).json({ message: 'Активный анализ не найден' });
    }

    res.json({ success: true, message: 'Анализ завершен досрочно' });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка завершения анализа', error: String(e.message || e) });
  }
});

// POST /api/orders/:id/restart-analysis - Restart analysis for an order
router.post('/orders/:id/restart-analysis', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await orderAnalyzer.restartAnalysis(pool, id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка повторного анализа', error: String(e.message || e) });
  }
});

// GET /api/orders/:id/responses - Get all supplier responses
router.get('/orders/:id/responses', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
         sr.id,
         sr.order_id,
         sr.supplier_id,
         sr.item_name,
         sr.price,
         sr.quantity_available,
         sr.delivery_days,
         sr.response_time,
         sr.raw_message,
         s.name as supplier_name,
         s.rating,
         s.can_urgent,
         s.whatsapp,
         c.name as category_name
       FROM supplier_responses sr
       JOIN suppliers s ON s.id = sr.supplier_id
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE sr.order_id = $1
       ORDER BY sr.response_time DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения ответов', error: String(e.message || e) });
  }
});

// GET /api/orders/:id/best-offers - Get best ranked offers
router.get('/orders/:id/best-offers', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const offers = await rankingService.getBestOffers(pool, id, limit);
    res.json(offers);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения лучших предложений', error: String(e.message || e) });
  }
});

// GET /api/orders/:id/optimal-combination - Get optimal supplier combination
router.get('/orders/:id/optimal-combination', async (req, res) => {
  try {
    const { id } = req.params;

    const combination = await rankingService.getOptimalCombination(pool, id);
    res.json(combination);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения оптимальной комбинации', error: String(e.message || e) });
  }
});

// GET /api/orders/:id/errors - Get analysis errors for order
router.get('/orders/:id/errors', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
         ae.id,
         ae.order_id,
         ae.supplier_id,
         ae.error_type,
         ae.error_message,
         ae.created_at,
         s.name as supplier_name
       FROM analysis_errors ae
       LEFT JOIN suppliers s ON s.id = ae.supplier_id
       WHERE ae.order_id = $1
       ORDER BY ae.created_at DESC`,
      [id]
    );

    res.json(result.rows);
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения ошибок анализа', error: String(e.message || e) });
  }
});

// GET /api/debug/test-suppliers - Debug endpoint to check suppliers with WhatsApp
router.get('/debug/test-suppliers', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         s.id,
         s.name,
         s.whatsapp,
         s.rating,
         s.can_urgent,
         c.name as category
       FROM suppliers s
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.whatsapp IS NOT NULL AND s.whatsapp != ''
       ORDER BY s.rating DESC
       LIMIT 20`
    );

    res.json({
      count: result.rows.length,
      suppliers: result.rows
    });
  } catch (e) {
    res.status(500).json({ message: 'Error fetching suppliers', error: String(e.message || e) });
  }
});

// POST /api/debug/whatsapp/send - Send test WhatsApp message to a number
router.post('/debug/whatsapp/send', async (req, res) => {
  try {
    const { to, mode, templateName, languageCode, text, supplierId } = req.body || {};
    const target = to || process.env.WHATSAPP_TEST_NUMBER;

    if (!target) {
      return res.status(400).json({ ok: false, message: 'Missing "to" and WHATSAPP_TEST_NUMBER is not set' });
    }

    let result;
    if (String(mode || '').toLowerCase() === 'template') {
      result = await whatsappService.sendTemplateMessage(target, {
        templateName: templateName || 'hello_world',
        languageCode: languageCode || 'en_US'
      });
    } else {
      // send a plain text message (default)
      const orderLike = {
        order_id: 'TEST',
        fast: 'no',
        items: [{ tovar: text || 'Проверка отправки WhatsApp из ProcurePro', qty: 1, specific: '' }]
      };
      result = await whatsappService.sendOrderToSupplier(target, orderLike, supplierId || 1);
    }

    res.json({ ok: true, target, result });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// GET /api/analytics - Get all order analyses with details
router.get('/analytics', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status; // 'in_progress', 'completed', 'timeout', 'cancelled'

    let query = `
      SELECT 
        oa.id as analysis_id,
        oa.order_id,
        oa.status as analysis_status,
        oa.started_at,
        oa.completed_at,
        oa.timeout_at,
        oa.timeout_minutes,
        oa.suppliers_contacted,
        oa.responses_received,
        o.fast,
        o.items_count,
        o.source_file,
        o.status as order_status,
        o.imported_at,
        EXTRACT(EPOCH FROM (COALESCE(oa.completed_at, NOW()) - oa.started_at)) as duration_seconds,
        CASE 
          WHEN oa.completed_at IS NOT NULL THEN 100
          WHEN NOW() >= oa.timeout_at THEN 100
          ELSE ROUND((EXTRACT(EPOCH FROM (NOW() - oa.started_at)) / (oa.timeout_minutes * 60)) * 100)
        END as progress_percentage,
        CASE 
          WHEN oa.completed_at IS NOT NULL THEN 0
          WHEN NOW() >= oa.timeout_at THEN 0
          ELSE EXTRACT(EPOCH FROM (oa.timeout_at - NOW()))
        END as time_remaining_seconds
      FROM order_analysis oa
      JOIN orders o ON o.order_id = oa.order_id
    `;

    const params = [];
    if (status) {
      query += ' WHERE oa.status = $1';
      params.push(status);
    }

    query += ' ORDER BY oa.started_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*)::int as total FROM order_analysis';
    const countParams = [];
    if (status) {
      countQuery += ' WHERE status = $1';
      countParams.push(status);
    }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      analyses: result.rows,
      total: countResult.rows[0].total,
      limit,
      offset
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения аналитики', error: String(e.message || e) });
  }
});

// GET /api/analytics/:id - Get detailed analysis by ID
router.get('/analytics/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get analysis overview
    const analysisResult = await pool.query(`
      SELECT 
        oa.id as analysis_id,
        oa.order_id,
        oa.status as analysis_status,
        oa.started_at,
        oa.completed_at,
        oa.timeout_at,
        oa.timeout_minutes,
        oa.suppliers_contacted,
        oa.responses_received,
        o.fast,
        o.items,
        o.items_count,
        o.source_file,
        o.status as order_status,
        o.imported_at,
        EXTRACT(EPOCH FROM (COALESCE(oa.completed_at, NOW()) - oa.started_at)) as duration_seconds
      FROM order_analysis oa
      JOIN orders o ON o.order_id = oa.order_id
      WHERE oa.id = $1
    `, [id]);

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ message: 'Анализ не найден' });
    }

    const analysis = analysisResult.rows[0];

    // Get responses
    const responsesResult = await pool.query(`
      SELECT 
        sr.id,
        sr.supplier_id,
        sr.item_name,
        sr.price,
        sr.quantity_available,
        sr.delivery_days,
        sr.response_time,
        s.name as supplier_name,
        s.rating,
        s.can_urgent
      FROM supplier_responses sr
      JOIN suppliers s ON s.id = sr.supplier_id
      WHERE sr.order_id = $1
      ORDER BY sr.response_time DESC
    `, [analysis.order_id]);

    // Get errors
    const errorsResult = await pool.query(`
      SELECT 
        ae.id,
        ae.supplier_id,
        ae.error_type,
        ae.error_message,
        ae.created_at,
        s.name as supplier_name
      FROM analysis_errors ae
      LEFT JOIN suppliers s ON s.id = ae.supplier_id
      WHERE ae.order_id = $1
      ORDER BY ae.created_at DESC
    `, [analysis.order_id]);

    res.json({
      ...analysis,
      responses: responsesResult.rows,
      errors: errorsResult.rows
    });
  } catch (e) {
    res.status(500).json({ message: 'Ошибка получения деталей анализа', error: String(e.message || e) });
  }
});

module.exports = router;
