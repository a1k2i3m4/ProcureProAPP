'use strict';

const { chromium } = require('playwright');
const { execSync } = require('child_process');
const axios = require('axios');
const { URL } = require('url');
const logger = require('../utils/logger');

function findChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const candidates = ['/usr/bin/chromium-browser','/usr/bin/chromium','/usr/bin/google-chrome','/usr/bin/google-chrome-stable'];
  for (const p of candidates) {
    try { execSync(`test -x ${p}`, { stdio: 'ignore' }); return p; } catch (_) {}
  }
  return undefined;
}

const DEFAULT_MAX_RESULTS = 10;
const PAGE_TIMEOUT = 20000;

const HTTP_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ru-RU,ru;q=0.9',
};

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}
function extractEmails(text) {
  const found = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
  return [...new Set(found)].filter(e => !['example','test','noreply','domain'].some(x => e.toLowerCase().includes(x)));
}
function extractPhones(text) {
  const found = text.match(/(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g) || [];
  return [...new Set(found)].map(p => p.replace(/[\s\-\(\)]/g, ''));
}
function parsePrice(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\s/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return (n > 10 && n < 1_000_000_000) ? n : null;
}
function buildQueries(nomenclature, specs, region) {
  const base = nomenclature.trim();
  const sp = (specs || '').trim();
  const queries = [`${base}${sp ? ' '+sp : ''} купить оптом`.trim(), `${base} поставщик цена`.trim()];
  if (region) queries.push(`${base} купить ${region}`.trim());
  return queries;
}

// ─── pulscen.kz — отдаёт реальный HTML без JS ────────────────────────────────
async function searchPulscen(query, maxItems = 8) {
  const suppliers = [];
  try {
    const url = `https://pulscen.kz/find?q=${encodeURIComponent(query)}`;
    const resp = await axios.get(url, { headers: HTTP_HEADERS, timeout: 10000 });
    const html = resp.data;

    // Парсим карточки через регулярки — быстро, без браузера
    // Структура: <div class="offer-item ..."> ... название ... цена ... компания ...
    const offerBlocks = html.match(/<(?:div|li|article)[^>]+class="[^"]*(?:offer|product|item|card)[^"]*"[^>]*>[\s\S]{100,2000}?<\/(?:div|li|article)>/gi) || [];

    logger.info('[SupplierSearch] pulscen.kz: %d blocks found', offerBlocks.length);

    for (const block of offerBlocks.slice(0, maxItems)) {
      // Название
      const titleMatch = block.match(/<(?:a|h[123456])[^>]*>([^<]{5,200})<\/(?:a|h[123456])>/i);
      const title = titleMatch ? titleMatch[1].trim().replace(/&[a-z]+;/g, ' ') : '';

      // Цена
      const priceMatch = block.match(/([\d\s]{2,10}(?:[.,]\d{1,2})?)\s*(?:тг|тнг|₸|руб|₽)/i);
      const priceNum = priceMatch ? parsePrice(priceMatch[1]) : null;

      // Ссылка
      const hrefMatch = block.match(/href="([^"]{5,200})"/);
      let href = hrefMatch ? hrefMatch[1] : '';
      if (href && !href.startsWith('http')) href = `https://pulscen.kz${href}`;

      // Компания
      const companyMatch = block.match(/(?:company|firm|supplier|поставщик)[^>]*>([^<]{3,100})</i);
      const company = companyMatch ? companyMatch[1].trim() : '';

      if (!title && !href) continue;

      suppliers.push({
        company_name: company || title || 'pulscen.kz',
        website: href || url,
        description: title || query,
        emails: [], phones: [], telegrams: [],
        found_via: 'pulscen.kz',
        price: priceNum,
        price_currency: priceNum ? '₸' : null,
      });
    }

    // Fallback — если блоки не нашли, ищем цены в тексте напрямую
    if (suppliers.length === 0) {
      const prices = html.match(/([\d\s]{2,10})\s*(?:тг|тнг|₸)/gi) || [];
      const links = html.match(/href="(\/price\/[^"]{5,100})"/g) || [];
      logger.info('[SupplierSearch] pulscen.kz fallback: %d prices, %d links', prices.length, links.length);

      for (let i = 0; i < Math.min(links.length, maxItems); i++) {
        const hrefRaw = (links[i].match(/href="([^"]+)"/) || [])[1] || '';
        const priceRaw = prices[i] || '';
        suppliers.push({
          company_name: `Поставщик ${i+1}`,
          website: hrefRaw ? `https://pulscen.kz${hrefRaw}` : url,
          description: query,
          emails: [], phones: [], telegrams: [],
          found_via: 'pulscen.kz',
          price: parsePrice(priceRaw),
          price_currency: priceRaw ? '₸' : null,
        });
      }
    }
  } catch (e) {
    logger.warn('[SupplierSearch] pulscen.kz error: %s', e.message);
  }
  logger.info('[SupplierSearch] pulscen.kz: %d suppliers', suppliers.length);
  return suppliers;
}

// ─── torg.mail.ru — отдаёт HTML без JS ───────────────────────────────────────
async function searchTorgMail(query, maxItems = 6) {
  const suppliers = [];
  try {
    const url = `https://torg.mail.ru/search/?q=${encodeURIComponent(query)}`;
    const resp = await axios.get(url, { headers: HTTP_HEADERS, timeout: 10000 });
    const html = resp.data;

    const priceMatches = html.match(/([\d\s]{2,10})\s*(?:руб|₽)/gi) || [];
    const linkMatches = html.match(/href="(https?:\/\/[^"]{10,200})"/g) || [];
    const titleMatches = html.match(/<(?:a|h[23])[^>]*title="([^"]{5,200})"/gi) || [];

    for (let i = 0; i < Math.min(titleMatches.length, maxItems); i++) {
      const titleRaw = (titleMatches[i].match(/title="([^"]+)"/) || [])[1] || '';
      const hrefRaw = i < linkMatches.length ? (linkMatches[i].match(/href="([^"]+)"/) || [])[1] || '' : '';
      const priceRaw = i < priceMatches.length ? priceMatches[i] : '';

      suppliers.push({
        company_name: titleRaw || `Продавец ${i+1}`,
        website: hrefRaw || url,
        description: titleRaw || query,
        emails: [], phones: [], telegrams: [],
        found_via: 'torg.mail.ru',
        price: parsePrice(priceRaw),
        price_currency: parsePrice(priceRaw) ? '₽' : null,
      });
    }
  } catch (e) {
    logger.warn('[SupplierSearch] torg.mail.ru error: %s', e.message);
  }
  logger.info('[SupplierSearch] torg.mail.ru: %d suppliers', suppliers.length);
  return suppliers;
}

// ─── Движок поиска ────────────────────────────────────────────────────────────
class SupplierSearchEngine {
  constructor() { this._browser = null; this._context = null; }

  async start() {
    this._browser = await chromium.launch({
      headless: true,
      executablePath: findChromiumPath(),
      args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
    });
    this._context = await this._browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      locale: 'ru-RU',
      extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9' },
    });
    logger.info('[SupplierSearch] Browser started');
  }

  async stop() {
    try { if (this._context) await this._context.close(); if (this._browser) await this._browser.close(); } catch (_) {}
    logger.info('[SupplierSearch] Browser stopped');
  }

  async searchForItem(nomenclature, opts = {}) {
    const { specs = '', region = null, maxResults = DEFAULT_MAX_RESULTS } = opts;
    const suppliers = [];
    const fullQuery = specs ? `${nomenclature} ${specs}` : nomenclature;

    const add = (list) => {
      for (const s of list) {
        if (suppliers.length >= maxResults) break;
        suppliers.push(s);
      }
    };

    // 1. satu.kz — ГЛАВНЫЙ источник, через браузер domcontentloaded + ожидание
    add(await this._scrapeSatu(fullQuery));

    // 2. pulscen.kz — через axios (HTML без JS)
    if (suppliers.length < maxResults) add(await searchPulscen(fullQuery, 6));

    // 3. tiu.ru — браузер
    if (suppliers.length < maxResults) add(await this._scrapeTiu(fullQuery));

    // 4. OLX.kz — браузер (запасной)
    if (suppliers.length < maxResults) add(await this._scrapeOlx(fullQuery));

    // 5. Google — fallback
    if (suppliers.length < maxResults) {
      const queries = buildQueries(nomenclature, specs, region);
      for (const q of queries.slice(0, 2)) {
        if (suppliers.length >= maxResults) break;
        for (const r of await this._searchGoogle(q)) {
          if (suppliers.length >= maxResults) break;
          const s = await this._extractPage(r);
          if (s) suppliers.push(s);
        }
      }
    }

    logger.info('[SupplierSearch] Total %d suppliers for "%s"', suppliers.length, nomenclature);
    return suppliers;
  }

  // ── satu.kz — domcontentloaded + 2s wait, как в оригинальном Python коде ──
  async _scrapeSatu(query) {
    const suppliers = [];
    let page;
    try {
      page = await this._context.newPage();
      const url = `https://satu.kz/search?search_term=${encodeURIComponent(query)}`;
      logger.info('[SupplierSearch] satu.kz loading: %s', url);

      // ВАЖНО: domcontentloaded (не networkidle!) + явное ожидание 2 сек
      await page.goto(url, { timeout: 20000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      // Пробуем все известные селекторы карточек satu.kz
      const cardSelectors = [
        '[data-qaid="product_gallery_item"]',
        '[data-qaid="product_card"]',
        '.products-list__item',
        '.x-gallery-tiles__item',
        'article[class*="product"]',
        'li[class*="product"]',
        'div[class*="ProductCard"]',
        'div[class*="product-card"]',
        '.x-product-card',
      ];

      let cards = [];
      let usedSel = '';
      for (const sel of cardSelectors) {
        cards = await page.$$(sel);
        if (cards.length > 0) { usedSel = sel; break; }
      }
      logger.info('[SupplierSearch] satu.kz: %d cards with "%s"', cards.length, usedSel);

      // Если не нашли карточки — дождёмся ещё 3 сек (JS может грузиться)
      if (cards.length === 0) {
        await page.waitForTimeout(3000);
        for (const sel of cardSelectors) {
          cards = await page.$$(sel);
          if (cards.length > 0) { usedSel = sel; break; }
        }
        logger.info('[SupplierSearch] satu.kz retry: %d cards with "%s"', cards.length, usedSel);
      }

      for (const card of cards.slice(0, 10)) {
        try {
          const titleEl = await card.$('[data-qaid="product_name"], .x-title, h2, h3, a[title]');
          const title = titleEl ? (await titleEl.innerText().catch(() => '')).trim() : '';

          const priceEl = await card.$('[data-qaid="product_price"], [class*="price"], [class*="Price"]');
          const priceRaw = priceEl ? (await priceEl.innerText().catch(() => '')).trim() : '';
          const priceNum = parsePrice(priceRaw);

          const compEl = await card.$('[data-qaid="company_name"], [class*="company"], [class*="seller"], [class*="Company"]');
          const company = compEl ? (await compEl.innerText().catch(() => '')).trim() : '';

          const linkEl = await card.$('a[href]');
          let href = linkEl ? (await linkEl.getAttribute('href') || '') : '';
          if (href && !href.startsWith('http')) href = `https://satu.kz${href}`;

          if (!title && !href) continue;

          suppliers.push({
            company_name: company || title || 'satu.kz',
            website: href || 'https://satu.kz',
            description: title || query,
            emails: [], phones: [], telegrams: [],
            found_via: 'satu.kz',
            price: priceNum,
            price_currency: priceNum ? '₸' : null,
          });
        } catch (_) {}
      }

      // Fallback — если карточек нет, ищем ссылки на продукты напрямую
      if (suppliers.length === 0) {
        logger.warn('[SupplierSearch] satu.kz: no cards, trying link fallback');
        const links = await page.$$('a[href*="/p"], a[href*="/product"], a[data-qaid]');
        for (const link of links.slice(0, 8)) {
          try {
            const href = await link.getAttribute('href') || '';
            const text = (await link.innerText().catch(() => '')).trim();
            if (!href || href.length < 5) continue;
            const fullHref = href.startsWith('http') ? href : `https://satu.kz${href}`;
            suppliers.push({
              company_name: text || 'satu.kz',
              website: fullHref,
              description: text || query,
              emails: [], phones: [], telegrams: [],
              found_via: 'satu.kz',
              price: null, price_currency: null,
            });
          } catch (_) {}
        }
      }
    } catch (e) {
      logger.warn('[SupplierSearch] satu.kz error: %s', e.message);
    } finally {
      if (page) await page.close().catch(() => {});
    }
    logger.info('[SupplierSearch] satu.kz: %d suppliers', suppliers.length);
    return suppliers;
  }

  // ── OLX ──────────────────────────────────────────────────────────────────
  async _scrapeOlx(query) {
    const suppliers = [];
    let page;
    try {
      page = await this._context.newPage();
      await page.goto(`https://www.olx.kz/list/q-${encodeURIComponent(query)}/`, { timeout: PAGE_TIMEOUT, waitUntil: 'domcontentloaded' });
      try { await page.waitForSelector('[data-cy="l-card"]', { timeout: 6000 }); } catch (_) {}
      const cards = await page.$$('[data-cy="l-card"]');
      logger.info('[SupplierSearch] olx.kz: %d cards', cards.length);
      for (const card of cards.slice(0, 10)) {
        try {
          const titleEl = await card.$('h6, [data-cy="ad-card-title"] h6');
          const title = titleEl ? (await titleEl.innerText().catch(() => '')).trim() : '';
          const priceEl = await card.$('[data-testid="ad-price"], p[data-testid]');
          const priceRaw = priceEl ? (await priceEl.innerText().catch(() => '')).trim() : '';
          const linkEl = await card.$('a[href]');
          let href = linkEl ? (await linkEl.getAttribute('href') || '') : '';
          if (href && !href.startsWith('http')) href = `https://www.olx.kz${href}`;
          suppliers.push({
            company_name: title || 'OLX продавец',
            website: href || 'https://www.olx.kz',
            description: title || query,
            emails: [], phones: [], telegrams: [],
            found_via: 'olx.kz',
            price: parsePrice(priceRaw),
            price_currency: parsePrice(priceRaw) ? '₸' : null,
          });
        } catch (_) {}
      }
    } catch (e) {
      logger.warn('[SupplierSearch] olx.kz error: %s', e.message);
    } finally { if (page) await page.close().catch(() => {}); }
    logger.info('[SupplierSearch] olx.kz: %d suppliers', suppliers.length);
    return suppliers;
  }

  // ── tiu.ru ────────────────────────────────────────────────────────────────
  async _scrapeTiu(query) {
    const suppliers = [];
    let page;
    try {
      page = await this._context.newPage();
      await page.goto(`https://tiu.ru/search?search_term=${encodeURIComponent(query)}`, { timeout: PAGE_TIMEOUT, waitUntil: 'domcontentloaded' });
      try { await page.waitForSelector('.b-product-card, .catalog-item, .product-card', { timeout: 6000 }); } catch (_) {}
      let cards = [];
      for (const sel of ['.b-product-card', '.catalog-item', '.product-card', 'article']) {
        cards = await page.$$(sel);
        if (cards.length > 0) { logger.info('[SupplierSearch] tiu.ru: %d cards with "%s"', cards.length, sel); break; }
      }
      for (const card of cards.slice(0, 8)) {
        try {
          const titleEl = await card.$('h2, h3, .name, a[class*="name"]');
          const title = titleEl ? (await titleEl.innerText().catch(() => '')).trim() : '';
          const priceEl = await card.$('[class*="price"], [class*="Price"]');
          const priceRaw = priceEl ? (await priceEl.innerText().catch(() => '')).trim() : '';
          const compEl = await card.$('[class*="company"], [class*="seller"], [class*="firm"]');
          const company = compEl ? (await compEl.innerText().catch(() => '')).trim() : '';
          const linkEl = await card.$('a[href]');
          let href = linkEl ? (await linkEl.getAttribute('href') || '') : '';
          if (href && !href.startsWith('http')) href = `https://tiu.ru${href}`;
          suppliers.push({
            company_name: company || title || 'tiu.ru',
            website: href || 'https://tiu.ru',
            description: title || query,
            emails: [], phones: [], telegrams: [],
            found_via: 'tiu.ru',
            price: parsePrice(priceRaw),
            price_currency: parsePrice(priceRaw) ? '₽' : null,
          });
        } catch (_) {}
      }
    } catch (e) {
      logger.warn('[SupplierSearch] tiu.ru error: %s', e.message);
    } finally { if (page) await page.close().catch(() => {}); }
    logger.info('[SupplierSearch] tiu.ru: %d suppliers', suppliers.length);
    return suppliers;
  }

  // ── Google ────────────────────────────────────────────────────────────────
  async _searchGoogle(query) {
    const results = [];
    let page;
    try {
      page = await this._context.newPage();
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}&hl=ru&num=10`, { timeout: PAGE_TIMEOUT, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      const items = await page.$$('div.g');
      for (const el of items.slice(0, 8)) {
        const linkEl = await el.$('a');
        const titleEl = await el.$('h3');
        const snippetEl = await el.$('div[data-sncf], div.VwiC3b');
        if (!linkEl) continue;
        const href = (await linkEl.getAttribute('href')) || '';
        const title = titleEl ? (await titleEl.innerText()) : '';
        const snippet = snippetEl ? (await snippetEl.innerText()) : '';
        if (href.startsWith('http') && !href.includes('google')) {
          results.push({ url: href, title, snippet, source: 'google' });
        }
      }
    } catch (e) {
      logger.warn('[SupplierSearch] Google error: %s', e.message);
    } finally { if (page) await page.close().catch(() => {}); }
    return results;
  }

  async _extractPage(searchResult) {
    const { url, title = 'Unknown', snippet = '', source = 'web' } = searchResult;
    if (!url) return null;
    const supplier = {
      company_name: title, website: url, description: snippet,
      emails: [], phones: [], telegrams: [],
      found_via: source, price: null, price_currency: null,
    };
    let page;
    try {
      page = await this._context.newPage();
      await page.goto(url, { timeout: 12000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const bodyText = await page.innerText('body').catch(() => '');
      supplier.emails = extractEmails(bodyText);
      supplier.phones = extractPhones(bodyText);
    } catch (e) {
      logger.debug('[SupplierSearch] Cannot extract from %s: %s', url, e.message);
    } finally { if (page) await page.close().catch(() => {}); }
    return supplier;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
async function searchAndSave(pool, nomenclature, opts = {}) {
  const engine = new SupplierSearchEngine();
  await engine.start();
  let suppliers = [];
  try {
    suppliers = await engine.searchForItem(nomenclature, opts);
    for (const s of suppliers) {
      await pool.query(
        `INSERT INTO internet_suppliers (query,company_name,website,description,found_via,emails,phones,telegrams,price,price_currency)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
        [nomenclature, s.company_name, s.website||null, s.description||null, s.found_via||null,
         s.emails||[], s.phones||[], s.telegrams||[], s.price||null, s.price_currency||null]
      ).catch(err => logger.warn('[SupplierSearch] DB save error: %s', err.message));
    }
  } finally {
    await engine.stop();
  }
  return suppliers;
}

module.exports = { SupplierSearchEngine, searchAndSave, buildQueries };


