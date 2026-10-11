import { query } from './pool.js';

export async function initDb() {
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS menu_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price_kes DECIMAL(10, 2) NOT NULL,
      category VARCHAR(100) NOT NULL,
      image_url VARCHAR(500),
      available BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT price_positive CHECK (price_kes > 0)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      fulfillment_type VARCHAR(20) NOT NULL CHECK (fulfillment_type IN ('pickup', 'delivery')),
      delivery_address VARCHAR(500),
      total_amount_kes DECIMAL(10, 2) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
      intasend_invoice_id VARCHAR(255),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT total_positive CHECK (total_amount_kes > 0)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price_kes DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      intasend_invoice_id VARCHAR(255) UNIQUE NOT NULL,
      amount_kes DECIMAL(10, 2) NOT NULL,
      payment_method VARCHAR(50),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      key_hash VARCHAR(255) NOT NULL UNIQUE,
      description VARCHAR(255),
      active BOOLEAN DEFAULT true,
      last_used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payments_intasend_id ON payments(intasend_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category);
    CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(available);
  `;

  try {
    await query(createTablesSQL);
    console.log('Database tables initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
    throw error;
  }
}
