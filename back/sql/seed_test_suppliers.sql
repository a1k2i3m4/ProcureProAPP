-- Seed test suppliers with WhatsApp numbers for testing analysis feature

-- First, ensure we have categories
INSERT INTO categories (name) VALUES
  ('Электроника'),
  ('Канцтовары'),
  ('Мебель'),
  ('Строительные материалы'),
  ('Хозяйственные товары')
ON CONFLICT (name) DO NOTHING;

-- Add test suppliers with WhatsApp numbers (using test number from WhatsApp API)
INSERT INTO suppliers (name, contact_person, phone, whatsapp, category_id, rating, can_urgent)
VALUES
  ('ТехноПлюс', 'Иван Петров', '+77011234567', '77011234567',
   (SELECT id FROM categories WHERE name = 'Электроника' LIMIT 1), 4.8, true),

  ('СуперКанц', 'Мария Иванова', '+77012345678', '77012345678',
   (SELECT id FROM categories WHERE name = 'Канцтовары' LIMIT 1), 4.5, true),

  ('МебельЦентр', 'Петр Сидоров', '+77013456789', '77013456789',
   (SELECT id FROM categories WHERE name = 'Мебель' LIMIT 1), 4.2, false),

  ('СтройМастер', 'Ольга Козлова', '+77014567890', '77014567890',
   (SELECT id FROM categories WHERE name = 'Строительные материалы' LIMIT 1), 4.6, true),

  ('ХозТовары Плюс', 'Дмитрий Смирнов', '+77015678901', '77015678901',
   (SELECT id FROM categories WHERE name = 'Хозяйственные товары' LIMIT 1), 4.3, false)
ON CONFLICT (name, phone, category_id) DO UPDATE SET
  whatsapp = EXCLUDED.whatsapp,
  rating = EXCLUDED.rating,
  can_urgent = EXCLUDED.can_urgent;

-- Verify
SELECT
  s.id,
  s.name,
  s.contact_person,
  s.whatsapp,
  s.rating,
  s.can_urgent,
  c.name as category
FROM suppliers s
LEFT JOIN categories c ON c.id = s.category_id
WHERE s.whatsapp IS NOT NULL
ORDER BY s.rating DESC;

