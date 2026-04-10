require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const pool = require('./db');
const suppliersRoutes = require('./routes/suppliersRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const authRoutes = require('./routes/authRoutes');
const supplierFormRoutes = require('./routes/supplierFormRoutes');
const oneCRoutes = require('./routes/oneCRoutes');
const { parseSuppliersFromCU } = require('./services/excelImport');
const whatsappService = require('./services/whatsappService');
const orderAnalyzer = require('./services/orderAnalyzer');
const { CATEGORY_MAPPING } = require('./services/categoryMapper');

const app = express();
const PORT = Number(process.env.PORT || 5000);

// CORS
// В проде (docker+nginx) фронт обычно ходит на /api (same-origin) и CORS не требуется,
// но оставляем корректную настройку для прямых запросов (dev/отладка).
const defaultAllowedOrigins = [
  'https://manager.cucrm.kz',
  'http://manager.cucrm.kz',
  'http://82.115.42.79',
  'http://82.115.42.79:8083',
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:8083'
];

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : defaultAllowedOrigins
);

app.use(
  cors({
    origin: (origin, callback) => {
      // non-browser clients (curl/postman) may send no Origin
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.options('*', cors());

app.use(express.json());

async function initDb() {
  // Auth schema (users, refresh_tokens) — must go first
  const authSchemaPath = path.join(__dirname, 'sql', 'auth_schema.sql');
  if (fs.existsSync(authSchemaPath)) {
    const authSql = fs.readFileSync(authSchemaPath, 'utf8');
    await pool.query(authSql);
  } else {
    // Inline fallback — ensure auth tables always exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    `);
  }

  const schemaPath = path.join(__dirname, 'sql', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(sql);

  // Orders schema
  const ordersSchemaPath = path.join(__dirname, 'sql', 'orders_schema.sql');
  if (fs.existsSync(ordersSchemaPath)) {
    const ordersSql = fs.readFileSync(ordersSchemaPath, 'utf8');
    await pool.query(ordersSql);
  }

  // Analysis schema (WhatsApp integration)
  const analysisSchemaPath = path.join(__dirname, 'sql', 'analysis_schema.sql');
  if (fs.existsSync(analysisSchemaPath)) {
    const analysisSql = fs.readFileSync(analysisSchemaPath, 'utf8');
    await pool.query(analysisSql);
  }

  // Extended analytics schema
  const analyticsExtendedSchemaPath = path.join(__dirname, 'sql', 'analytics_extended_schema.sql');
  if (fs.existsSync(analyticsExtendedSchemaPath)) {
    const analyticsExtendedSql = fs.readFileSync(analyticsExtendedSchemaPath, 'utf8');
    await pool.query(analyticsExtendedSql);
  }

  // Internet supplier search cache schema
  const supplierSearchSchemaPath = path.join(__dirname, 'sql', 'supplier_search_schema.sql');
  if (fs.existsSync(supplierSearchSchemaPath)) {
    const supplierSearchSql = fs.readFileSync(supplierSearchSchemaPath, 'utf8');
    await pool.query(supplierSearchSql);
  }

  await pool.query(
    'CREATE TABLE IF NOT EXISTS import_flags (key TEXT PRIMARY KEY, value TEXT, created_at TIMESTAMP DEFAULT NOW())'
  );

  // Stocks table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS stocks (
      id               SERIAL PRIMARY KEY,
      gs_code          TEXT,
      group_name       TEXT,
      name             TEXT NOT NULL,
      contract_company TEXT,
      min_stock        NUMERIC,
      stock_qty        NUMERIC,
      updated_at       TIMESTAMP DEFAULT NOW(),
      CONSTRAINT stocks_name_unique UNIQUE(name)
    );
    CREATE INDEX IF NOT EXISTS idx_stocks_group ON stocks(group_name);
  `);
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

    const phoneDigits = normalizeDigitsPhone(r.phone || '');
    const whatsappDigits = phoneDigits || null;

    await pool.query(
      `INSERT INTO suppliers(name, contact_person, phone, whatsapp, category_id)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (name, phone, category_id) DO UPDATE SET
         contact_person = EXCLUDED.contact_person,
         whatsapp = COALESCE(NULLIF(EXCLUDED.whatsapp, ''), suppliers.whatsapp),
         updated_at = NOW()`,
      [r.supplier, r.contactPerson || null, r.phone || null, whatsappDigits, categoryId]
    );
  }

  await pool.query(
    'INSERT INTO import_flags(key, value) VALUES($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    ['cu_suppliers_imported', new Date().toISOString()]
  );

  return { skipped: false, rowsParsed: records.length };
}

// Orders folder resolution (server vs local)
// Priority:
// 1) ORDERS_DIR env (e.g. "/orders" inside docker)
// 2) ORDERS_DIR_HOST_PATH env (e.g. "/home/ubuntu/testServer/data" on VPS when running without docker)
// 3) default: ./orders (dev)
const ORDERS_DIR =
  process.env.ORDERS_DIR ||
  process.env.ORDERS_DIR_HOST_PATH ||
  (process.env.NODE_ENV === 'production'
    ? '/home/ubuntu/testServer/data'
    : path.join(process.cwd(), 'orders'));

function safeCountJsonFiles(dirPath) {
  try {
    const list = fs.readdirSync(dirPath);
    return list.filter((f) => f.toLowerCase().endsWith('.json')).length;
  } catch {
    return null;
  }
}

// Debug: watcher status
app.get('/api/debug/orders-watcher', (_req, res) => {
  const processedDir = path.join(ORDERS_DIR, 'processed');
  const errorsDir = path.join(ORDERS_DIR, 'errors');

  res.json({
    ok: true,
    orders_dir: ORDERS_DIR,
    exists: fs.existsSync(ORDERS_DIR),
    processed_dir: processedDir,
    errors_dir: errorsDir,
    processed_json_count: safeCountJsonFiles(processedDir),
    errors_json_count: safeCountJsonFiles(errorsDir)
  });
});

// Register orders routes
const ordersRoutes = require('./routes/ordersRoutes');
app.use('/api', ordersRoutes);

// Auth routes
app.use('/api/auth', authRoutes);

// Supplier internet search routes
const supplierSearchRoutes = require('./routes/supplierSearchRoutes');
app.use('/api', supplierSearchRoutes);

// 1C integration routes
app.use('/api', oneCRoutes);

// Register supplier form routes (public)
app.use('/api', supplierFormRoutes);


// Setup WhatsApp webhook
whatsappService.setupWebhook(app, async (from, text, timestamp) => {
  console.log(`📩 Received WhatsApp message from ${from}`);

  try {
    // Find supplier by WhatsApp number
    const supplierResult = await pool.query(
      `SELECT id, name FROM suppliers WHERE whatsapp = $1`,
      [from]
    );

    if (supplierResult.rows.length === 0) {
      console.log(`⚠️ Unknown supplier WhatsApp: ${from}`);
      return;
    }

    const supplier = supplierResult.rows[0];

    // Find active analysis for this supplier
    const analysisResult = await pool.query(
      `SELECT DISTINCT oa.order_id 
       FROM order_analysis oa
       WHERE oa.status = 'in_progress'
       AND EXISTS (
         SELECT 1 FROM suppliers s
         JOIN categories c ON c.id = s.category_id
         WHERE s.id = $1
       )
       ORDER BY oa.started_at DESC
       LIMIT 1`,
      [supplier.id]
    );

    if (analysisResult.rows.length === 0) {
      console.log(`⚠️ No active analysis found for supplier ${supplier.name}`);
      return;
    }

    const orderId = analysisResult.rows[0].order_id;

    // Process the response
    await orderAnalyzer.processResponse(pool, orderId, supplier.id, text);

  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: String(e.message || e),
      code: e.code,
      db_host: process.env.DB_HOST,
      db_user: process.env.DB_USER,
      db_name: process.env.DB_NAME,
    });
  }
});

app.use('/api', suppliersRoutes);
app.use('/api', analyticsRoutes);

try {
  const stocksRoutes = require('./routes/stocksRoutes');
  app.use('/api', stocksRoutes);
  console.log('✅ stocksRoutes loaded');
} catch (e) {
  console.warn('⚠️  stocksRoutes not loaded:', e.message);
}

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

// POST /api/init-test-suppliers - Initialize test suppliers with WhatsApp numbers
app.post('/api/init-test-suppliers', async (req, res) => {
  try {
    console.log('🔄 Initializing test suppliers...');

    // Add categories
    const categories = [
      'Электроника',
      'Канцтовары',
      'Мебель',
      'Строительные материалы',
      'Хозяйственные товары'
    ];

    for (const cat of categories) {
      await pool.query(
        'INSERT INTO categories(name) VALUES($1) ON CONFLICT (name) DO NOTHING',
        [cat]
      );
    }

    // Add test suppliers
    const suppliers = [
      {
        name: 'ТехноПлюс',
        contact: 'Иван Петров',
        phone: '+77011234567',
        whatsapp: '77011234567',
        category: 'Электроника',
        rating: 4.8,
        urgent: true
      },
      {
        name: 'СуперКанц',
        contact: 'Мария Иванова',
        phone: '+77012345678',
        whatsapp: '77012345678',
        category: 'Канцтовары',
        rating: 4.5,
        urgent: true
      },
      {
        name: 'МебельЦентр',
        contact: 'Петр Сидоров',
        phone: '+77013456789',
        whatsapp: '77013456789',
        category: 'Мебель',
        rating: 4.2,
        urgent: false
      },
      {
        name: 'СтройМастер',
        contact: 'Ольга Козлова',
        phone: '+77014567890',
        whatsapp: '77014567890',
        category: 'Строительные материалы',
        rating: 4.6,
        urgent: true
      },
      {
        name: 'ХозТовары Плюс',
        contact: 'Дмитрий Смирнов',
        phone: '+77015678901',
        whatsapp: '77015678901',
        category: 'Хозяйственные товары',
        rating: 4.3,
        urgent: false
      }
    ];

    let added = 0;
    for (const s of suppliers) {
      const catResult = await pool.query(
        'SELECT id FROM categories WHERE name = $1',
        [s.category]
      );

      if (catResult.rows.length > 0) {
        await pool.query(
          `INSERT INTO suppliers (name, contact_person, phone, whatsapp, category_id, rating, can_urgent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (name, phone, category_id) DO UPDATE SET
             whatsapp = EXCLUDED.whatsapp,
             rating = EXCLUDED.rating,
             can_urgent = EXCLUDED.can_urgent`,
          [s.name, s.contact, s.phone, s.whatsapp, catResult.rows[0].id, s.rating, s.urgent]
        );
        added++;
      }
    }

    // Get count
    const count = await pool.query(
      'SELECT COUNT(*)::int as count FROM suppliers WHERE whatsapp IS NOT NULL AND whatsapp != \'\'',
      []
    );

    console.log(`✅ Test suppliers initialized: ${added} suppliers added/updated`);
    res.json({
      ok: true,
      message: 'Test suppliers initialized successfully',
      suppliers_added: added,
      total_with_whatsapp: count.rows[0].count
    });
  } catch (e) {
    console.error('❌ Error initializing test suppliers:', e);
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

// Start watcher after server starts
function startOrdersWatcher() {
  const watcher = require('./services/ordersWatcher');
  watcher.watchOrdersFolder(ORDERS_DIR, pool);
}

function normalizeDigitsPhone(raw) {
  return String(raw || '').replace(/[^\d]/g, '').trim();
}

async function ensureMappedCategoriesExist() {
  // Ensure categories used by category mapper exist in DB
  try {
    const mappedCategoryNames = new Set();
    for (const arr of Object.values(CATEGORY_MAPPING || {})) {
      if (Array.isArray(arr)) arr.forEach((n) => n && mappedCategoryNames.add(String(n)));
    }

    for (const name of mappedCategoryNames) {
      await pool.query('INSERT INTO categories(name) VALUES($1) ON CONFLICT (name) DO NOTHING', [name]);
    }
  } catch (e) {
    console.warn('⚠️ ensureMappedCategoriesExist failed:', String(e.message || e));
  }
}

(async () => {
  // Start HTTP server first so nginx doesn't get 502 during DB init
  await new Promise((resolve) => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Backend listening on http://0.0.0.0:${PORT}`);
      console.log(`📂 Orders directory: ${ORDERS_DIR}`);
      resolve();
    });
  });

  try {
    await initDb();
    console.log('✅ Database initialized');
  } catch (e) {
    console.error('❌ initDb error:', e.message);
    console.error('   code:', e.code, '| detail:', e.detail);
    console.error('   DB_HOST:', process.env.DB_HOST, 'DB_USER:', process.env.DB_USER, 'DB_NAME:', process.env.DB_NAME);
    console.error('   → Backend will keep running but DB queries will fail until the issue is fixed');
    return; // skip importOnce and watcher — DB is not ready
  }

  try {
    await ensureMappedCategoriesExist();
  } catch (e) {
    console.warn('⚠️ ensureMappedCategoriesExist failed:', e.message);
  }

  try {
    await importOnce({ force: false });
  } catch (e) {
    console.warn('⚠️ importOnce failed:', e.message);
  }

  startOrdersWatcher();
})();
