require('dotenv').config();

const whatsapp = require('../services/whatsappService');

async function main() {
  const to = process.env.WHATSAPP_TEST_NUMBER;
  if (!to) {
    console.error('Missing WHATSAPP_TEST_NUMBER in .env');
    process.exit(1);
  }

  const mode = process.argv[2] || 'template'; // template | text

  if (mode === 'text') {
    const body = process.argv.slice(3).join(' ') || `Тестовое сообщение ${new Date().toISOString()}`;
    const res = await whatsapp.sendOrderToSupplier(to, { order_id: 'TEST', fast: 'no', items: [{ tovar: body, qty: 1 }] });
    console.log('OK:', res);
    return;
  }

  const templateName = process.env.WHATSAPP_TEST_TEMPLATE || 'hello_world';
  const languageCode = process.env.WHATSAPP_TEST_LANG || 'en_US';
  const res = await whatsapp.sendTemplateMessage(to, { templateName, languageCode });
  console.log('OK:', res);
}

main().catch((e) => {
  console.error('FAILED:', e?.message || e);
  process.exit(1);
});

