-- Таблица кэша найденных в интернете поставщиков
CREATE TABLE IF NOT EXISTS internet_suppliers (
  id              SERIAL PRIMARY KEY,
  query           TEXT NOT NULL,                      -- поисковый запрос
  company_name    TEXT NOT NULL,
  website         TEXT,
  description     TEXT,
  found_via       TEXT,                               -- kaspi.kz / olx.kz / satu.kz / alibaba.kz / krisha.kz / build.kz / google.kz
  emails          TEXT[],                             -- массив email-адресов
  phones          TEXT[],                             -- массив телефонов
  telegrams       TEXT[],                             -- массив telegram-ников
  raw_html        TEXT,                               -- опционально, сырой снипет
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Backward-compatible columns used by searchAndSave() inserts.
ALTER TABLE internet_suppliers ADD COLUMN IF NOT EXISTS price NUMERIC(14,2);
ALTER TABLE internet_suppliers ADD COLUMN IF NOT EXISTS price_currency TEXT;

CREATE INDEX IF NOT EXISTS idx_internet_suppliers_query ON internet_suppliers(query);
CREATE INDEX IF NOT EXISTS idx_internet_suppliers_website ON internet_suppliers(website);
