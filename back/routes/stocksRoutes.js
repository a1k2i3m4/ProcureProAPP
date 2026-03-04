'use strict';
const express = require('express');
const pool = require('../db');
const multer = require('multer');
const xlsx = require('xlsx');
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
router.get('/stocks', async (_req, res) => {
  try {
    const q = await pool.query('SELECT id,gs_code,group_name,name,contract_company,min_stock,stock_qty,updated_at FROM stocks ORDER BY group_name,name');
    res.json(q.rows);
  } catch (e) { res.status(500).json({ message: String(e.message) }); }
});
router.post('/stocks', async (req, res) => {
  try {
    const { gs_code, group_name, name, contract_company, min_stock, stock_qty } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: 'name обязателен' });
    const q = await pool.query(
      'INSERT INTO stocks(gs_code,group_name,name,contract_company,min_stock,stock_qty) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',
      [gs_code||null, group_name||null, name.trim(), contract_company||null,
       min_stock!=null?Number(min_stock):null, stock_qty!=null?Number(stock_qty):null]
    );
    res.status(201).json(q.rows[0]);
  } catch (e) { res.status(500).json({ message: String(e.message) }); }
});
router.put('/stocks/:id', async (req, res) => {
  try {
    const { stock_qty, min_stock } = req.body;
    const q = await pool.query(
      'UPDATE stocks SET stock_qty=$1,min_stock=$2,updated_at=NOW() WHERE id=$3 RETURNING *',
      [stock_qty!=null?Number(stock_qty):null, min_stock!=null?Number(min_stock):null, req.params.id]
    );
    if (!q.rows.length) return res.status(404).json({ message: 'Не найден' });
    res.json(q.rows[0]);
  } catch (e) { res.status(500).json({ message: String(e.message) }); }
});
router.delete('/stocks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM stocks WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: String(e.message) }); }
});
router.post('/stocks/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];

    // Читаем как матрицу, чтобы найти строку с заголовками
    const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    console.log('[IMPORT] Total raw rows:', matrix.length);
    if (matrix.length > 0) console.log('[IMPORT] First row:', JSON.stringify(matrix[0]));
    if (matrix.length > 1) console.log('[IMPORT] Second row:', JSON.stringify(matrix[1]));

    // Ищем строку заголовков — ту, где есть "Наименование"
    let headerIdx = -1;
    for (let i = 0; i < Math.min(matrix.length, 10); i++) {
      const row = matrix[i];
      if (Array.isArray(row) && row.some(c => String(c).trim().toLowerCase().includes('наименование'))) {
        headerIdx = i;
        break;
      }
    }
    // Если не нашли "Наименование", пробуем "name" или "название"
    if (headerIdx < 0) {
      for (let i = 0; i < Math.min(matrix.length, 10); i++) {
        const row = matrix[i];
        if (Array.isArray(row) && row.some(c => {
          const s = String(c).trim().toLowerCase();
          return s === 'name' || s === 'название';
        })) {
          headerIdx = i;
          break;
        }
      }
    }

    console.log('[IMPORT] Header row index:', headerIdx);
    if (headerIdx < 0) {
      // Fallback: используем первую строку как заголовки
      headerIdx = 0;
    }

    const headerRow = matrix[headerIdx].map(c => String(c).trim());
    console.log('[IMPORT] Header columns:', JSON.stringify(headerRow));

    // Ищем индексы нужных колонок
    const findCol = (variants) => {
      for (const v of variants) {
        const idx = headerRow.findIndex(h => h.toLowerCase().includes(v.toLowerCase()));
        if (idx >= 0) return idx;
      }
      return -1;
    };

    const nameIdx = findCol(['Наименование', 'название', 'name']);
    const codeIdx = findCol(['Код продукта', 'gs_code', 'code', 'штрих']);
    const groupIdx = findCol(['Группа', 'group']);
    const contractIdx = findCol(['Договор', 'contract']);
    const minStockIdx = findCol(['МЗП', 'min_stock']);
    const stockIdx = findCol(['Остаток', 'stock', 'quantity', 'кол-во']);

    console.log('[IMPORT] Column indices — name:', nameIdx, 'code:', codeIdx, 'group:', groupIdx, 'contract:', contractIdx, 'minStock:', minStockIdx, 'stock:', stockIdx);

    if (nameIdx < 0) {
      return res.status(400).json({ message: 'Не найдена колонка "Наименование" в файле. Колонки: ' + headerRow.join(', ') });
    }

    const parseNum = v => {
      if (v === '' || v == null) return null;
      const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
      return isNaN(n) ? null : n;
    };

    let imported = 0;
    let skipped = 0;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const dataRows = matrix.slice(headerIdx + 1);
      console.log('[IMPORT] Data rows to process:', dataRows.length);

      for (const row of dataRows) {
        if (!Array.isArray(row)) { skipped++; continue; }
        const name = String(row[nameIdx] || '').trim();
        if (!name) { skipped++; continue; }

        const gs_code = codeIdx >= 0 ? String(row[codeIdx] || '').trim() || null : null;
        const group_name = groupIdx >= 0 ? String(row[groupIdx] || '').trim() || null : null;
        const contract = contractIdx >= 0 ? String(row[contractIdx] || '').trim() || null : null;
        const min_stock = minStockIdx >= 0 ? parseNum(row[minStockIdx]) : null;
        const stock_qty = stockIdx >= 0 ? parseNum(row[stockIdx]) : null;

        await client.query(
          `INSERT INTO stocks(gs_code,group_name,name,contract_company,min_stock,stock_qty,updated_at) VALUES($1,$2,$3,$4,$5,$6,NOW())
           ON CONFLICT(name) DO UPDATE SET gs_code=EXCLUDED.gs_code,group_name=EXCLUDED.group_name,contract_company=EXCLUDED.contract_company,min_stock=EXCLUDED.min_stock,stock_qty=EXCLUDED.stock_qty,updated_at=NOW()`,
          [gs_code, group_name, name, contract, min_stock, stock_qty]
        );
        imported++;
      }
      await client.query('COMMIT');
    } catch(e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
    console.log('[IMPORT] Done — imported:', imported, 'skipped:', skipped);
    res.json({ ok: true, imported });
  } catch (e) {
    console.error('[IMPORT] Error:', e.message);
    res.status(500).json({ message: String(e.message) });
  }
});
module.exports = router;
