-- Inventory
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    physical_stock INT NOT NULL CHECK (physical_stock >= 0), -- Overselling prevent for database
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- Order
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    order_id VARCHAR(100) UNIQUE NOT NULL, -- For idempotency check
    user_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- State machine: PENGDING, PAID, FAILED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_product FOREIGN key (product_id) REFERENCES inventory(product_id)
);

CREATE TABLE IF NOT EXISTS processed_messages (
  id BIGSERIAL PRIMARY KEY,
  message_id VARCHAR(128) NOT NULL UNIQUE,
  order_id VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL,
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_messages_order_id ON processed_messages(order_id);

CREATE INDEX IF NOT EXISTS idx_processed_messages_status
  ON processed_messages(status);

CREATE INDEX IF NOT EXISTS idx_processed_messages_created_at
  ON processed_messages(created_at);

CREATE TABLE IF NOT EXISTS outbox_events (
  id BIGSERIAL PRIMARY KEY,
  event_id VARCHAR(128) NOT NULL UNIQUE,
  event_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT,
  published_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);


-- Insert one product data
INSERT INTO inventory (product_id, product_name, physical_stock)
VALUES ('PROD_IPHONE_15', 'iphone 15 pro max', 100)
ON CONFLICT (product_id) DO NOTHING;