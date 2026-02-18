-- Orders table for 1C JSON ingestion
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL, -- Id from 1C
  fast TEXT CHECK (fast IN ('yes','no')),
  items JSONB NOT NULL,
  items_count INT NOT NULL DEFAULT 0,
  source_file TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  imported_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_items_gin ON orders USING GIN(items);
