// Category Mapper: Maps item specifics to category names for supplier matching

// Mapping from item.specific strings to category names in DB
const CATEGORY_MAPPING = {
  // Хозяйственные товары
  'Расходники хоз.': ['Хозяйственные товары', 'Расходные материалы'],
  'Хозяйственные товары': ['Хозяйственные товары'],
  'Инвентарь': ['Хозяйственные товары', 'Инвентарь'],

  // Канцелярские товары
  'Канцелярские товары': ['Канцелярские товары', 'Канцтовары'],
  'Канцтовары': ['Канцелярские товары', 'Канцтовары'],
  'Офисные принадлежности': ['Канцелярские товары'],

  // Бытовая химия
  'Моющие средства': ['Бытовая химия', 'Моющие средства', 'Чистящие средства'],
  'Чистящие средства': ['Бытовая химия', 'Чистящие средства', 'Моющие средства'],
  'Бытовая химия': ['Бытовая химия'],

  // Продукты питания
  'Продукты питания': ['Продукты питания'],
  'Напитки': ['Продукты питания', 'Напитки'],
  'Продукты': ['Продукты питания'],

  // Другие категории
  'Расходные материалы': ['Расходные материалы', 'Хозяйственные товары'],
  'Общее': ['Хозяйственные товары', 'Канцелярские товары', 'Бытовая химия']
};

/**
 * Maps items from order to category names
 * @param {Array} items - Array of order items with 'specific' field
 * @returns {Set<string>} Set of category names
 */
function mapItemsToCategories(items) {
  const categoryNames = new Set();

  if (!Array.isArray(items) || items.length === 0) {
    return categoryNames;
  }

  for (const item of items) {
    const specific = String(item.specific || '').trim();

    if (!specific) continue;

    // Try exact match first
    if (CATEGORY_MAPPING[specific]) {
      CATEGORY_MAPPING[specific].forEach(cat => categoryNames.add(cat));
    } else {
      // Try partial match
      const lowerSpecific = specific.toLowerCase();
      for (const [key, categories] of Object.entries(CATEGORY_MAPPING)) {
        if (lowerSpecific.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerSpecific)) {
          categories.forEach(cat => categoryNames.add(cat));
        }
      }

      // If no match found, add the specific itself as potential category
      if (categoryNames.size === 0) {
        categoryNames.add(specific);
      }
    }
  }

  return categoryNames;
}

/**
 * Gets category IDs from database based on category names
 * @param {Object} pool - Database pool
 * @param {Set<string>} categoryNames - Set of category names
 * @returns {Promise<Array<number>>} Array of category IDs
 */
async function getCategoryIds(pool, categoryNames) {
  if (categoryNames.size === 0) {
    return [];
  }

  const namesArray = Array.from(categoryNames);
  const placeholders = namesArray.map((_, i) => `$${i + 1}`).join(',');

  const query = `
    SELECT id FROM categories 
    WHERE name = ANY($1::text[])
  `;

  const result = await pool.query(query, [namesArray]);
  return result.rows.map(row => row.id);
}

/**
 * Full mapping: from order items to category IDs
 * @param {Object} pool - Database pool
 * @param {Array} items - Order items
 * @returns {Promise<Array<number>>} Array of category IDs
 */
async function mapItemsToCategoryIds(pool, items) {
  const categoryNames = mapItemsToCategories(items);
  return await getCategoryIds(pool, categoryNames);
}

module.exports = {
  mapItemsToCategories,
  getCategoryIds,
  mapItemsToCategoryIds,
  CATEGORY_MAPPING
};

