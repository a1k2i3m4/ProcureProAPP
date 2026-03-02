'use strict';

/**
 * Supplier Search Service
 * Ищет поставщиков через Google, Yandex и B2B-платформы используя Playwright.
 */

const { chromium } = require('playwright');
const { URL } = require('url');
const logger = require('../utils/logger');

// ─── B2B платформы ────────────────────────────────────────────────────────────
const B2B_PLATFORMS = [
  { name: 'satu.kz',    url: 'https://satu.kz/search?search_term={query}' },
  { name: 'tiu.ru',     url: 'https://tiu.ru/search?search_term={query}' },
  { name: 'pulscen.ru', url: 'https://pulscen.ru/find?q={query}' },
  { name: 'kazsnab.kz', url: 'https://kazsnab.kz/search/?q={query}' },
];

const DEFAULT_MAX_RESULTS = 10;
const PAGE_TIMEOUT        = 15000; // 15 с
const WAIT_AFTER_LOAD     = 1500;  // 1.5 с

// ─── Вспомогательные функции ─────────────────────────────────────────────────

/** Извлекает домен из URL */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** Ищет email-адреса в тексте */
function extractEmails(text) {
  const found = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
  return [...new Set(found)].filter(
    (e) => !['example', 'test', 'noreply', 'domain'].some((x) => e.toLowerCase().includes(x))
  );
}

/** Ищет телефоны в тексте (формат РФ/КЗ) */
function extractPhones(text) {
  const found =
    text.match(/(?:\+7|8|\\+7|\+7)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g) || [];
  return [...new Set(found)].map((p) => p.replace(/[\s\-\(\)]/g, ''));
}

/** Ищет Telegram-ники в тексте */
function extractTelegrams(text) {
  const found = text.match(/(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)/g) || [];
  return [...new Set(found)].map((t) => {
    const username = t.split('/').pop();
    return `@${username}`;
  });
}

/** Строит поисковые запросы по номенклатуре */
function buildQueries(nomenclature, specs, region) {
  const base = nomenclature.trim();
  const sp   = (specs || '').trim();

  const queries = [
    `${base}${sp ? ' ' + sp : ''} купить оптом`.trim(),
    `${base} поставщик`.trim(),
    `${base} производитель цена`.trim(),
  ];
  if (region) {
    queries.push(`${base}${sp ? ' ' + sp : ''} купить ${region}`.trim());
  }
  return queries;
}

// ─── Движок поиска ────────────────────────────────────────────────────────────

class SupplierSearchEngine {
  constructor() {
    this._browser  = null;
    this._context  = null;
  }

  // ── Жизненный цикл браузера ──────────────────────────────────────────────

  async start() {
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
    this._browser = await chromium.launch({
      headless: true,
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
    this._context = await this._browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/122.0.0.0 Safari/537.36',
      locale: 'ru-RU',
      extraHTTPHeaders: { 'Accept-Language': 'ru-RU,ru;q=0.9' },
    });
    logger.info('[SupplierSearch] Browser started');
  }

  async stop() {
    try {
      if (this._context) await this._context.close();
      if (this._browser) await this._browser.close();
    } catch (_) {}
    logger.info('[SupplierSearch] Browser stopped');
  }

  // ── Главный метод поиска ─────────────────────────────────────────────────

  /**
   * @param {string} nomenclature  — название товара/услуги
   * @param {object} [opts]
   * @param {string} [opts.specs]      — ГОСТ / спецификация
   * @param {string} [opts.region]     — регион
   * @param {number} [opts.maxResults] — максимум поставщиков
   * @returns {Promise<object[]>}
   */
  async searchForItem(nomenclature, opts = {}) {
    const { specs = '', region = null, maxResults = DEFAULT_MAX_RESULTS } = opts;

    const suppliers   = [];
    const seenDomains = new Set();

    const queries = buildQueries(nomenclature, specs, region);

    // Google + Yandex
    for (const query of queries) {
      if (suppliers.length >= maxResults) break;

      const [googleResults, yandexResults] = await Promise.allSettled([
        this._searchGoogle(query),
        this._searchYandex(query),
      ]);

      const all = [
        ...(googleResults.status === 'fulfilled' ? googleResults.value : []),
        ...(yandexResults.status === 'fulfilled' ? yandexResults.value : []),
      ];

      for (const result of all) {
        if (suppliers.length >= maxResults) break;
        const domain = extractDomain(result.url || '');
        if (!domain || seenDomains.has(domain)) continue;
        seenDomains.add(domain);

        const supplier = await this._extractSupplierInfo(result);
        if (supplier) suppliers.push(supplier);
      }
    }

    // B2B платформы
    for (const platform of B2B_PLATFORMS) {
      if (suppliers.length >= maxResults) break;
      const platformResults = await this._searchB2bPlatform(platform, nomenclature);
      for (const s of platformResults) {
        const domain = extractDomain(s.website || '');
        if (!domain || seenDomains.has(domain)) continue;
        seenDomains.add(domain);
        suppliers.push(s);
        if (suppliers.length >= maxResults) break;
      }
    }

    logger.info(
      '[SupplierSearch] Found %d suppliers for "%s"',
      suppliers.length,
      nomenclature
    );
    return suppliers;
  }

  // ── Поиск Google ─────────────────────────────────────────────────────────

  async _searchGoogle(query) {
    const results = [];
    let page;
    try {
      page = await this._context.newPage();
      const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=ru&num=10`;
      await page.goto(url, { timeout: PAGE_TIMEOUT, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(WAIT_AFTER_LOAD);

      const items = await page.$$('div.g');
      for (const el of items.slice(0, 10)) {
        const linkEl    = await el.$('a');
        const titleEl   = await el.$('h3');
        const snippetEl = await el.$('div[data-sncf], div.VwiC3b');

        if (!linkEl) continue;
        const href    = (await linkEl.getAttribute('href')) || '';
        const title   = titleEl   ? (await titleEl.innerText())   : '';
        const snippet = snippetEl ? (await snippetEl.innerText()) : '';

        if (href.startsWith('http') && !href.includes('google')) {
          results.push({ url: href, title, snippet, source: 'google' });
        }
      }
    } catch (e) {
      logger.warn('[SupplierSearch] Google error: %s', e.message);
    } finally {
      if (page) await page.close().catch(() => {});
    }
    return results;
  }

  // ── Поиск Yandex ─────────────────────────────────────────────────────────

  async _searchYandex(query) {
    const results = [];
    let page;
    try {
      page = await this._context.newPage();
      const url = `https://yandex.ru/search/?text=${encodeURIComponent(query)}`;
      await page.goto(url, { timeout: PAGE_TIMEOUT, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(WAIT_AFTER_LOAD);

      const items = await page.$$('li.serp-item');
      for (const el of items.slice(0, 10)) {
        let linkEl = await el.$('a.OrganicTitle-Link');
        if (!linkEl) linkEl = await el.$('a[href]');
        const titleEl   = await el.$('h2');
        const snippetEl = await el.$('div.OrganicTextContentSpan, span.organic__text');

        if (!linkEl) continue;
        const href    = (await linkEl.getAttribute('href')) || '';
        const title   = titleEl   ? (await titleEl.innerText())   : '';
        const snippet = snippetEl ? (await snippetEl.innerText()) : '';

        if (href.startsWith('http') && !href.includes('yandex')) {
          results.push({ url: href, title, snippet, source: 'yandex' });
        }
      }
    } catch (e) {
      logger.warn('[SupplierSearch] Yandex error: %s', e.message);
    } finally {
      if (page) await page.close().catch(() => {});
    }
    return results;
  }

  // ── Поиск по B2B платформам ───────────────────────────────────────────────

  async _searchB2bPlatform(platform, query) {
    const suppliers = [];
    let page;
    try {
      page = await this._context.newPage();
      const url = platform.url.replace('{query}', encodeURIComponent(query));
      await page.goto(url, { timeout: PAGE_TIMEOUT, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(WAIT_AFTER_LOAD);

      const selectors = [
        "[data-qaid='product_gallery'] a",
        '.product-card a',
        '.x-card a',
        '.catalog-item a',
        'h2 a, h3 a',
      ];

      let cards = [];
      for (const sel of selectors) {
        cards = await page.$$(sel);
        if (cards.length > 0) break;
      }

      const visitedUrls = new Set();
      for (const card of cards.slice(0, 5)) {
        let href = (await card.getAttribute('href')) || '';
        if (!href) continue;
        if (!href.startsWith('http')) {
          href = `https://${platform.name}${href.startsWith('/') ? '' : '/'}${href}`;
        }
        if (visitedUrls.has(href)) continue;
        visitedUrls.add(href);

        const text = (await card.innerText().catch(() => '')).trim();
        suppliers.push({
          company_name: text || platform.name,
          website:      href,
          description:  '',
          emails:       [],
          phones:       [],
          telegrams:    [],
          found_via:    platform.name,
        });
      }
    } catch (e) {
      logger.warn('[SupplierSearch] B2B %s error: %s', platform.name, e.message);
    } finally {
      if (page) await page.close().catch(() => {});
    }
    return suppliers;
  }

  // ── Извлечение контактов со страницы поставщика ───────────────────────────

  async _extractSupplierInfo(searchResult) {
    const { url, title = 'Unknown', snippet = '', source = 'web' } = searchResult;
    if (!url) return null;

    const supplier = {
      company_name: title,
      website:      url,
      description:  snippet,
      emails:       [],
      phones:       [],
      telegrams:    [],
      found_via:    source,
    };

    let page;
    try {
      page = await this._context.newPage();
      await page.goto(url, { timeout: 12000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(WAIT_AFTER_LOAD);

      const bodyText = await page.innerText('body').catch(() => '');

      supplier.emails    = extractEmails(bodyText);
      supplier.phones    = extractPhones(bodyText);
      supplier.telegrams = extractTelegrams(bodyText);

      // Пробуем зайти на страницу "Контакты"
      if (supplier.emails.length === 0) {
        const contactLink = await page.$(
          "a[href*='contact'], a[href*='kontakt'], a[href*='svyaz'], a[href*='contacts']"
        );
        if (contactLink) {
          try {
            await contactLink.click({ timeout: 5000 });
            await page.waitForTimeout(2000);
            const contactText = await page.innerText('body').catch(() => '');
            const moreEmails = extractEmails(contactText);
            const existing   = new Set(supplier.emails);
            moreEmails.forEach((e) => { if (!existing.has(e)) supplier.emails.push(e); });
          } catch (_) {}
        }
      }
    } catch (e) {
      logger.debug('[SupplierSearch] Cannot extract from %s: %s', url, e.message);
    } finally {
      if (page) await page.close().catch(() => {});
    }

    // Возвращаем только если есть хоть какой-то контакт
    const hasContacts =
      supplier.emails.length > 0 ||
      supplier.phones.length > 0 ||
      supplier.telegrams.length > 0;

    return hasContacts ? supplier : null;
  }
}

// ─── Публичный API ────────────────────────────────────────────────────────────

/**
 * Ищет поставщиков для одной позиции и сохраняет результат в БД.
 *
 * @param {object} pool        — pg Pool
 * @param {string} nomenclature
 * @param {object} [opts]
 * @returns {Promise<object[]>}
 */
async function searchAndSave(pool, nomenclature, opts = {}) {
  const engine = new SupplierSearchEngine();
  await engine.start();

  let suppliers = [];
  try {
    suppliers = await engine.searchForItem(nomenclature, opts);

    // Сохраняем в БД (кэш)
    for (const s of suppliers) {
      await pool.query(
        `INSERT INTO internet_suppliers
           (query, company_name, website, description, found_via, emails, phones, telegrams)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT DO NOTHING`,
        [
          nomenclature,
          s.company_name,
          s.website   || null,
          s.description || null,
          s.found_via || null,
          s.emails    || [],
          s.phones    || [],
          s.telegrams || [],
        ]
      ).catch((err) => logger.warn('[SupplierSearch] DB save error: %s', err.message));
    }
  } finally {
    await engine.stop();
  }

  return suppliers;
}

module.exports = { SupplierSearchEngine, searchAndSave, buildQueries };


