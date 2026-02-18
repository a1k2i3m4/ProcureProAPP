const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');

/**
 * Парсит Excel "Список поставщиков_CU.xlsx" (лист "Поставщик_Усл.")
 * Формат в файле (по заголовкам):
 *  - Тригер
 *  - Поставщик
 *  - Контактный телефон
 *  - Контактное лицо
 */
function parseSuppliersFromCU(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel файл не найден: ${filePath}`);
  }

  const workbook = xlsx.readFile(filePath);
  const sheet =
    workbook.Sheets['Поставщик_Усл.'] ||
    workbook.Sheets['Поставщик_Усл'] ||
    workbook.Sheets['Поставщик_Усл_'] ||
    workbook.Sheets[workbook.SheetNames[0]];

  // Считываем как матрицу, чтобы не зависеть от странных пробелов в заголовках
  const matrix = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  if (!Array.isArray(matrix) || matrix.length === 0) return [];

  // Ищем строку заголовков (ту, где есть "Тригер" и "Поставщик")
  const headerRowIndex = matrix.findIndex((row) =>
    Array.isArray(row) && row.some((c) => String(c).trim() === 'Тригер')
  );
  const headerRow = headerRowIndex >= 0 ? matrix[headerRowIndex] : matrix[0];

  const idx = (name) => headerRow.findIndex((c) => String(c).trim() === name);
  const triggerIdx = idx('Тригер');
  const supplierIdx = idx('Поставщик');
  const phoneIdx = idx('Контактный телефон');
  const contactIdx = idx('Контактное лицо');

  if (triggerIdx < 0 || supplierIdx < 0) {
    throw new Error('Не найдены колонки "Тригер"/"Поставщик" в листе Excel');
  }

  const start = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;

  return matrix
    .slice(start)
    .map((row) => {
      const category = String(row?.[triggerIdx] ?? '').trim();
      const supplier = String(row?.[supplierIdx] ?? '').trim();
      const phone = phoneIdx >= 0 ? String(row?.[phoneIdx] ?? '').trim() : '';
      const contactPerson = contactIdx >= 0 ? String(row?.[contactIdx] ?? '').trim() : '';

      return { category, supplier, phone, contactPerson };
    })
    .filter((r) => r.category && r.supplier);
}

module.exports = { parseSuppliersFromCU };
