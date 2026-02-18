-- Обновление схемы анализов для расширенной функциональности
ALTER TABLE order_analysis
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS timeout_minutes INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS is_urgent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Таблица для логирования ошибок анализа
CREATE TABLE IF NOT EXISTS analysis_errors (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  error_type VARCHAR(50) NOT NULL, -- 'whatsapp_send', 'whatsapp_parse', 'timeout', etc.
  error_message TEXT NOT NULL,
  error_details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица для отслеживания статуса отправки сообщений поставщикам
CREATE TABLE IF NOT EXISTS supplier_messages (
  id SERIAL PRIMARY KEY,
  analysis_id INTEGER REFERENCES order_analysis(id) ON DELETE CASCADE,
  supplier_id INTEGER REFERENCES suppliers(id),
  message_type VARCHAR(20) DEFAULT 'order_request', -- 'order_request', 'reminder'
  whatsapp_message_id VARCHAR(100),
  status VARCHAR(20) DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  response_received_at TIMESTAMP,
  response_content TEXT
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_analysis_errors_order_id ON analysis_errors(order_id);
CREATE INDEX IF NOT EXISTS idx_supplier_messages_analysis_id ON supplier_messages(analysis_id);
CREATE INDEX IF NOT EXISTS idx_order_analysis_status ON order_analysis(status);
CREATE INDEX IF NOT EXISTS idx_order_analysis_created_at ON order_analysis(created_at);

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_order_analysis_updated_at ON order_analysis;
CREATE TRIGGER update_order_analysis_updated_at
    BEFORE UPDATE ON order_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
