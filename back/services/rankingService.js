// Ranking Service: Calculate scores and find optimal supplier combinations

/**
 * Normalize value to 0-1 range
 * @param {number} value - Current value
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Normalized value (0-1)
 */
function normalize(value, min, max) {
  if (max === min) return 1;
  return (value - min) / (max - min);
}

/**
 * Calculate score for a supplier response
 * @param {Object} response - Supplier response with price, delivery_days, rating, quantity
 * @param {Object} context - Context with min/max values and isUrgent flag
 * @returns {number} Score (0-1)
 */
function calculateScore(response, context) {
  const { minPrice, maxPrice, minDays, maxDays, isUrgent, requestedQty } = context;

  // Normalize values (lower is better for price and days)
  const normalizedPrice = maxPrice > minPrice ? 1 - normalize(response.price, minPrice, maxPrice) : 1;
  const normalizedTime = maxDays > minDays ? 1 - normalize(response.delivery_days, minDays, maxDays) : 1;
  const normalizedRating = response.rating / 5; // Rating is 0-5

  // Quantity match: 1 if can fulfill completely, proportional if partial
  const quantityMatch = requestedQty > 0
    ? Math.min(1, response.quantity_available / requestedQty)
    : 1;

  // Different weights for urgent vs normal orders
  let weights;
  if (isUrgent) {
    weights = {
      price: 0.2,
      time: 0.5,
      rating: 0.2,
      quantity: 0.1
    };
  } else {
    weights = {
      price: 0.4,
      time: 0.3,
      rating: 0.2,
      quantity: 0.1
    };
  }

  const score =
    normalizedPrice * weights.price +
    normalizedTime * weights.time +
    normalizedRating * weights.rating +
    quantityMatch * weights.quantity;

  return Math.round(score * 1000) / 1000; // Round to 3 decimals
}

/**
 * Get best offers for an order
 * @param {Object} pool - Database pool
 * @param {string} orderId - Order ID
 * @param {number} limit - Maximum number of offers to return
 * @returns {Promise<Array>} Array of best offers with scores
 */
async function getBestOffers(pool, orderId, limit = 10) {
  // Get order details
  const orderResult = await pool.query(
    `SELECT order_id, fast, items FROM orders WHERE order_id = $1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    throw new Error('Order not found');
  }

  const order = orderResult.rows[0];
  const isUrgent = order.fast === 'yes';

  // Get all responses for this order
  const responsesResult = await pool.query(
    `SELECT 
       sr.id,
       sr.order_id,
       sr.supplier_id,
       sr.item_name,
       sr.price,
       sr.quantity_available,
       sr.delivery_days,
       sr.response_time,
       s.name as supplier_name,
       s.rating,
       s.can_urgent,
       c.name as category_name
     FROM supplier_responses sr
     JOIN suppliers s ON s.id = sr.supplier_id
     LEFT JOIN categories c ON c.id = s.category_id
     WHERE sr.order_id = $1
     ORDER BY sr.supplier_id, sr.item_name`,
    [orderId]
  );

  if (responsesResult.rows.length === 0) {
    return [];
  }

  // Group responses by supplier
  const supplierResponses = new Map();

  for (const row of responsesResult.rows) {
    if (!supplierResponses.has(row.supplier_id)) {
      supplierResponses.set(row.supplier_id, {
        supplier_id: row.supplier_id,
        supplier_name: row.supplier_name,
        rating: parseFloat(row.rating) || 0,
        can_urgent: row.can_urgent,
        category_name: row.category_name,
        items: []
      });
    }

    supplierResponses.get(row.supplier_id).items.push({
      item_name: row.item_name,
      price: parseFloat(row.price),
      quantity_available: row.quantity_available,
      delivery_days: row.delivery_days,
      response_time: row.response_time
    });
  }

  // Calculate min/max for normalization
  const allItems = responsesResult.rows;
  const prices = allItems.map(r => parseFloat(r.price));
  const days = allItems.map(r => r.delivery_days);

  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDays = Math.min(...days);
  const maxDays = Math.max(...days);

  // Calculate scores for each supplier
  const offers = [];

  for (const [supplierId, data] of supplierResponses.entries()) {
    // Calculate average score across all items
    let totalScore = 0;
    let totalPrice = 0;
    let maxDeliveryDays = 0;

    for (const item of data.items) {
      // Find requested quantity from order
      const orderItem = order.items?.find(oi =>
        oi.tovar?.toLowerCase().includes(item.item_name.toLowerCase()) ||
        item.item_name.toLowerCase().includes(oi.tovar?.toLowerCase())
      );

      const requestedQty = orderItem?.qty || 1;

      const score = calculateScore(
        {
          price: item.price,
          delivery_days: item.delivery_days,
          rating: data.rating,
          quantity_available: item.quantity_available
        },
        {
          minPrice,
          maxPrice,
          minDays,
          maxDays,
          isUrgent,
          requestedQty
        }
      );

      totalScore += score;
      totalPrice += item.price * Math.min(item.quantity_available, requestedQty);
      maxDeliveryDays = Math.max(maxDeliveryDays, item.delivery_days);
    }

    const avgScore = data.items.length > 0 ? totalScore / data.items.length : 0;

    offers.push({
      supplier_id: supplierId,
      supplier_name: data.supplier_name,
      rating: data.rating,
      can_urgent: data.can_urgent,
      category_name: data.category_name,
      items: data.items,
      total_price: Math.round(totalPrice * 100) / 100,
      max_delivery_days: maxDeliveryDays,
      score: avgScore,
      items_count: data.items.length
    });
  }

  // Sort by score descending
  offers.sort((a, b) => b.score - a.score);

  return offers.slice(0, limit);
}

/**
 * Get optimal combination of suppliers to fulfill order
 * Uses greedy algorithm to minimize cost while covering all items
 * @param {Object} pool - Database pool
 * @param {string} orderId - Order ID
 * @returns {Promise<Object>} Optimal combination
 */
async function getOptimalCombination(pool, orderId) {
  // Get order details
  const orderResult = await pool.query(
    `SELECT order_id, fast, items FROM orders WHERE order_id = $1`,
    [orderId]
  );

  if (orderResult.rows.length === 0) {
    throw new Error('Order not found');
  }

  const order = orderResult.rows[0];
  const orderItems = order.items || [];

  // Get all responses
  const responsesResult = await pool.query(
    `SELECT 
       sr.*,
       s.name as supplier_name,
       s.rating,
       s.can_urgent
     FROM supplier_responses sr
     JOIN suppliers s ON s.id = sr.supplier_id
     WHERE sr.order_id = $1`,
    [orderId]
  );

  if (responsesResult.rows.length === 0) {
    return {
      suppliers: [],
      grand_total: 0,
      max_delivery_days: 0,
      coverage: 0,
      message: 'No supplier responses available'
    };
  }

  // Clear previous optimal combination
  await pool.query(
    `DELETE FROM order_supplier_items WHERE order_id = $1`,
    [orderId]
  );

  // Map order items to required quantities
  const requiredItems = new Map();
  for (const item of orderItems) {
    const itemName = item.tovar?.toLowerCase() || '';
    requiredItems.set(itemName, {
      name: item.tovar,
      qty: parseInt(item.qty) || 0,
      remaining: parseInt(item.qty) || 0
    });
  }

  // Group responses by item name
  const responsesByItem = new Map();

  for (const response of responsesResult.rows) {
    const itemName = response.item_name.toLowerCase();

    if (!responsesByItem.has(itemName)) {
      responsesByItem.set(itemName, []);
    }

    responsesByItem.get(itemName).push({
      supplier_id: response.supplier_id,
      supplier_name: response.supplier_name,
      rating: parseFloat(response.rating) || 0,
      can_urgent: response.can_urgent,
      item_name: response.item_name,
      price: parseFloat(response.price),
      quantity_available: response.quantity_available,
      delivery_days: response.delivery_days
    });
  }

  const allocation = [];
  let grandTotal = 0;
  let maxDeliveryDays = 0;

  // Greedy algorithm: for each item, select best price until quantity is met
  for (const [itemKey, itemData] of requiredItems.entries()) {
    const responses = responsesByItem.get(itemKey) || [];

    // Find matching responses (fuzzy match)
    const matchingResponses = [];
    for (const [key, resps] of responsesByItem.entries()) {
      if (key.includes(itemKey) || itemKey.includes(key)) {
        matchingResponses.push(...resps);
      }
    }

    if (matchingResponses.length === 0) continue;

    // Sort by price per unit (ascending)
    matchingResponses.sort((a, b) => a.price - b.price);

    let remaining = itemData.remaining;

    for (const response of matchingResponses) {
      if (remaining <= 0) break;

      const allocatedQty = Math.min(remaining, response.quantity_available);
      const itemTotal = allocatedQty * response.price;

      allocation.push({
        supplier_id: response.supplier_id,
        supplier_name: response.supplier_name,
        rating: response.rating,
        can_urgent: response.can_urgent,
        item_name: response.item_name,
        quantity_allocated: allocatedQty,
        price_per_unit: response.price,
        total_price: itemTotal,
        delivery_days: response.delivery_days
      });

      grandTotal += itemTotal;
      maxDeliveryDays = Math.max(maxDeliveryDays, response.delivery_days);
      remaining -= allocatedQty;

      // Save to database
      await pool.query(
        `INSERT INTO order_supplier_items (order_id, supplier_id, item_name, quantity_allocated, price, delivery_days, score)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [orderId, response.supplier_id, response.item_name, allocatedQty, response.price, response.delivery_days, 0]
      );
    }

    itemData.remaining = remaining;
  }

  // Group by supplier for display
  const supplierGroups = new Map();

  for (const item of allocation) {
    if (!supplierGroups.has(item.supplier_id)) {
      supplierGroups.set(item.supplier_id, {
        supplier_id: item.supplier_id,
        supplier_name: item.supplier_name,
        rating: item.rating,
        can_urgent: item.can_urgent,
        items: [],
        total: 0,
        max_delivery_days: 0
      });
    }

    const group = supplierGroups.get(item.supplier_id);
    group.items.push({
      item_name: item.item_name,
      quantity: item.quantity_allocated,
      price_per_unit: item.price_per_unit,
      total: item.total_price,
      delivery_days: item.delivery_days
    });
    group.total += item.total_price;
    group.max_delivery_days = Math.max(group.max_delivery_days, item.delivery_days);
  }

  // Calculate coverage
  let totalRequired = 0;
  let totalCovered = 0;
  for (const itemData of requiredItems.values()) {
    totalRequired += itemData.qty;
    totalCovered += (itemData.qty - itemData.remaining);
  }

  const coverage = totalRequired > 0 ? Math.round((totalCovered / totalRequired) * 100) : 0;

  return {
    suppliers: Array.from(supplierGroups.values()),
    grand_total: Math.round(grandTotal * 100) / 100,
    max_delivery_days: maxDeliveryDays,
    coverage: coverage,
    items_covered: totalCovered,
    items_required: totalRequired
  };
}

module.exports = {
  calculateScore,
  getBestOffers,
  getOptimalCombination
};

