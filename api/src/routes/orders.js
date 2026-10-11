import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { query, getClient } from '../db/pool.js';
import { asyncHandler } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';

const router = express.Router();

const PICKUP_FEE = 200;
const DELIVERY_FEE = 300;

// Validation helper
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  return /^(?:\+254|0)[1-9]\d{8}$/.test(phone.replace(/\s/g, ''));
}

function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

// POST /api/orders - Create new order
router.post('/', asyncHandler(async (req, res) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    fulfillmentType,
    deliveryAddress,
    items,
    notes,
  } = req.body;

  // Validation
  if (!customerName || customerName.trim().length === 0) {
    throw new AppError('Customer name is required', 400, 'ValidationError');
  }

  if (!validateEmail(customerEmail)) {
    throw new AppError('Invalid email address', 400, 'ValidationError');
  }

  if (!validatePhone(customerPhone)) {
    throw new AppError('Invalid phone number (must be Kenyan)', 400, 'ValidationError');
  }

  if (!['pickup', 'delivery'].includes(fulfillmentType)) {
    throw new AppError('Fulfillment type must be "pickup" or "delivery"', 400, 'ValidationError');
  }

  if (fulfillmentType === 'delivery' && (!deliveryAddress || deliveryAddress.trim().length === 0)) {
    throw new AppError('Delivery address is required for delivery orders', 400, 'ValidationError');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('At least one item is required', 400, 'ValidationError');
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');

    let subtotal = 0;

    // Validate and calculate total
    for (const item of items) {
      if (!item.menuItemId || item.quantity <= 0) {
        throw new AppError('Invalid item data', 400, 'ValidationError');
      }

      const menuResult = await client.query(
        'SELECT price_kes FROM menu_items WHERE id = $1 AND available = true',
        [item.menuItemId]
      );

      if (menuResult.rows.length === 0) {
        throw new AppError(`Menu item ${item.menuItemId} not found or unavailable`, 404);
      }

      subtotal += menuResult.rows[0].price_kes * item.quantity;
    }

    const fulfillmentFee = fulfillmentType === 'pickup' ? PICKUP_FEE : DELIVERY_FEE;
    const totalAmount = subtotal + fulfillmentFee;

    // Create order
    const orderId = uuidv4();
    await client.query(
      `INSERT INTO orders 
       (id, customer_name, customer_email, customer_phone, fulfillment_type, delivery_address, total_amount_kes, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        orderId,
        sanitizeInput(customerName),
        customerEmail.toLowerCase(),
        sanitizeInput(customerPhone),
        fulfillmentType,
        fulfillmentType === 'delivery' ? sanitizeInput(deliveryAddress) : null,
        totalAmount,
        sanitizeInput(notes || ''),
      ]
    );

    // Create order items
    for (const item of items) {
      const menuResult = await client.query(
        'SELECT price_kes FROM menu_items WHERE id = $1',
        [item.menuItemId]
      );

      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price_kes)
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.menuItemId, item.quantity, menuResult.rows[0].price_kes]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      orderId,
      totalAmount,
      fulfillmentFee,
      status: 'pending',
      paymentStatus: 'pending',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.status) throw error;
    throw new AppError('Failed to create order', 500);
  } finally {
    client.release();
  }
}));

// GET /api/orders/:id - Get order details
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const orderResult = await query(
    'SELECT * FROM orders WHERE id = $1',
    [id]
  );

  if (orderResult.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  const itemsResult = await query(
    `SELECT oi.*, m.name, m.description FROM order_items oi
     JOIN menu_items m ON oi.menu_item_id = m.id
     WHERE oi.order_id = $1`,
    [id]
  );

  const order = orderResult.rows[0];
  res.json({
    ...order,
    items: itemsResult.rows,
  });
}));

export default router;
