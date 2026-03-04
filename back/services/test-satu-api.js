'use strict';
// Запустить: node /app/scripts/test-satu-api.js > /tmp/satu_test.txt 2>&1
const axios = require('axios');

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'application/json, */*',
  'Accept-Language': 'ru-RU,ru;q=0.9',
  'Referer': 'https://satu.kz/',
};

const endpoints = [
  'https://satu.kz/api/v2/products/search?q=%D1%81%D1%82%D0%B8%D0%BA%D0%B5%D1%80&per_page=5',
  'https://satu.kz/api/catalog/search?q=%D1%81%D1%82%D0%B8%D0%BA%D0%B5%D1%80&per_page=5',
  'https://satu.kz/search?search_term=%D1%81%D1%82%D0%B8%D0%BA%D0%B5%D1%80&format=json',
  'https://satu.kz/api/v1/products?search=%D1%81%D1%82%D0%B8%D0%BA%D0%B5%D1%80&per_page=5',
  'https://satu.kz/graphql',
];

(async () => {
  for (const url of endpoints) {
    try {
      console.log('\n=== Testing:', url);
      const resp = await axios.get(url, { headers, timeout: 8000, validateStatus: () => true });
      console.log('HTTP:', resp.status);
      const data = resp.data;
      if (typeof data === 'object') {
        console.log('JSON keys:', Object.keys(data).slice(0, 10).join(', '));
        console.log('Sample:', JSON.stringify(data).slice(0, 300));
      } else {
        console.log('Not JSON, first 200 chars:', String(data).slice(0, 200));
      }
    } catch (e) {
      console.log('ERROR:', e.message);
    }
  }
  process.exit(0);
})();

