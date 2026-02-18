// Script to initialize test data for WhatsApp analysis feature
const pool = require('../db');

async function initTestData() {
  try {
    console.log('🔄 Initializing test data...');

    // Add categories
    console.log('📁 Creating categories...');
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

    // Add test suppliers with WhatsApp
    console.log('👥 Creating test suppliers...');
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
      }
    }

    // Verify
    const result = await pool.query(
      `SELECT 
         s.id,
         s.name,
         s.whatsapp,
         s.rating,
         s.can_urgent,
         c.name as category
       FROM suppliers s
       LEFT JOIN categories c ON c.id = s.category_id
       WHERE s.whatsapp IS NOT NULL
       ORDER BY s.rating DESC`
    );

    console.log('✅ Test data initialized successfully!');
    console.log(`📊 Created ${result.rows.length} suppliers with WhatsApp:`);
    result.rows.forEach(r => {
      console.log(`   - ${r.name} (${r.category}) - ${r.whatsapp} - ⭐${r.rating}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing test data:', error);
    process.exit(1);
  }
}

initTestData();

