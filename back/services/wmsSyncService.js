const axios = require('axios');
const pool = require('../db');

const REPORTING_SERVICE_URL = (process.env.REPORTING_SERVICE_URL || 'http://reporting-service:3100').replace(/\/$/, '');
const WMS_REQUEST_TIMEOUT_MS = Number(process.env.WMS_REQUEST_TIMEOUT_MS || 30000);
const WMS_SYNC_INTERVAL_MS = Number(process.env.WMS_SYNC_INTERVAL_MS || 24 * 60 * 60 * 1000);
const WMS_WAREHOUSE_CODE = String(process.env.WMS_WAREHOUSE_CODE || '500005').trim();
const WMS_SYNC_PRUNE = process.env.WMS_SYNC_PRUNE !== 'false';

const FLAG_LAST_SYNC = 'stocks_wms_last_sync';
const FLAG_LAST_ERROR = 'stocks_wms_last_error';
const FLAG_LAST_RESULT = 'stocks_wms_last_result';

let activeSyncPromise = null;

function normalizeCode(value) {
  return String(value || '').trim();
}

function normalizeQty(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function aggregateByGsCode(items) {
  const stockMap = new Map();
  for (const item of items) {
    const gsCode = normalizeCode(item.gdsCode);
    if (!gsCode) continue;

    const qty = normalizeQty(item.qty);
    const prev = stockMap.get(gsCode) || 0;
    stockMap.set(gsCode, prev + qty);
  }
  return stockMap;
}

async function setFlag(client, key, value) {
  await client.query(
    `INSERT INTO import_flags(key, value)
     VALUES($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, created_at = NOW()`,
    [key, value]
  );
}

async function fetchWmsProducts() {
  const url = `${REPORTING_SERVICE_URL}/api/warehouse/products?warehouseCode=${encodeURIComponent(WMS_WAREHOUSE_CODE)}`;
  const { data } = await axios.get(url, {
    timeout: WMS_REQUEST_TIMEOUT_MS,
  });

  if (!data || !Array.isArray(data.data)) {
    throw new Error('Unexpected response from reporting-service /api/warehouse/products');
  }

  return data.data;
}

async function runSync(options = {}) {
  const prune = options.prune !== undefined ? Boolean(options.prune) : WMS_SYNC_PRUNE;
  const startedAt = new Date();
  const startedMs = Date.now();

  const wmsItems = await fetchWmsProducts();
  const aggregated = aggregateByGsCode(wmsItems);
  const rows = Array.from(aggregated.entries());

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query('CREATE TEMP TABLE temp_wms_stocks (gs_code TEXT PRIMARY KEY, stock_qty NUMERIC) ON COMMIT DROP');

    const BATCH = 1000;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const valuesSql = chunk.map((_, idx) => {
        const off = idx * 2;
        return `($${off + 1}, $${off + 2})`;
      }).join(',');
      const params = chunk.flatMap(([gsCode, qty]) => [gsCode, qty]);

      await client.query(
        `INSERT INTO temp_wms_stocks (gs_code, stock_qty)
         VALUES ${valuesSql}
         ON CONFLICT (gs_code) DO UPDATE SET stock_qty = EXCLUDED.stock_qty`,
        params
      );
    }

    const matchedResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM stocks s
       INNER JOIN temp_wms_stocks t ON t.gs_code = s.gs_code
       WHERE s.gs_code IS NOT NULL AND s.gs_code != ''`
    );

    const updateResult = await client.query(
      `UPDATE stocks s
       SET stock_qty = t.stock_qty,
           updated_at = NOW()
       FROM temp_wms_stocks t
       WHERE s.gs_code IS NOT NULL
         AND s.gs_code != ''
         AND s.gs_code = t.gs_code`
    );

    let prunedRows = 0;
    if (prune) {
      const pruneResult = await client.query(
        `DELETE FROM stocks s
         WHERE s.gs_code IS NOT NULL
           AND s.gs_code != ''
           AND NOT EXISTS (
             SELECT 1
             FROM temp_wms_stocks t
             WHERE t.gs_code = s.gs_code
           )`
      );
      prunedRows = pruneResult.rowCount || 0;
    }

    const finishedAt = new Date();
    const durationMs = Date.now() - startedMs;
    const result = {
      ok: true,
      started_at: startedAt.toISOString(),
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
      wms_items: wmsItems.length,
      unique_codes: rows.length,
      matched_rows: matchedResult.rows[0]?.count || 0,
      updated_rows: updateResult.rowCount || 0,
      pruned_rows: prunedRows,
      prune_enabled: prune,
    };

    await setFlag(client, FLAG_LAST_SYNC, finishedAt.toISOString());
    await setFlag(client, FLAG_LAST_RESULT, JSON.stringify(result));
    await client.query('DELETE FROM import_flags WHERE key = $1', [FLAG_LAST_ERROR]);

    await client.query('COMMIT');

    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function syncStocksFromWms(options = {}) {
  if (activeSyncPromise) return activeSyncPromise;

  activeSyncPromise = (async () => {
    try {
        return await runSync(options);
    } catch (err) {
      const errorMessage = `${new Date().toISOString()} ${String(err.message || err)}`;
      await pool.query(
        `INSERT INTO import_flags(key, value)
         VALUES($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, created_at = NOW()`,
        [FLAG_LAST_ERROR, errorMessage]
      );
      throw err;
    } finally {
      activeSyncPromise = null;
    }
  })();

  return activeSyncPromise;
}

async function getWmsSyncStatus() {
  const result = await pool.query(
    'SELECT key, value, created_at FROM import_flags WHERE key = ANY($1::text[])',
    [[FLAG_LAST_SYNC, FLAG_LAST_ERROR, FLAG_LAST_RESULT]]
  );

  const byKey = new Map(result.rows.map((row) => [row.key, row]));

  let lastResult = null;
  const rawResult = byKey.get(FLAG_LAST_RESULT)?.value;
  if (rawResult) {
    try {
      lastResult = JSON.parse(rawResult);
    } catch {
      lastResult = null;
    }
  }

  return {
    in_progress: Boolean(activeSyncPromise),
    sync_interval_ms: WMS_SYNC_INTERVAL_MS,
    reporting_service_url: REPORTING_SERVICE_URL,
    last_synced_at: byKey.get(FLAG_LAST_SYNC)?.value || null,
    last_error: byKey.get(FLAG_LAST_ERROR)?.value || null,
    last_result: lastResult,
  };
}

async function fetchWmsProductsFiltered(warehouseCode) {
  let url = `${REPORTING_SERVICE_URL}/api/warehouse/products`;
  if (warehouseCode) {
    url += `?warehouseCode=${encodeURIComponent(warehouseCode)}`;
  }

  console.log(`[seedStocksFromWms] Fetching from: ${url}`);

  const { data } = await axios.get(url, {
    timeout: WMS_REQUEST_TIMEOUT_MS,
  });

  if (!data || !Array.isArray(data.data)) {
    throw new Error('Unexpected response from reporting-service /api/warehouse/products');
  }

  console.log(`[seedStocksFromWms] Received ${data.data.length} items`);
  return data.data;
}

async function seedStocksFromWms(warehouseCode) {
  const requestedWarehouseCode = String(warehouseCode || WMS_WAREHOUSE_CODE).trim();
  const wmsItems = await fetchWmsProductsFiltered(requestedWarehouseCode);

  // Собираем уникальные товары: gs_code → { name, group_name, contract_company, stock_qty, price }
  const productMap = new Map();
  for (const item of wmsItems) {
    // Защитный фильтр: берем только целевой склад.
    if (requestedWarehouseCode && String(item.warehouseCode || '').trim() !== requestedWarehouseCode) {
      continue;
    }

    const gsCode = normalizeCode(item.gdsCode);
    if (!gsCode) continue;

    const name = String(item.name || item.gdsName || '').trim();
    if (!name) continue;

    // Если товар уже есть в map, суммируем остатки
    if (productMap.has(gsCode)) {
      const existing = productMap.get(gsCode);
      existing.stock_qty += normalizeQty(item.qty);
    } else {
      const groupName = String(item.groupName || item.group_name || '').trim() || null;
      const contractCompany = String(item.supplierName || item.venNm || '').trim() || null;
      const price = normalizeQty(item.prc || item.price || 0) || null;
      productMap.set(gsCode, {
        name,
        groupName,
        contractCompany,
        stock_qty: normalizeQty(item.qty),
        price: price > 0 ? price : null
      });
    }
  }

  const rows = Array.from(productMap.entries());
  let inserted = 0;
  let skipped = 0;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      for (const [gsCode, { name, groupName, contractCompany, stock_qty, price }] of chunk) {
        const r = await client.query(
          `INSERT INTO stocks(gs_code, group_name, name, contract_company, min_stock, stock_qty, price)
           VALUES($1, $2, $3, $4, NULL, $5, $6)
           ON CONFLICT (name) DO NOTHING`,
          [gsCode, groupName, name, contractCompany, stock_qty, price]
        );
        if (r.rowCount > 0) inserted++; else skipped++;
      }
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return {
    ok: true,
    warehouse_code: requestedWarehouseCode,
    wms_items: wmsItems.length,
    unique_codes: rows.length,
    inserted,
    skipped,
  };
}

module.exports = {
  syncStocksFromWms,
  seedStocksFromWms,
  getWmsSyncStatus,
  WMS_SYNC_INTERVAL_MS,
};



