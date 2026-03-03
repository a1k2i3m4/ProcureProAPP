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
  'Офисные принадлежности': ['Канцелярские товары', 'Канцтовары'],

  // Бытовая химия
  'Моющие средства': ['Бытовая химия', 'Моющие средства', 'Чистящие средства'],
  'Чистящие средства': ['Бытовая химия', 'Чистящие средства', 'Моющие средства'],
  'Бытовая химия': ['Бытовая химия'],

  // Продукты питания
  'Продукты питания': ['Продукты питания'],
  'Напитки': ['Продукты питания', 'Напитки'],
  'Продукты': ['Продукты питания'],

  // Строительные материалы
  'Строительные материалы': ['Строительные материалы'],
  'Стройматериалы': ['Строительные материалы'],

  // Мебель
  'Мебель': ['Мебель'],
  'Офисная мебель': ['Мебель'],

  // Электроника
  'Электроника': ['Электроника'],
  'Оргтехника': ['Электроника'],
  'Компьютеры': ['Электроника'],

  // Другие категории
  'Расходные материалы': ['Расходные материалы', 'Хозяйственные товары'],
  'Общее': ['Хозяйственные товары', 'Канцелярские товары', 'Бытовая химия']
};

// Маппинг по ключевым словам из НАЗВАНИЯ товара (tovar)
// Используется как fallback когда specific не совпал с CATEGORY_MAPPING
const KEYWORD_MAPPING = [
  {
    keywords: ['бумага', 'ручк', 'карандаш', 'папк', 'скотч', 'маркер', 'скрепк', 'степлер',
               'файл', 'блокнот', 'тетрадь', 'конверт', 'ножниц', 'линейк', 'калькулятор',
               'флипчарт', 'доска', 'корректор', 'дырокол', 'лоток', 'подставк'],
    categories: ['Канцтовары']
  },
  {
    keywords: ['мешок', 'ведро', 'швабр', 'тряпк', 'перчатк', 'мыло', 'салфетк', 'туалетн',
               'освежитель', 'дезинфек', 'щётк', 'щетк', 'совок', 'пакет для мусора', 'уборк'],
    categories: ['Хозяйственные товары']
  },
  {
    keywords: ['чистящ', 'моющ', 'порошок', 'гель для', 'отбелив', 'средство для мыть',
               'fairy', 'domestos', 'cif', 'sanitizer', 'антисептик'],
    categories: ['Бытовая химия']
  },
  {
    keywords: ['картридж', 'тонер', 'принтер', 'сканер', 'компьютер', 'ноутбук', 'мышь',
               'клавиатур', 'монитор', 'кабель', 'usb', 'флешк', 'аккумулятор', 'батарейк',
               'удлинитель', 'лампочк', 'лампа', 'розетк', 'зарядк'],
    categories: ['Электроника']
  },
  {
    keywords: ['стол', 'стул', 'шкаф', 'полк', 'диван', 'кресло', 'тумб', 'стеллаж', 'вешалк'],
    categories: ['Мебель']
  },
  {
    keywords: ['цемент', 'кирпич', 'плитк', 'краск', 'грунтовк', 'обои', 'ламинат',
               'линолеум', 'гипсокартон', 'профиль', 'шуруп', 'гвоздь', 'болт', 'дрель', 'перфоратор'],
    categories: ['Строительные материалы']
  },
  {
    keywords: ['чай', 'кофе', 'сахар', 'печень', 'конфет', 'вода питьев', 'сок',
               'хлеб', 'молоко', 'масло', 'крупа', 'макарон'],
    categories: ['Продукты питания']
  },
];

/**
 * Maps items from order to category names.
 * Strategy:
 *   1. Try exact match on item.specific in CATEGORY_MAPPING
 *   2. Try partial match on item.specific in CATEGORY_MAPPING
 *   3. Try keyword match on item.tovar (product name) via KEYWORD_MAPPING
 *   4. Fallback: use item.specific as-is so DB lookup may still find something
 * @param {Array} items - Array of order items with 'specific' and 'tovar' fields
 * @returns {Set<string>} Set of category names
 */
function mapItemsToCategories(items) {
  const categoryNames = new Set();

  if (!Array.isArray(items) || items.length === 0) {
    return categoryNames;
  }

  for (const item of items) {
    const specific = String(item.specific || '').trim();
    const tovar    = String(item.tovar || item.name || '').trim().toLowerCase();
    const itemCats = new Set();

    // 1. Exact match on specific
    if (specific && CATEGORY_MAPPING[specific]) {
      CATEGORY_MAPPING[specific].forEach(cat => itemCats.add(cat));
    }

    // 2. Partial match on specific
    if (itemCats.size === 0 && specific) {
      const lowerSpecific = specific.toLowerCase();
      for (const [key, categories] of Object.entries(CATEGORY_MAPPING)) {
        if (lowerSpecific.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerSpecific)) {
          categories.forEach(cat => itemCats.add(cat));
        }
      }
    }

    // 3. Keyword match on tovar (product name) — main fallback
    if (itemCats.size === 0 && tovar) {
      for (const { keywords, categories } of KEYWORD_MAPPING) {
        if (keywords.some(kw => tovar.includes(kw.toLowerCase()))) {
          categories.forEach(cat => itemCats.add(cat));
        }
      }
    }

    // 4. Last resort: use specific value itself so DB ILIKE may still find a category
    if (itemCats.size === 0 && specific) {
      itemCats.add(specific);
    }

    itemCats.forEach(cat => categoryNames.add(cat));
  }

  console.log('[CategoryMapper] mapped categories:', Array.from(categoryNames));
  return categoryNames;
}

/**
 * Gets category IDs from database based on category names (exact + ILIKE fallback)
 * @param {Object} pool - Database pool
 * @param {Set<string>} categoryNames - Set of category names
 * @returns {Promise<Array<number>>} Array of category IDs
 */
async function getCategoryIds(pool, categoryNames) {
  if (categoryNames.size === 0) {
    return [];
  }

  const namesArray = Array.from(categoryNames);

  // First try exact match
  const exactResult = await pool.query(
    `SELECT id FROM categories WHERE name = ANY($1::text[])`,
    [namesArray]
  );

  if (exactResult.rows.length > 0) {
    return exactResult.rows.map(row => row.id);
  }

  // Fallback: ILIKE partial match for each name
  const ids = new Set();
  for (const name of namesArray) {
    const likeResult = await pool.query(
      `SELECT id FROM categories WHERE name ILIKE $1`,
      [`%${name}%`]
    );
    likeResult.rows.forEach(row => ids.add(row.id));
  }

  console.log('[CategoryMapper] getCategoryIds result:', Array.from(ids));
  return Array.from(ids);
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

