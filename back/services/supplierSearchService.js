'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const { chromium } = require('playwright');
const { execSync, execFileSync } = require('child_process');
const { URL } = require('url');
const logger = require('../utils/logger');

function findChromiumPath() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const candidates = ['/usr/bin/chromium-browser', '/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'];
  for (const p of candidates) {
    try {
      execSync(`test -x ${p}`, { stdio: 'ignore' });
      return p;
    } catch (_) {}
  }
  return undefined;
}

const DEFAULT_MAX_RESULTS = 10;
const PAGE_TIMEOUT = 20000;

const KZ_MARKETPLACES = [
  {
    name: 'kaspi.kz',
    searchUrl: (query) => `https://kaspi.kz/shop/search/?text=${encodeURIComponent(query)}`,
    baseUrl: 'https://kaspi.kz',
    cardSelectors: ['[data-testid="product-card"]', '.item-card', 'article', 'li'],
    allowedPath: [/\/shop\/p\//i],
    blockedPath: [/\/gold/i, /\/kaspipay/i, /\/guide/i, /\/maps/i, /\/red/i],
    blockedTitles: ['kaspi.kz', 'продукты kaspi.kz'],
  },
  {
    name: 'olx.kz',
    searchUrl: (query) => `https://www.olx.kz/list/q-${encodeURIComponent(query)}/`,
    baseUrl: 'https://www.olx.kz',
    cardSelectors: ['[data-cy="l-card"]', 'article', 'li'],
    allowedPath: [/\/d\//i, /obyavlenie/i],
  },
  {
    name: 'satu.kz',
    searchUrl: (query) => `https://satu.kz/search?search_term=${encodeURIComponent(query)}`,
    baseUrl: 'https://satu.kz',
    cardSelectors: [
      '[data-qaid="product_gallery_item"]',
      '[data-qaid="product_card"]',
      '.products-list__item',
      '.x-gallery-tiles__item',
      'article[class*="product"]',
      'li[class*="product"]',
    ],
    fallbackLinkSelectors: ['a[href^="/p"]', 'a[href*="/p"]'],
    blockedPath: [/\/contacts/i, /\/about/i],
  },
  {
    name: 'alibaba.kz',
    searchUrl: (query) => `https://alibaba.kz/search?query=${encodeURIComponent(query)}`,
    baseUrl: 'https://alibaba.kz',
    cardSelectors: ['.product-card', '.catalog-item', 'article', 'li'],
    blockedPath: [/\/help/i, /\/about/i],
  },
  {
    name: 'krisha.kz',
    searchUrl: (query) => `https://krisha.kz/prodazha/kommercheskaya-nedvizhimost/?das[who]=1&text=${encodeURIComponent(query)}`,
    baseUrl: 'https://krisha.kz',
    cardSelectors: ['.a-card', '.offer-card', 'article', 'li'],
  },
  {
    name: 'build.kz',
    searchUrl: (query) => `https://build.kz/search/?q=${encodeURIComponent(query)}`,
    baseUrl: 'https://build.kz',
    cardSelectors: ['.product-card', '.catalog-item', 'article', 'li'],
  },
];

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isAllowedSourceUrl(url) {
  const domain = extractDomain(url);
  return Boolean(domain && domain.endsWith('.kz'));
}

function toAbsoluteUrl(baseUrl, href) {
  if (!href) return '';
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return '';
  }
}

function normalizeDuckDuckGoHref(href) {
  const raw = String(href || '').trim();
  if (!raw) return '';

  let normalized = raw;
  if (normalized.startsWith('//')) normalized = `https:${normalized}`;

  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname.includes('duckduckgo.com')) return normalized;

    const redirectTarget = parsed.searchParams.get('uddg') || parsed.searchParams.get('rut') || '';
    if (!redirectTarget) return normalized;

    const decoded = decodeURIComponent(redirectTarget);
    if (decoded.startsWith('http://') || decoded.startsWith('https://')) return decoded;
  } catch {
    // Keep the original href when URL parsing fails.
  }

  return normalized;
}

function isMarketplaceResultValid(config, href, title) {
  if (!href || !isAllowedSourceUrl(href)) return false;

  let path = '/';
  try {
    path = new URL(href).pathname || '/';
  } catch {
    path = '/';
  }

  if (config.allowedPath && !config.allowedPath.some((rx) => rx.test(path))) return false;
  if (config.blockedPath && config.blockedPath.some((rx) => rx.test(path))) return false;

  const normalizedTitle = String(title || '').trim().toLowerCase();
  if (config.blockedTitles && config.blockedTitles.some((x) => normalizedTitle === String(x).toLowerCase())) return false;

  return true;
}

function cleanupKaspiTitle(title) {
  return String(title || '')
    .replace(/\s+-\s+(Kaspi\s+Магазин|kaspi\.kz)$/i, '')
    .replace(/^Купить\s+/i, '')
    .trim();
}

function extractEmails(text) {
  const found = text.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g) || [];
  return [...new Set(found)].filter((e) => !['example', 'test', 'noreply', 'domain'].some((x) => e.toLowerCase().includes(x)));
}

function extractPhones(text) {
  const found = text.match(/(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g) || [];
  return [...new Set(found)].map((p) => p.replace(/[\s\-\(\)]/g, ''));
}

function parsePrice(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\s/g, '').replace(/[^\d.,]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return n > 10 && n < 1_000_000_000 ? n : null;
}

function buildQueries(nomenclature, specs, region) {
  const base = nomenclature.trim();
  const sp = (specs || '').trim();
  const queries = [
    `${base}${sp ? ` ${sp}` : ''} купить оптом Казахстан`.trim(),
    `${base} поставщик цена Казахстан`.trim(),
  ];
  if (region) queries.push(`${base} купить ${region}`.trim());
  return queries;
}

class SupplierSearchEngine {
  constructor() {
    this._browser = null;
    this._context = null;
  }

  async start() {
    this._browser = await chromium.launch({
      headless: true,
      executablePath: findChromiumPath(),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    this._context = await this._browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
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

  async searchForItem(nomenclature, opts = {}) {
    const { specs = '', region = null, maxResults = DEFAULT_MAX_RESULTS } = opts;
    const suppliers = [];
    const seenWebsites = new Set();
    const fullQuery = specs ? `${nomenclature} ${specs}` : nomenclature;

    const add = (list) => {
      for (const s of list) {
        if (suppliers.length >= maxResults) break;
        if (!s || !s.website || !isAllowedSourceUrl(s.website)) continue;

        const key = `${s.found_via || 'web'}::${s.website}`;
        if (seenWebsites.has(key)) continue;
        seenWebsites.add(key);

        suppliers.push(s);
      }
    };

    const kaspiFromDdg = await this._searchKaspiViaDuckDuckGo(fullQuery, 8);
    add(kaspiFromDdg);

    // Fallback: if DDG returns no Kaspi links, try direct Kaspi scraping.
    if (suppliers.length < maxResults && kaspiFromDdg.length === 0) {
      add(await this._scrapeMarketplace('kaspi.kz', fullQuery, 8));
    }

    if (suppliers.length < maxResults) add(await this._scrapeMarketplace('olx.kz', fullQuery, 8));
    if (suppliers.length < maxResults) add(await this._scrapeMarketplace('satu.kz', fullQuery, 8));
    if (suppliers.length < maxResults) add(await this._scrapeMarketplace('alibaba.kz', fullQuery, 8));
    if (suppliers.length < maxResults) add(await this._scrapeMarketplace('krisha.kz', fullQuery, 6));
    if (suppliers.length < maxResults) add(await this._scrapeMarketplace('build.kz', fullQuery, 8));

    if (suppliers.length < maxResults) {
      const queries = buildQueries(nomenclature, specs, region);
      for (const q of queries) {
        if (suppliers.length >= maxResults) break;
        const results = await this._searchGoogleKz(q);
        for (const r of results) {
          if (suppliers.length >= maxResults) break;
          const extracted = await this._extractPage(r);
          add(extracted ? [extracted] : []);
        }
      }
    }

    logger.info('[SupplierSearch] Total %d suppliers for "%s"', suppliers.length, nomenclature);
    return suppliers;
  }

  async _searchKaspiViaDuckDuckGo(query, limit = 8) {
    const suppliers = [];
    try {
      const searchQuery = `site:kaspi.kz/shop/p ${query}`;
      let html = '';
      try {
        html = execFileSync(
          'curl',
          [
            '-sS',
            'https://html.duckduckgo.com/html/',
            '-H', 'User-Agent: Mozilla/5.0',
            '-H', 'Accept-Language: ru-RU,ru;q=0.9',
            '-H', 'Content-Type: application/x-www-form-urlencoded',
            '--data-urlencode', `q=${searchQuery}`,
          ],
          { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }
        );
      } catch (curlError) {
        logger.warn('[SupplierSearch] kaspi.kz DuckDuckGo curl error: %s', curlError.message);
        const response = await axios.post(
          'https://html.duckduckgo.com/html/',
          new URLSearchParams({ q: searchQuery }).toString(),
          {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              'Accept-Language': 'ru-RU,ru;q=0.9',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 15000,
            validateStatus: () => true,
          }
        );
        html = response.data || '';
      }

      const $ = cheerio.load(html);
      const linkItems = [];
      $('a.result__a, h2 a, a[data-testid="result-title-a"]').each((_, el) => {
        const hrefCandidate = String($(el).attr('href') || '').trim();
        if (!hrefCandidate) return;
        linkItems.push({
          href: normalizeDuckDuckGoHref(hrefCandidate),
          rawTitle: $(el).text().trim().replace(/\s+/g, ' '),
        });
      });

      for (const item of linkItems) {
        if (suppliers.length >= limit) break;

        const href = item.href;
        const rawTitle = item.rawTitle;
        const title = cleanupKaspiTitle(rawTitle);

        if (!href.includes('kaspi.kz/shop/p/')) return;
        if (!isMarketplaceResultValid(KZ_MARKETPLACES.find((x) => x.name === 'kaspi.kz'), href, title)) return;

        suppliers.push({
          company_name: title || 'kaspi.kz',
          website: href,
          description: rawTitle || query,
          emails: [],
          phones: [],
          telegrams: [],
          found_via: 'kaspi.kz',
          price: null,
          price_currency: null,
        });
      }
    } catch (e) {
      logger.warn('[SupplierSearch] kaspi.kz DuckDuckGo fallback error: %s', e.message);
    }

    logger.info('[SupplierSearch] kaspi.kz via DuckDuckGo: %d suppliers', suppliers.length);
    return suppliers;
  }

  async _scrapeMarketplace(name, query, limit = 8) {
    const config = KZ_MARKETPLACES.find((x) => x.name === name);
    if (!config) return [];

    const suppliers = [];
    let page;

    try {
      page = await this._context.newPage();
      await page.goto(config.searchUrl(query), { timeout: PAGE_TIMEOUT, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      let cards = [];
      for (const sel of config.cardSelectors) {
        cards = await page.$$(sel);
        if (cards.length > 0) break;
      }

      for (const card of cards.slice(0, limit)) {
        try {
          const linkEl = await card.$('a[href]');
          const rawHref = linkEl ? (await linkEl.getAttribute('href') || '') : '';
          const href = toAbsoluteUrl(config.baseUrl, rawHref);
          if (!href || !isAllowedSourceUrl(href)) continue;

          const titleEl = await card.$('h1, h2, h3, h4, a[title], [data-testid*="title"], [class*="title"]');
          const title = titleEl ? (await titleEl.innerText().catch(() => '')).trim() : '';
          if (!isMarketplaceResultValid(config, href, title)) continue;

          const companyEl = await card.$('[data-qaid="company_name"], [class*="company"], [class*="seller"], [class*="shop"]');
          const company = companyEl ? (await companyEl.innerText().catch(() => '')).trim() : '';

          const text = (await card.innerText().catch(() => '')).trim();
          const price = parsePrice(text);

          suppliers.push({
            company_name: company || title || name,
            website: href,
            description: title || query,
            emails: [],
            phones: [],
            telegrams: [],
            found_via: name,
            price,
            price_currency: price ? '₸' : null,
          });
        } catch (_) {}
      }

      // Fallback for marketplaces where product links are present but card selectors drift.
      if (suppliers.length === 0 && config.fallbackLinkSelectors && config.fallbackLinkSelectors.length > 0) {
        const seen = new Set();
        for (const sel of config.fallbackLinkSelectors) {
          if (suppliers.length >= limit) break;

          const links = await page.$$(sel);
          for (const link of links) {
            if (suppliers.length >= limit) break;

            const rawHref = (await link.getAttribute('href').catch(() => '')) || '';
            const href = toAbsoluteUrl(config.baseUrl, rawHref);
            if (!href || !isAllowedSourceUrl(href)) continue;

            if (seen.has(href)) continue;
            seen.add(href);

            const title = (await link.innerText().catch(() => '')).trim().replace(/\s+/g, ' ');
            if (!isMarketplaceResultValid(config, href, title)) continue;

            suppliers.push({
              company_name: title || name,
              website: href,
              description: title || query,
              emails: [],
              phones: [],
              telegrams: [],
              found_via: name,
              price: null,
              price_currency: null,
            });
          }
        }
      }
    } catch (e) {
      logger.warn('[SupplierSearch] %s error: %s', name, e.message);
    } finally {
      if (page) await page.close().catch(() => {});
    }

    logger.info('[SupplierSearch] %s: %d suppliers', name, suppliers.length);
    return suppliers;
  }

  async _searchGoogleKz(query) {
    const results = [];
    let page;

    try {
      page = await this._context.newPage();
      const kzQuery = `${query} site:.kz`;
      await page.goto(`https://www.google.com/search?q=${encodeURIComponent(kzQuery)}&hl=ru&num=10`, {
        timeout: PAGE_TIMEOUT,
        waitUntil: 'domcontentloaded',
      });
      await page.waitForTimeout(2000);

      const items = await page.$$('div.g');
      for (const el of items.slice(0, 8)) {
        const linkEl = await el.$('a');
        const titleEl = await el.$('h3');
        const snippetEl = await el.$('div[data-sncf], div.VwiC3b');
        if (!linkEl) continue;

        const href = (await linkEl.getAttribute('href')) || '';
        const title = titleEl ? await titleEl.innerText() : '';
        const snippet = snippetEl ? await snippetEl.innerText() : '';

        if (href.startsWith('http') && !href.includes('google') && isAllowedSourceUrl(href)) {
          results.push({ url: href, title, snippet, source: 'google.kz' });
        }
      }
    } catch (e) {
      logger.warn('[SupplierSearch] Google KZ fallback error: %s', e.message);
    } finally {
      if (page) await page.close().catch(() => {});
    }

    return results;
  }

  async _extractPage(searchResult) {
    const { url, title = 'Unknown', snippet = '', source = 'web' } = searchResult;
    if (!url || !isAllowedSourceUrl(url)) return null;

    const supplier = {
      company_name: title,
      website: url,
      description: snippet,
      emails: [],
      phones: [],
      telegrams: [],
      found_via: source,
      price: null,
      price_currency: null,
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
    } finally {
      if (page) await page.close().catch(() => {});
    }

    return supplier;
  }
}

async function searchAndSave(pool, nomenclature, opts = {}) {
  const engine = new SupplierSearchEngine();
  await engine.start();

  let suppliers = [];
  try {
    suppliers = await engine.searchForItem(nomenclature, opts);
    for (const s of suppliers) {
      await pool
        .query(
          `INSERT INTO internet_suppliers (query,company_name,website,description,found_via,emails,phones,telegrams,price,price_currency)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
          [
            nomenclature,
            s.company_name,
            s.website || null,
            s.description || null,
            s.found_via || null,
            s.emails || [],
            s.phones || [],
            s.telegrams || [],
            s.price || null,
            s.price_currency || null,
          ]
        )
        .catch((err) => logger.warn('[SupplierSearch] DB save error: %s', err.message));
    }
  } finally {
    await engine.stop();
  }

  return suppliers;
}

module.exports = { SupplierSearchEngine, searchAndSave, buildQueries };


