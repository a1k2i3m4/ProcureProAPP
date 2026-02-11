require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const pool = require('./db');
const suppliersRoutes = require('./routes/suppliersRoutes');
const { parseSuppliersFromCU } = require('./services/excelImport');

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.use(cors({ origin: '*', methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'] }));
app.use(express.json());

async function initDb() {
  const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);

  // Orders schema
  const ordersSchemaPath = path.join(__dirname, 'sql', 'orders_schema.sql');
  if (fs.existsSync(ordersSchemaPath)) {
    const ordersSql = fs.readFileSync(ordersSchemaPath, 'utf8');
    await pool.query(ordersSql);
  }

  await pool.query(
    'CREATE TABLE IF NOT EXISTS import_flags (key TEXT PRIMARY KEY, value TEXT, created_at TIMESTAMP DEFAULT NOW())'
  );
}

async function importOnce({ force = false } = {}) {
  if (force) {
    await pool.query("DELETE FROM import_flags WHERE key = 'cu_suppliers_imported'");
  } else {
    const imported = await pool.query('SELECT value FROM import_flags WHERE key = $1', ['cu_suppliers_imported']);
    if (imported.rows.length) return { skipped: true, rowsParsed: 0 };
  }

  const uploadsDir = path.join(__dirname, 'uploads');
  const candidates = [
    path.join(uploadsDir, 'Список поставщиков_CU.xlsx'),
    path.join(uploadsDir, 'Список поставщиков CU.xlsx'),
    path.join(uploadsDir, 'Список поставщиков_CU.XLSX'),
  ];

  let excelPath = candidates.find((p) => fs.existsSync(p));

  if (!excelPath && fs.existsSync(uploadsDir)) {
    const xlsxFile = fs.readdirSync(uploadsDir).find((f) => f.toLowerCase().endsWith('.xlsx'));
    if (xlsxFile) excelPath = path.join(uploadsDir, xlsxFile);
  }

  if (!excelPath) {
    throw new Error(`Excel файл не найден в ${uploadsDir}. Положите файл Список поставщиков_CU.xlsx`);
  }

  console.log('📥 Importing suppliers from:', excelPath);
  const records = parseSuppliersFromCU(excelPath);
  console.log('📄 Parsed rows:', records.length);

  if (force) {
    // при форсе чистим, чтобы гарантировать "один раз перезаписать"
    await pool.query('TRUNCATE TABLE suppliers RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE TABLE categories RESTART IDENTITY CASCADE');
  }

  for (const r of records) {
    const cat = await pool.query(
      'INSERT INTO categories(name) VALUES($1) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name RETURNING id',
      [r.category]
    );
    const categoryId = cat.rows[0].id;

    await pool.query(
      `INSERT INTO suppliers(name, contact_person, phone, category_id)
       VALUES($1,$2,$3,$4)
       ON CONFLICT (name, phone, category_id) DO UPDATE SET
         contact_person = EXCLUDED.contact_person,
         updated_at = NOW()`,
      [r.supplier, r.contactPerson || null, r.phone || null, categoryId]
    );
  }

  await pool.query(
    'INSERT INTO import_flags(key, value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    ['cu_suppliers_imported', new Date().toISOString()]
  );

  return { skipped: false, rowsParsed: records.length };
}

// Orders folder resolution (server vs local)
const ORDERS_DIR = process.env.ORDERS_DIR || (process.env.NODE_ENV === 'production' ? '/var/www/orders' : path.join(process.cwd(), 'orders'));

// Register orders routes
const ordersRoutes = require('./routes/ordersRoutes');
app.use('/api', ordersRoutes);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

app.use('/api', suppliersRoutes);

app.post('/api/import/cu', async (req, res) => {
  try {
    const force = String(req.query.force || '').toLowerCase() === '1' || String(req.query.force || '').toLowerCase() === 'true';
    const result = await importOnce({ force });
    const counts = await pool.query(
      'SELECT (SELECT COUNT(*)::int FROM categories) AS categories, (SELECT COUNT(*)::int FROM suppliers) AS suppliers'
    );
    res.json({ ok: true, imported: !result.skipped, rowsParsed: result.rowsParsed, counts: counts.rows[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// Start watcher after server starts
function startOrdersWatcher() {
  const watcher = require('./services/ordersWatcher');
  watcher.watchOrdersFolder(ORDERS_DIR, pool);
}

(async () => {
  try {
    await initDb();
    // при старте делаем авто-импорт только если еще не импортировали
    await importOnce({ force: false });
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Backend listening on http://0.0.0.0:${PORT}`);
      console.log(`📂 Orders directory: ${ORDERS_DIR}`);
      startOrdersWatcher();
    });
  } catch (e) {
    console.error('❌ Startup error:', e);
    process.exit(1);
  }
})();
