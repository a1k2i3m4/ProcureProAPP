// Order Analyzer: Main service for analyzing orders and managing supplier communication

const { mapItemsToCategoryIds } = require('./categoryMapper');
const whatsappService = require('./whatsappService');

// Active timers for order analysis timeouts
const analysisTimers = new Map();

/**
 * Log error to analysis_errors table
 * @param {Object} pool - Database pool
 * @param {string} orderId - Order ID
 * @param {number|null} supplierId - Supplier ID (optional)
 * @param {string} errorType - Error type
 * @param {string} errorMessage - Error message
 * @param {Object} errorDetails - Error details (optional)
 */
async function logError(pool, orderId, supplierId, errorType, errorMessage, errorDetails = null) {
  try {
    const detailsStr = errorDetails ? JSON.stringify(errorDetails) : null;

    // analysis_schema.sql defines: (order_id, supplier_id, error_type, error_message, stack_trace)
    await pool.query(
      `INSERT INTO analysis_errors (order_id, supplier_id, error_type, error_message, stack_trace)
       VALUES ($1, $2, $3, $4, $5)`,
      [orderId, supplierId, errorType, errorMessage, detailsStr]
    );

    console.error(`[ERROR] ${errorType} for order ${orderId}:`, errorMessage);
  } catch (err) {
    // Never throw from logger; don't break API handlers
    console.error('Failed to log error:', err);
  }
}

/**
 * Find suppliers matching order categories
 * @param {Object} pool - Database pool
 * @param {Array} categoryIds - Category IDs
 * @param {boolean} isUrgent - Whether order is urgent
 * @returns {Promise<Array>} Array of suppliers with whatsapp numbers
 */
async function findMatchingSuppliers(pool, categoryIds, isUrgent) {
  if (categoryIds.length === 0) {
    return [];
  }

  let query = `
    SELECT DISTINCT s.id, s.name, s.whatsapp, s.rating, s.can_urgent, c.name as category_name
    FROM suppliers s
    LEFT JOIN categories c ON c.id = s.category_id
    WHERE s.category_id = ANY($1::int[])
      AND s.whatsapp IS NOT NULL
      AND s.whatsapp != ''
  `;

  // For urgent orders, only select suppliers who can handle urgent
  if (isUrgent) {
    query += ` AND s.can_urgent = true`;
  }

  query += ` ORDER BY s.rating DESC, s.name`;

  const result = await pool.query(query, [categoryIds]);
  return result.rows;
}

/**
 * Start analysis for an order
 * @param {Object} pool - Database pool
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Analysis result
 */
async function startAnalysis(pool, orderId) {
  try {
    // Check if analysis already exists
    const existingAnalysis = await pool.query(
      `SELECT id, status FROM order_analysis WHERE order_id = $1`,
      [orderId]
    );

    if (existingAnalysis.rows.length > 0) {
      throw new Error('Analysis already exists for this order');
    }

    // Get order details
    const orderResult = await pool.query(
      `SELECT order_id, fast, items, items_count FROM orders WHERE order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      throw new Error('Order not found');
    }

    const order = orderResult.rows[0];
    const isUrgent = order.fast === 'yes';
    const items = order.items || [];

    // Map items to categories
    const categoryIds = await mapItemsToCategoryIds(pool, items);

    if (categoryIds.length === 0) {
      await logError(pool, orderId, null, 'supplier_match', 'No matching categories found for order items');
      // Всегда уведомляем владельца — даже при ошибке
      await whatsappService.sendAdminNotification(order, []);
      throw new Error('No matching categories found for order items');
    }

    // Find matching suppliers
    let suppliers = await findMatchingSuppliers(pool, categoryIds, isUrgent);

    // Fallback: если срочный заказ, но нет поставщиков с can_urgent — берём всех подходящих
    if (suppliers.length === 0 && isUrgent) {
      console.log(`⚠️ No urgent-capable suppliers for order ${orderId}, falling back to all suppliers`);
      suppliers = await findMatchingSuppliers(pool, categoryIds, false);
    }

    if (suppliers.length === 0) {
      await logError(pool, orderId, null, 'supplier_match', `No suppliers found for categories (urgent: ${isUrgent})`);
      // Всегда уведомляем владельца — даже при ошибке
      await whatsappService.sendAdminNotification(order, []);
      throw new Error(`No suppliers found with WhatsApp numbers for this order`);
    }

    // Determine timeout based on urgency
    const timeoutMinutes = isUrgent ? 10 : 30;
    const timeoutAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // Create analysis record
    await pool.query(
      `INSERT INTO order_analysis (order_id, status, timeout_at, timeout_minutes, suppliers_contacted, responses_received)
       VALUES ($1, 'in_progress', $2, $3, 0, 0)`,
      [orderId, timeoutAt, timeoutMinutes]
    );

    // Send WhatsApp messages to suppliers
    let successCount = 0;
    const forcedWhatsAppNumber = process.env.WHATSAPP_TEST_NUMBER || null;
    const sendMode = String(process.env.WHATSAPP_SEND_MODE || 'template').toLowerCase();
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME || 'tender';
    const templateLang = process.env.WHATSAPP_TEMPLATE_LANG || 'ru';
    const frontendUrl = (process.env.FRONTEND_URL || 'http://82.115.42.79:8083').replace(/\/+$/, '');

    for (const supplier of suppliers) {
      try {
        const targetNumber = forcedWhatsAppNumber || supplier.whatsapp;

        if (sendMode === 'template') {
          // Шаблон tender: body содержит {{1}} — полная ссылка на форму поставщика
          const formUrl = `${frontendUrl}/supplier-form/${orderId}/${supplier.id}`;

          const components = [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: formUrl }
              ]
            }
          ];

          await whatsappService.sendTemplateMessage(targetNumber, {
            templateName,
            languageCode: templateLang,
            components
          });
        } else {
          await whatsappService.sendOrderToSupplier(targetNumber, order, supplier.id);
        }

        successCount++;
        const formUrl = `${frontendUrl}/supplier-form/${orderId}/${supplier.id}`;
        // Сохраняем запись об отправке
        await pool.query(
          `INSERT INTO supplier_notifications (order_id, supplier_id, whatsapp_number, status, form_url)
           VALUES ($1, $2, $3, 'sent', $4)
           ON CONFLICT (order_id, supplier_id) DO UPDATE SET
             sent_at = NOW(), status = 'sent', error_message = NULL, form_url = EXCLUDED.form_url`,
          [orderId, supplier.id, supplier.whatsapp, formUrl]
        );
        console.log(`✅ Sent order ${orderId} to ${forcedWhatsAppNumber ? 'test number' : supplier.name} (${targetNumber}) mode=${sendMode}`);
      } catch (error) {
        console.error(`Failed to send to supplier ${supplier.name}:`, error.message);
        // Сохраняем ошибку отправки
        await pool.query(
          `INSERT INTO supplier_notifications (order_id, supplier_id, whatsapp_number, status, error_message)
           VALUES ($1, $2, $3, 'failed', $4)
           ON CONFLICT (order_id, supplier_id) DO UPDATE SET
             sent_at = NOW(), status = 'failed', error_message = EXCLUDED.error_message`,
          [orderId, supplier.id, supplier.whatsapp, error.message]
        ).catch(() => {});
        await logError(pool, orderId, supplier.id, 'whatsapp_send', error.message, error.stack);
      }
    }

    // Update suppliers_contacted count
    await pool.query(
      `UPDATE order_analysis SET suppliers_contacted = $1 WHERE order_id = $2`,
      [successCount, orderId]
    );

    // Всегда уведомляем владельца — даже если поставщики не нашлись
    await whatsappService.sendAdminNotification(order, suppliers);

    // Set timeout to auto-complete analysis
    const timer = setTimeout(async () => {
      await completeAnalysisOnTimeout(pool, orderId);
    }, timeoutMinutes * 60 * 1000);

    analysisTimers.set(orderId, timer);

    return {
      success: true,
      suppliers_contacted: successCount,
      total_suppliers: suppliers.length,
      timeout_minutes: timeoutMinutes,
      timeout_at: timeoutAt,
      is_urgent: isUrgent
    };

  } catch (error) {
    await logError(pool, orderId, null, 'other', error.message, error.stack);
    throw error;
  }
}

/**
 * Complete analysis when timeout is reached
 * @param {Object} pool - Database pool
 * @param {string} orderId - Order ID
 */
async function completeAnalysisOnTimeout(pool, orderId) {
  try {
    const result = await pool.query(
      `UPDATE order_analysis 
       SET status = 'timeout', completed_at = NOW()
       WHERE order_id = $1 AND status = 'in_progress'
       RETURNING id`,
      [orderId]
    );

    if (result.rows.length > 0) {
      console.log(`⏱️ Analysis timeout for order ${orderId}`);
      await logError(pool, orderId, null, 'timeout', 'Analysis completed due to timeout');
    }

    // Remove timer
    analysisTimers.delete(orderId);
  } catch (error) {
    console.error('Error completing analysis on timeout:', error);
  }
}

/**
 * Manually complete analysis before timeout
 * @param {Object} pool - Database pool
 * @param {string} orderId - Order ID
 * @returns {Promise<boolean>} Success status
 */
async function completeAnalysisManually(pool, orderId) {
  try {
    // Clear timeout timer if exists
    if (analysisTimers.has(orderId)) {
      clearTimeout(analysisTimers.get(orderId));
      analysisTimers.delete(orderId);
    }

    const result = await pool.query(
      `UPDATE order_analysis 
       SET status = 'completed', completed_at = NOW()
       WHERE order_id = $1 AND status = 'in_progress'
       RETURNING id`,
      [orderId]
    );

    return result.rows.length > 0;
  } catch (error) {
    console.error('Error completing analysis manually:', error);
    return false;
  }
}

/**
 * Process supplier response to an order
 * @param {Object} pool - Database pool
 * @param {string} orderId - Order ID
 * @param {number} supplierId - Supplier ID
 * @param {string} messageText - Raw message text
 * @returns {Promise<Object>} Processing result
 */
async function processResponse(pool, orderId, supplierId, messageText) {
  try {
    // Parse the response
    const parsed = whatsappService.parseSupplierResponse(messageText);

    if (!parsed) {
      await logError(pool, orderId, supplierId, 'response_parse', 'Failed to parse response format', messageText);
      return { success: false, error: 'Invalid response format' };
    }

    // Check if analysis exists and is in progress
    const analysisCheck = await pool.query(
      `SELECT id, status FROM order_analysis WHERE order_id = $1`,
      [orderId]
    );

    if (analysisCheck.rows.length === 0) {
      await logError(pool, orderId, supplierId, 'other', 'No analysis found for order');
      return { success: false, error: 'No analysis found for this order' };
    }

    const analysisStatus = analysisCheck.rows[0].status;
    if (analysisStatus !== 'in_progress') {
      return { success: false, error: `Analysis is ${analysisStatus}` };
    }

    // Save response to database (UPSERT)
    await pool.query(
      `INSERT INTO supplier_responses (order_id, supplier_id, item_name, price, quantity_available, delivery_days, raw_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (order_id, supplier_id, item_name) 
       DO UPDATE SET 
         price = EXCLUDED.price,
         quantity_available = EXCLUDED.quantity_available,
         delivery_days = EXCLUDED.delivery_days,
         response_time = NOW(),
         raw_message = EXCLUDED.raw_message`,
      [orderId, supplierId, parsed.item_name, parsed.price, parsed.quantity_available, parsed.delivery_days, messageText]
    );

    // Update responses_received count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT supplier_id)::int as count 
       FROM supplier_responses 
       WHERE order_id = $1`,
      [orderId]
    );

    await pool.query(
      `UPDATE order_analysis SET responses_received = $1 WHERE order_id = $2`,
      [countResult.rows[0].count, orderId]
    );

    console.log(`✅ Processed response for order ${orderId} from supplier ${supplierId}`);

    return {
      success: true,
      parsed: parsed,
      responses_count: countResult.rows[0].count
    };

  } catch (error) {
    await logError(pool, orderId, supplierId, 'other', error.message, error.stack);
    throw error;
  }
}

/**
 * Get analysis status
 * @param {Object} pool - Database pool
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} Analysis status
 */
async function getAnalysisStatus(pool, orderId) {
  const result = await pool.query(
    `SELECT 
       order_id,
       status,
       started_at,
       completed_at,
       timeout_at,
       timeout_minutes,
       suppliers_contacted,
       responses_received
     FROM order_analysis
     WHERE order_id = $1`,
    [orderId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const analysis = result.rows[0];

  // Calculate time remaining
  const now = new Date();
  const timeoutAt = new Date(analysis.timeout_at);
  const timeRemainingMs = Math.max(0, timeoutAt - now);
  const timeRemainingMinutes = Math.floor(timeRemainingMs / 60000);
  const timeRemainingSeconds = Math.floor((timeRemainingMs % 60000) / 1000);

  return {
    ...analysis,
    time_remaining_ms: timeRemainingMs,
    time_remaining_formatted: `${timeRemainingMinutes}:${String(timeRemainingSeconds).padStart(2, '0')}`,
    progress_percent: analysis.suppliers_contacted > 0
      ? Math.round((analysis.responses_received / analysis.suppliers_contacted) * 100)
      : 0
  };
}

/**
 * Restart analysis for an order (clears previous analysis data)
 * @param {Object} pool - Database pool
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Analysis result
 */
async function restartAnalysis(pool, orderId) {
  if (analysisTimers.has(orderId)) {
    clearTimeout(analysisTimers.get(orderId));
    analysisTimers.delete(orderId);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM supplier_responses WHERE order_id = $1', [orderId]);
    await client.query('DELETE FROM analysis_errors WHERE order_id = $1', [orderId]);
    await client.query('DELETE FROM order_analysis WHERE order_id = $1', [orderId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return startAnalysis(pool, orderId);
}

module.exports = {
  startAnalysis,
  processResponse,
  getAnalysisStatus,
  completeAnalysisManually,
  completeAnalysisOnTimeout,
  restartAnalysis,
  findMatchingSuppliers,
  logError
};

