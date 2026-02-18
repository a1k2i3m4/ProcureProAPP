const fs = require('fs');
const path = require('path');

// Ждём, пока файл перестанет изменяться по размеру (защита от частичной записи)
async function waitForStableFile(filePath, { checks = 5, intervalMs = 200, minSizeBytes = 10 } = {}) {
  let lastSize = -1;
  for (let i = 0; i < checks; i++) {
    const stat = await fs.promises.stat(filePath);
    const size = stat.size;

    if (size >= minSizeBytes && size === lastSize) {
      return;
    }

    lastSize = size;
    await new Promise((r) => setTimeout(r, intervalMs));
  }
}

function parseOrderJson(jsonArray, sourceFile) {
  // Support: either one order array or multiple sequential ones in a file
  // Strategy: split by sentinel objects that have Id/fast, then group subsequent items until next sentinel
  const blocks = [];
  let current = null;

  for (const obj of jsonArray) {
    const hasId = obj && typeof obj === 'object' && 'Id' in obj;
    const hasFast = obj && typeof obj === 'object' && 'fast' in obj;

    if (hasId || hasFast) {
      // start new order block
      if (current) blocks.push(current);
      current = {
        order_id: String(obj.Id || '').trim(),
        fast: String(obj.fast || '').trim() || null,
        items: [],
        source_file: sourceFile,
      };
      continue;
    }

    // item row
    if (current) {
      const item = {
        tovar: String(obj.tovar || '').trim(),
        specific: String(obj.specific || '').trim(),
        qty: Number(obj.qty || 0),
      };
      current.items.push(item);
    }
  }
  if (current) blocks.push(current);

  // map to DB rows
  const now = new Date();
  return blocks
    .filter(b => b.order_id) // must have Id
    .map(b => ({
      order_id: b.order_id,
      fast: b.fast === 'yes' ? 'yes' : 'no',
      items: b.items,
      items_count: Array.isArray(b.items) ? b.items.length : 0,
      source_file: sourceFile,
      status: 'new',
      created_at: now,
      imported_at: now,
    }));
}

async function upsertOrders(pool, orders) {
  for (const o of orders) {
    console.log(`[UPSERT] Order ${o.order_id} items length: ${o.items.length}, stringified len: ${JSON.stringify(o.items).length}`);

    await pool.query(
      `INSERT INTO orders(order_id, fast, items, items_count, source_file, status, created_at, imported_at)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT(order_id) DO UPDATE SET
         fast = EXCLUDED.fast,
         items = EXCLUDED.items,
         items_count = EXCLUDED.items_count,
         source_file = EXCLUDED.source_file,
         status = EXCLUDED.status,
         imported_at = EXCLUDED.imported_at`,
      [o.order_id, o.fast, JSON.stringify(o.items), o.items_count, o.source_file, o.status, o.created_at, o.imported_at]
    );
  }
}

function ensureDirs(baseDir) {
  for (const d of ['processed','errors']) {
    const p = path.join(baseDir, d);
    try { fs.mkdirSync(p, { recursive: true }); } catch {}
  }
}

function watchOrdersFolder(baseDir, pool) {
  ensureDirs(baseDir);
  console.log(`[ORDERS] watching ${baseDir}`);

  const processFile = async (filePath) => {
    const fileName = path.basename(filePath);
    try {
      // Дождаться, пока файл полностью запишется
      await waitForStableFile(filePath);

      const rawFirst = await fs.promises.readFile(filePath, 'utf8');
      let data;
      try {
        data = JSON.parse(rawFirst);
      } catch (e) {
        // ещё раз попробуем после небольшой паузы — частая ситуация при длинных файлах
        await new Promise((r) => setTimeout(r, 400));
        const rawSecond = await fs.promises.readFile(filePath, 'utf8');
        data = JSON.parse(rawSecond);
      }

      if (!Array.isArray(data)) {
        throw new Error('JSON root must be an array');
      }
      const orders = parseOrderJson(data, fileName);
      if (orders.length === 0) {
        throw new Error('No valid orders parsed');
      }
      await upsertOrders(pool, orders);
      const dest = path.join(baseDir, 'processed', fileName);
      await fs.promises.rename(filePath, dest);
      console.log(`[ORDERS] processed ${fileName}: ${orders.length} order(s)`);
    } catch (err) {
      console.error('[ORDERS] error', fileName, err.message || err);
      try {
        const dest = path.join(baseDir, 'errors', fileName);
        await fs.promises.rename(filePath, dest);
      } catch {}
    }
  };

  // initial scan
  fs.promises.readdir(baseDir).then(files => {
    files.filter(f => f.toLowerCase().endsWith('.json')).forEach(f => processFile(path.join(baseDir, f)));
  }).catch(() => {});

  // watch for new files
  fs.watch(baseDir, { persistent: true }, (eventType, filename) => {
    if (!filename) return;
    if (filename.toLowerCase().endsWith('.json') && eventType === 'rename') {
      const full = path.join(baseDir, filename);
      setTimeout(() => {
        fs.existsSync(full) && processFile(full);
      }, 500);
    }
  });
}

module.exports = { watchOrdersFolder };
