const express = require('express');
const pool = require('../db');

const router = express.Router();

/**
 * GET /api/supplier-form/:orderId/:supplierId
 * Get order data for supplier form
 */
router.get('/supplier-form/:orderId/:supplierId', async (req, res) => {
  try {
    const { orderId, supplierId } = req.params;

    // Get order details
    const orderResult = await pool.query(
      `SELECT order_id, fast, items, items_count, status FROM orders WHERE order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден'
      });
    }

    // Get supplier details
    const supplierResult = await pool.query(
      `SELECT id, name, phone, whatsapp FROM suppliers WHERE id = $1`,
      [supplierId]
    );

    if (supplierResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден'
      });
    }

    // Get analysis status
    const analysisResult = await pool.query(
      `SELECT status, started_at, timeout_at FROM order_analysis WHERE order_id = $1`,
      [orderId]
    );

    const analysisStatus = analysisResult.rows.length > 0
      ? analysisResult.rows[0].status
      : 'no_analysis';

    // Check if supplier already responded
    const existingResponse = await pool.query(
      `SELECT id, item_name, price, quantity_available, delivery_days, response_time 
       FROM supplier_responses 
       WHERE order_id = $1 AND supplier_id = $2`,
      [orderId, supplierId]
    );

    const order = orderResult.rows[0];
    const supplier = supplierResult.rows[0];

    res.json({
      success: true,
      order: {
        order_id: order.order_id,
        fast: order.fast,
        items: order.items || [],
        items_count: order.items_count
      },
      supplier: {
        id: supplier.id,
        name: supplier.name
      },
      analysis: {
        status: analysisStatus,
        can_submit: analysisStatus === 'in_progress',
        message: analysisStatus !== 'in_progress'
          ? 'Анализ заказа уже завершён. Отправка ответа невозможна.'
          : null
      },
      existing_responses: existingResponse.rows
    });

  } catch (error) {
    console.error('Error fetching supplier form data:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка загрузки данных формы',
      error: error.message
    });
  }
});

/**
 * POST /api/supplier-form/:orderId/:supplierId
 * Submit supplier response
 */
router.post('/supplier-form/:orderId/:supplierId', async (req, res) => {
  const client = await pool.connect();

  try {
    const { orderId, supplierId } = req.params;
    const { contact_name, items, alternative_offer } = req.body;

    // Validate request body
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо указать хотя бы один товар'
      });
    }

    // Check if analysis is still in progress
    const analysisResult = await client.query(
      `SELECT id, status FROM order_analysis WHERE order_id = $1`,
      [orderId]
    );

    if (analysisResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Анализ для этого заказа не найден'
      });
    }

    if (analysisResult.rows[0].status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Анализ заказа уже завершён. Отправка ответа невозможна.'
      });
    }

    // Verify supplier exists
    const supplierCheck = await client.query(
      `SELECT id FROM suppliers WHERE id = $1`,
      [supplierId]
    );

    if (supplierCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Поставщик не найден'
      });
    }

    await client.query('BEGIN');

    // Insert/update responses for each item
    for (const item of items) {
      // Validate item data
      if (!item.item_name || item.price === undefined || item.quantity === undefined || item.delivery_days === undefined) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Неполные данные для товара: ${item.item_name || 'без названия'}`
        });
      }

      if (item.price <= 0 || item.quantity <= 0 || item.delivery_days < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: `Некорректные данные для товара: ${item.item_name}. Цена и количество должны быть > 0, срок >= 0`
        });
      }

      await client.query(
        `INSERT INTO supplier_responses (order_id, supplier_id, item_name, price, quantity_available, delivery_days, raw_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (order_id, supplier_id, item_name) 
         DO UPDATE SET 
           price = EXCLUDED.price,
           quantity_available = EXCLUDED.quantity_available,
           delivery_days = EXCLUDED.delivery_days,
           response_time = NOW(),
           raw_message = EXCLUDED.raw_message`,
        [
          orderId,
          supplierId,
          item.item_name,
          item.price,
          item.quantity,
          item.delivery_days,
          JSON.stringify({ contact_name, source: 'web_form', item })
        ]
      );
    }

    // Handle alternative offer if provided
    if (alternative_offer && alternative_offer.item_name && alternative_offer.price > 0) {
      await client.query(
        `INSERT INTO supplier_responses (order_id, supplier_id, item_name, price, quantity_available, delivery_days, raw_message)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (order_id, supplier_id, item_name) 
         DO UPDATE SET 
           price = EXCLUDED.price,
           quantity_available = EXCLUDED.quantity_available,
           delivery_days = EXCLUDED.delivery_days,
           response_time = NOW(),
           raw_message = EXCLUDED.raw_message`,
        [
          orderId,
          supplierId,
          `[АЛЬТЕРНАТИВА] ${alternative_offer.item_name}`,
          alternative_offer.price,
          alternative_offer.quantity || 1,
          alternative_offer.delivery_days || 0,
          JSON.stringify({ contact_name, source: 'web_form', alternative: true, offer: alternative_offer })
        ]
      );
    }

    // Update responses_received count in order_analysis
    const countResult = await client.query(
      `SELECT COUNT(DISTINCT supplier_id)::int as count 
       FROM supplier_responses 
       WHERE order_id = $1`,
      [orderId]
    );

    await client.query(
      `UPDATE order_analysis SET responses_received = $1 WHERE order_id = $2`,
      [countResult.rows[0].count, orderId]
    );

    await client.query('COMMIT');

    console.log(`✅ Supplier ${supplierId} submitted response for order ${orderId} via web form`);

    res.json({
      success: true,
      message: 'Спасибо! Ваш ответ успешно принят.',
      items_count: items.length + (alternative_offer?.item_name ? 1 : 0)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting supplier form:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сохранения ответа',
      error: error.message
    });
  } finally {
    client.release();
  }
});

module.exports = router;

