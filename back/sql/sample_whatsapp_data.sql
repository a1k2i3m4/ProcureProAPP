-- Sample data for testing WhatsApp integration
-- Add WhatsApp numbers, ratings, and urgent capability to existing suppliers

-- Update some suppliers with WhatsApp data
UPDATE suppliers SET
  whatsapp = '77011234567',
  rating = 4.8,
  can_urgent = true
WHERE name LIKE '%Казхимторг%';

UPDATE suppliers SET
  whatsapp = '77012345678',
  rating = 4.5,
  can_urgent = true
WHERE name LIKE '%Чистота%';

UPDATE suppliers SET
  whatsapp = '77013456789',
  rating = 4.2,
  can_urgent = false
WHERE name LIKE '%МегаОпт%';

-- For testing, you can use the test number provided
-- UPDATE suppliers SET whatsapp = '15551466344' WHERE id = 1;

-- Verify updates
SELECT
  s.id,
  s.name,
  s.whatsapp,
  s.rating,
  s.can_urgent,
  c.name as category
FROM suppliers s
LEFT JOIN categories c ON c.id = s.category_id
WHERE s.whatsapp IS NOT NULL
ORDER BY s.rating DESC;

