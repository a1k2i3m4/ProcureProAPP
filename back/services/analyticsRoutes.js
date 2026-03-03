const express = require('express');
const pool = require('../db');

const router = express.Router();

// GET /api/analyses - Получить все анализы с полной информацией
router.get('/analyses', async (req, res) => {
  try {
    const { status, order_id } = req.query;

    let query = `
      SELECT 
        oa.id,
        oa.order_id,
        oa.status,
        oa.started_at,
        oa.completed_at,
        oa.timeout_at,
        oa.timeout_minutes,
        oa.suppliers_contacted,
        oa.responses_received,
        o.fast,
        o.items_count
      FROM order_analysis oa
      LEFT JOIN orders o ON o.order_id = oa.order_id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      query += ` AND oa.status = $${paramCount}`;
      params.push(status);
    }

    if (order_id) {
      paramCount++;
      query += ` AND oa.order_id = $${paramCount}`;
      params.push(order_id);
    }

    query += ` ORDER BY oa.started_at DESC`;

    const result = await pool.query(query, params);

    const analysesWithTimeInfo = result.rows.map(analysis => {
      if (analysis.status === 'in_progress' && analysis.timeout_at) {
        const now = new Date();
        const timeoutAt = new Date(analysis.timeout_at);
        const timeRemaining = Math.max(0, timeoutAt.getTime() - now.getTime());

        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);

        analysis.time_remaining_ms = timeRemaining;
        analysis.time_remaining_formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

        const totalTime = analysis.timeout_minutes * 60 * 1000;
        const elapsedTime = totalTime - timeRemaining;
        analysis.progress_percent = Math.min(100, Math.max(0, Math.round((elapsedTime / totalTime) * 100)));
      } else {
        analysis.progress_percent = analysis.status === 'completed' ? 100 : 0;
      }

      return analysis;
    });

    res.json(analysesWithTimeInfo);
  } catch (error) {
    console.error('Error fetching analyses:', error);
    res.status(500).json({
      message: 'Ошибка получения аналитики',
      error: error.message
    });
  }
});

// GET /api/analyses/:id - Получить конкретный анализ с деталями
router.get('/analyses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const analysisQuery = `
      SELECT 
        oa.*,
        o.fast,
        o.items,
        o.items_count
      FROM order_analysis oa
      LEFT JOIN orders o ON o.order_id = oa.order_id
      WHERE oa.id = $1
    `;

    const analysisResult = await pool.query(analysisQuery, [id]);

    if (analysisResult.rows.length === 0) {
      return res.status(404).json({ message: 'Анализ не найден' });
    }

    const analysis = analysisResult.rows[0];

    const errorsQuery = `
      SELECT 
        ae.*,
        s.name as supplier_name
      FROM analysis_errors ae
      LEFT JOIN suppliers s ON s.id = ae.supplier_id
      WHERE ae.order_id = $1
      ORDER BY ae.created_at DESC
    `;

    const errorsResult = await pool.query(errorsQuery, [analysis.order_id]);

    let responses = [];
    try {
      const responsesQuery = `
        SELECT 
          sr.*,
          s.name as supplier_name
        FROM supplier_responses sr
        LEFT JOIN suppliers s ON s.id = sr.supplier_id
        WHERE sr.order_id = $1
        ORDER BY sr.response_time DESC
      `;

      const responsesResult = await pool.query(responsesQuery, [analysis.order_id]);
      responses = responsesResult.rows;
    } catch (err) {
      console.log('Supplier responses table not found:', err.message);
    }

    // Кому было отправлено уведомление
    let notifications = [];
    try {
      const notifResult = await pool.query(
        `SELECT sn.*, s.name as supplier_name, s.rating, s.can_urgent, c.name as category_name
         FROM supplier_notifications sn
         LEFT JOIN suppliers s ON s.id = sn.supplier_id
         LEFT JOIN categories c ON c.id = s.category_id
         WHERE sn.order_id = $1
         ORDER BY sn.sent_at ASC`,
        [analysis.order_id]
      );
      notifications = notifResult.rows;
    } catch (err) {
      console.log('supplier_notifications table not found:', err.message);
    }

    if (analysis.status === 'in_progress' && analysis.timeout_at) {
      const now = new Date();
      const timeoutAt = new Date(analysis.timeout_at);
      const timeRemaining = Math.max(0, timeoutAt.getTime() - now.getTime());

      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);

      analysis.time_remaining_ms = timeRemaining;
      analysis.time_remaining_formatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      const totalTime = analysis.timeout_minutes * 60 * 1000;
      const elapsedTime = totalTime - timeRemaining;
      analysis.progress_percent = Math.min(100, Math.max(0, Math.round((elapsedTime / totalTime) * 100)));
    } else {
      analysis.progress_percent = analysis.status === 'completed' ? 100 : 0;
    }

    res.json({
      analysis,
      errors: errorsResult.rows,
      responses,
      notifications
    });

  } catch (error) {
    console.error('Error fetching analysis details:', error);
    res.status(500).json({
      message: 'Ошибка получения деталей анализа',
      error: error.message
    });
  }
});

// GET /api/analytics/summary - Сводная статистика по анализам
router.get('/analytics/summary', async (req, res) => {
  try {
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_analyses,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_count,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
        AVG(suppliers_contacted) as avg_suppliers_contacted,
        AVG(responses_received) as avg_responses_received,
        AVG(CASE WHEN completed_at IS NOT NULL 
                 THEN EXTRACT(EPOCH FROM (completed_at - started_at))/60 
                 ELSE NULL END) as avg_duration_minutes
      FROM order_analysis
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    `;

    const summaryResult = await pool.query(summaryQuery);
    const summary = summaryResult.rows[0];

    // Конвертируем числа
    Object.keys(summary).forEach(key => {
      if (summary[key] !== null) {
        summary[key] = parseFloat(summary[key]);
      }
    });

    // Статистика по ошибкам
    const errorsQuery = `
      SELECT 
        error_type,
        COUNT(*) as count
      FROM analysis_errors
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY error_type
      ORDER BY count DESC
    `;

    const errorsResult = await pool.query(errorsQuery);

    res.json({
      summary,
      error_breakdown: errorsResult.rows
    });

  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({
      message: 'Ошибка получения сводки аналитики',
      error: error.message
    });
  }
});

// DELETE /api/analyses/:id - Удалить анализ
router.delete('/analyses/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM order_analysis WHERE id = $1 RETURNING order_id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Анализ не найден' });
    }

    res.json({
      message: 'Анализ удален',
      order_id: result.rows[0].order_id
    });

  } catch (error) {
    console.error('Error deleting analysis:', error);
    res.status(500).json({
      message: 'Ошибка удаления анализа',
      error: error.message
    });
  }
});

module.exports = router;
