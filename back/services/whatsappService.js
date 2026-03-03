// WhatsApp Service: Send messages and parse responses via WhatsApp Business API

const axios = require('axios');

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v22.0';
const WHATSAPP_TOKEN = process.env.WHATSAPP_API_TOKEN || 'EAASixjgSKEkBQ9OD61fKZBT8Q4e48nHkPdqttIwCjQLJdWJe2773OShXbycgaPHuQvHrD5wqB7ozYhDWp2i16jCRcYpZCcAqacUHJVWmRb7hUSOVKv9mySzzgKpAlscORijXCYQo8r0ZBQpxI4ZBe8SuQXrSZAYLhJNUSkrzqy0uDfaT3C653v1WKnjZANcwZDZD';
// phone_number_id from Meta (do NOT confuse with phone number)
// Backward-compatible: some env files used WHATSAPP_PHONE_NUMBER for phone_number_id
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || process.env.WHATSAPP_PHONE_NUMBER || '1007855415740100';
const MOCK_MODE = process.env.WHATSAPP_MOCK_MODE === 'true';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://82.115.42.79:8083';

// Номер владельца — получает уведомление о КАЖДОМ заказе всегда
const ADMIN_NOTIFY_NUMBER = process.env.ADMIN_NOTIFY_NUMBER || '77072303223';

if (process.env.NODE_ENV === 'development') {
  const hasToken = Boolean(WHATSAPP_TOKEN);
  const hasPhoneId = Boolean(WHATSAPP_PHONE_ID);
  console.log(`📱 WhatsApp config:`);
  console.log(`  - Mock mode: ${MOCK_MODE}`);
  console.log(`  - Token: ${hasToken ? 'set (' + WHATSAPP_TOKEN.substring(0, 10) + '...)' : 'missing'}`);
  console.log(`  - Phone ID: ${hasPhoneId ? WHATSAPP_PHONE_ID : 'missing'}`);
  console.log(`  - API URL: ${WHATSAPP_API_URL}`);
}

/**
 * Format order message for supplier
 * @param {Object} order - Order object with order_id, fast, items
 * @param {number} supplierId - Supplier ID for form link
 * @returns {string} Formatted message
 */
function formatOrderMessage(order, supplierId) {
  const isUrgent = order.fast === 'yes';
  const urgentTag = isUrgent ? ' [СРОЧНО]' : '';

  let message = `🛒 Новый заказ #${order.order_id}${urgentTag}\n\n`;
  message += `Товары:\n`;

  if (Array.isArray(order.items)) {
    order.items.forEach((item, index) => {
      message += `${index + 1}. ${item.tovar} - ${item.qty} шт.\n`;
      if (item.specific) {
        message += `   Категория: ${item.specific}\n`;
      }
    });
  }

  // Add form link
  const formUrl = `${FRONTEND_URL}/supplier-form/${order.order_id}/${supplierId}`;
  message += `\n📝 Для ответа перейдите по ссылке:\n${formUrl}\n`;

  if (isUrgent) {
    message += `\n⚠️ СРОЧНЫЙ ЗАКАЗ! Требуется быстрая доставка.`;
  }

  return message;
}

/**
 * Normalize phone number by removing non-digit characters
 * @param {string} rawNumber - Raw phone number
 * @returns {string} Normalized phone number
 */
function normalizePhoneNumber(rawNumber) {
  if (!rawNumber) {
    return '';
  }
  return String(rawNumber).replace(/[^\d]/g, '');
}

/**
 * Send order to supplier via WhatsApp
 * @param {string} whatsappNumber - Supplier WhatsApp number (format: 1234567890)
 * @param {Object} orderData - Order data
 * @param {number} supplierId - Supplier ID for form link
 * @returns {Promise<Object>} Response from WhatsApp API
 */
async function sendOrderToSupplier(whatsappNumber, orderData, supplierId) {
  const message = formatOrderMessage(orderData, supplierId);
  const normalizedNumber = normalizePhoneNumber(whatsappNumber);

  if (!normalizedNumber) {
    throw new Error('WhatsApp send failed: missing recipient number');
  }

  if (!MOCK_MODE && (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID)) {
    throw new Error('WhatsApp send failed: missing WHATSAPP_API_TOKEN or WHATSAPP_PHONE_ID');
  }

  if (MOCK_MODE) {
    console.log('📱 [MOCK] WhatsApp message to', normalizedNumber);
    console.log('Message:', message);
    return { success: true, mock: true, messageId: `mock_${Date.now()}` };
  }

  try {
    const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`;

    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: normalizedNumber,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return {
      success: true,
      messageId: response.data.messages?.[0]?.id,
      data: response.data
    };
  } catch (error) {
    const details = error.response?.data || { message: error.message };
    console.error('WhatsApp send error to', normalizedNumber, ':', details);

    // Более детальная информация об ошибке
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }

    throw new Error(`WhatsApp send failed: ${details?.error?.message || error.message}`);
  }
}

/**
 * Send a template message with optional components (e.g. URL параметры).
 * @param {string} whatsappNumber - recipient number digits only (e.g. 77072303223)
 * @param {Object} options
 * @param {string} options.templateName   - имя шаблона, default 'tender'
 * @param {string} options.languageCode   - язык шаблона, default 'ru'
 * @param {Array}  options.components     - массив компонентов шаблона (параметры кнопки/тела)
 *
 * Пример components для шаблона с кнопкой-ссылкой:
 * [{ type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'SUFFIX' }] }]
 */
async function sendTemplateMessage(whatsappNumber, { templateName = 'tender', languageCode = 'ru', components = [] } = {}) {
  const normalizedNumber = normalizePhoneNumber(whatsappNumber);

  if (!normalizedNumber) {
    throw new Error('WhatsApp template send failed: missing recipient number');
  }
  if (!MOCK_MODE && (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID)) {
    throw new Error('WhatsApp template send failed: missing WHATSAPP_API_TOKEN or WHATSAPP_PHONE_ID');
  }

  if (MOCK_MODE) {
    console.log('📱 [MOCK] WhatsApp template to', normalizedNumber, templateName, JSON.stringify(components));
    return { success: true, mock: true, messageId: `mock_tpl_${Date.now()}` };
  }

  try {
    const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`;

    const templatePayload = {
      name: templateName,
      language: { code: languageCode }
    };
    if (components.length > 0) {
      templatePayload.components = components;
    }

    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: normalizedNumber,
        type: 'template',
        template: templatePayload
      },
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log(`✅ Template '${templateName}' sent to ${normalizedNumber}`);
    return { success: true, messageId: response.data.messages?.[0]?.id, data: response.data };
  } catch (error) {
    const details = error.response?.data || { message: error.message };
    console.error('WhatsApp template send error to', normalizedNumber, ':', details);
    if (error.response) {
      console.error('Template Response status:', error.response.status);
      console.error('Template Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw new Error(`WhatsApp template send failed: ${details?.error?.message || error.message}`);
  }
}

/**
 * Parse supplier response message
 * Expected format:
 * ТОВАР: Ведро с отжимом
 * ЦЕНА: 1500
 * КОЛИЧЕСТВО: 20
 * СРОК: 3
 *
 * @param {string} messageText - Raw message text from supplier
 * @returns {Object|null} Parsed response object or null if invalid
 */
function parseSupplierResponse(messageText) {
  if (!messageText || typeof messageText !== 'string') {
    return null;
  }

  const text = messageText.trim();

  // Regex patterns for extracting fields
  const patterns = {
    itemName: /ТОВАР:\s*(.+?)(?:\n|$)/i,
    price: /ЦЕНА:\s*(\d+(?:\.\d+)?)/i,
    quantity: /КОЛИЧЕСТВО:\s*(\d+)/i,
    deliveryDays: /СРОК:\s*(\d+)/i
  };

  const result = {};

  // Extract item name
  const itemMatch = text.match(patterns.itemName);
  if (itemMatch) {
    result.item_name = itemMatch[1].trim();
  } else {
    return null; // Item name is required
  }

  // Extract price
  const priceMatch = text.match(patterns.price);
  if (priceMatch) {
    result.price = parseFloat(priceMatch[1]);
  } else {
    return null; // Price is required
  }

  // Extract quantity
  const quantityMatch = text.match(patterns.quantity);
  if (quantityMatch) {
    result.quantity_available = parseInt(quantityMatch[1], 10);
  } else {
    return null; // Quantity is required
  }

  // Extract delivery days
  const deliveryMatch = text.match(patterns.deliveryDays);
  if (deliveryMatch) {
    result.delivery_days = parseInt(deliveryMatch[1], 10);
  } else {
    return null; // Delivery days is required
  }

  return result;
}

/**
 * Validate if message is a valid supplier response
 * @param {string} messageText - Message text
 * @returns {boolean} True if valid format
 */
function isValidResponse(messageText) {
  const parsed = parseSupplierResponse(messageText);
  return parsed !== null;
}

/**
 * Setup webhook endpoint for incoming WhatsApp messages
 * This should be called from the main app to register the webhook route
 * @param {Object} app - Express app instance
 * @param {Function} onMessageReceived - Callback (from, text, timestamp)
 */
function setupWebhook(app, onMessageReceived) {
  // Webhook verification (GET)
  app.get('/api/webhooks/whatsapp', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'procurepro_verify_token';

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('✅ WhatsApp webhook verified');
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Forbidden');
    }
  });

  // Webhook for incoming messages (POST)
  app.post('/api/webhooks/whatsapp', async (req, res) => {
    try {
      const body = req.body;

      // Quick response to WhatsApp
      res.status(200).send('OK');

      // Process webhook data
      if (body.object === 'whatsapp_business_account') {
        const entries = body.entry || [];

        for (const entry of entries) {
          const changes = entry.changes || [];

          for (const change of changes) {
            if (change.field === 'messages') {
              const messages = change.value.messages || [];

              for (const message of messages) {
                if (message.type === 'text') {
                  const from = message.from; // Phone number
                  const text = message.text.body;
                  const timestamp = message.timestamp;

                  console.log(`📩 WhatsApp message from ${from}:`, text);

                  // Call the callback
                  if (typeof onMessageReceived === 'function') {
                    await onMessageReceived(from, text, timestamp);
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Webhook processing error:', error);
    }
  });
}

/**
 * Send a plain text message to any number (internal helper)
 */
async function sendTextMessage(toNumber, text) {
  const normalized = normalizePhoneNumber(toNumber);
  if (!normalized) throw new Error('sendTextMessage: missing number');

  if (MOCK_MODE) {
    console.log(`📱 [MOCK] sendTextMessage → ${normalized}: ${text.substring(0, 80)}...`);
    return { success: true, mock: true, messageId: `mock_txt_${Date.now()}` };
  }

  const url = `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`;
  const response = await axios.post(
    url,
    { messaging_product: 'whatsapp', to: normalized, type: 'text', text: { body: text } },
    { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' }, timeout: 15000 }
  );
  return { success: true, messageId: response.data.messages?.[0]?.id };
}

/**
 * Отправить владельцу сводное уведомление о новом заказе.
 * Вызывается ВСЕГДА — независимо от того найдены поставщики или нет.
 * @param {Object} order  - объект заказа (order_id, fast, items)
 * @param {Array}  suppliers - массив найденных поставщиков (может быть пустым)
 */
async function sendAdminNotification(order, suppliers = []) {
  const adminNumber = ADMIN_NOTIFY_NUMBER;
  if (!adminNumber) return;

  const isUrgent = order.fast === 'yes';
  const urgentTag = isUrgent ? ' 🚨 СРОЧНО' : '';
  const itemsList = (Array.isArray(order.items) ? order.items : [])
    .map((it, i) => `  ${i + 1}. ${it.tovar} — ${it.qty} шт.`)
    .join('\n');

  let msg = `📋 ProcurePro: новый заказ #${order.order_id}${urgentTag}\n\n`;
  msg += `Товары:\n${itemsList || '  (нет данных)'}\n\n`;

  if (suppliers.length > 0) {
    msg += `✅ Уведомлены поставщики (${suppliers.length}):\n`;
    suppliers.forEach(s => { msg += `  • ${s.name}\n`; });
  } else {
    msg += `⚠️ Поставщики не найдены — проверь категории товаров.\n`;
  }

  msg += `\n🔗 ${FRONTEND_URL}`;

  try {
    await sendTextMessage(adminNumber, msg);
    console.log(`📲 Admin notification sent to ${adminNumber} for order ${order.order_id}`);
  } catch (err) {
    // Не бросаем ошибку — уведомление владельца не должно ломать основной флоу
    console.error(`❌ Failed to send admin notification for order ${order.order_id}:`, err.message);
  }
}

module.exports = {
  sendOrderToSupplier,
  sendTemplateMessage,
  sendTextMessage,
  sendAdminNotification,
  parseSupplierResponse,
  isValidResponse,
  formatOrderMessage,
  setupWebhook
};
