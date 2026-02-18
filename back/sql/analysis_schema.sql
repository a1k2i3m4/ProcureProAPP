-- Analysis Schema: Extend database for order analysis with WhatsApp integration

-- Extend suppliers table with WhatsApp and rating fields
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS can_urgent BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_suppliers_can_urgent ON suppliers(can_urgent) WHERE can_urgent = true;
CREATE INDEX IF NOT EXISTS idx_suppliers_whatsapp ON suppliers(whatsapp) WHERE whatsapp IS NOT NULL;

-- Order analysis tracking (one analysis per order)
CREATE TABLE IF NOT EXISTS order_analysis (
  id SERIAL PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'timeout', 'cancelled')),
  started_at TIMESTAMP NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP,
  timeout_at TIMESTAMP NOT NULL,
  timeout_minutes INT NOT NULL DEFAULT 30,
  suppliers_contacted INT NOT NULL DEFAULT 0,
  responses_received INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_analysis_order_id ON order_analysis(order_id);
CREATE INDEX IF NOT EXISTS idx_order_analysis_status ON order_analysis(status);

-- Supplier responses to orders
CREATE TABLE IF NOT EXISTS supplier_responses (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  supplier_id INT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  quantity_available INT NOT NULL,
  delivery_days INT NOT NULL,
  response_time TIMESTAMP NOT NULL DEFAULT NOW(),
  raw_message TEXT,
  UNIQUE(order_id, supplier_id, item_name)
);

CREATE INDEX IF NOT EXISTS idx_supplier_responses_order_id ON supplier_responses(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_responses_supplier_id ON supplier_responses(supplier_id);

-- Optimal combination of suppliers for order items
CREATE TABLE IF NOT EXISTS order_supplier_items (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  supplier_id INT NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity_allocated INT NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  delivery_days INT NOT NULL,
  score DECIMAL(5,3) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(order_id, supplier_id, item_name)
);

CREATE INDEX IF NOT EXISTS idx_order_supplier_items_order_id ON order_supplier_items(order_id);

-- Analysis errors log
CREATE TABLE IF NOT EXISTS analysis_errors (
  id SERIAL PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  supplier_id INT REFERENCES suppliers(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('whatsapp_send', 'response_parse', 'supplier_match', 'timeout', 'other')),
  error_message TEXT NOT NULL,
  stack_trace TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analysis_errors_order_id ON analysis_errors(order_id);
CREATE INDEX IF NOT EXISTS idx_analysis_errors_created_at ON analysis_errors(created_at);

