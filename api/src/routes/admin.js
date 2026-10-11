import express from 'express';
import crypto from 'crypto';
import { query, getClient } from '../db/pool.js';
import { asyncHandler, verifyAdminKey } from '../middleware/auth.js';
import { AppError } from '../middleware/errors.js';

const router = express.Router();

// Apply admin key verification to all admin routes
router.use(verifyAdminKey);

// POST /api/admin/menu - Create menu item
router.post('/menu', asyncHandler(async (req, res) => {
  const { name, description, price_kes, category, imageUrl } = req.body;

  if (!name || !price_kes || !category) {
    throw new AppError('Name, price, and category are required', 400, 'ValidationError');
  }

  if (price_kes <= 0) {
    throw new AppError('Price must be greater than 0', 400, 'ValidationError');
  }

  const result = await query(
    `INSERT INTO menu_items (name, description, price_kes, category, image_url, available)
     VALUES ($1, $2, $3, $4, $5, true)
     RETURNING *`,
    [name, description, price_kes, category, imageUrl]
  );

  res.status(201).json(result.rows[0]);
}));

// PUT /api/admin/menu/:id - Update menu item
router.put('/menu/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, price_kes, category, imageUrl, available } = req.body;

  const updates = [];
  const params = [];
  let paramCount = 1;

  if (name !== undefined) {
    updates.push(`name = $${paramCount++}`);
    params.push(name);
  }
  if (description !== undefined) {
    updates.push(`description = $${paramCount++}`);
    params.push(description);
  }
  if (price_kes !== undefined) {
    if (price_kes <= 0) {
      throw new AppError('Price must be greater than 0', 400, 'ValidationError');
    }
    updates.push(`price_kes = $${paramCount++}`);
    params.push(price_kes);
  }
  if (category !== undefined) {
    updates.push(`category = $${paramCount++}`);
    params.push(category);
  }
  if (imageUrl !== undefined) {
    updates.push(`image_url = $${paramCount++}`);
    params.push(imageUrl);
  }
  if (available !== undefined) {
    updates.push(`available = $${paramCount++}`);
    params.push(available);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'ValidationError');
  }

  updates.push(`updated_at = NOW()`);
  params.push(id);

  const result = await query(
    `UPDATE menu_items SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new AppError('Menu item not found', 404);
  }

  res.json(result.rows[0]);
}));

// DELETE /api/admin/menu/:id - Delete menu item
router.delete('/menu/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM menu_items WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    throw new AppError('Menu item not found', 404);
  }

  res.json({ message: 'Menu item deleted', id });
}));

// GET /api/admin/orders - List all orders
router.get('/orders', asyncHandler(async (req, res) => {
  const { status, paymentStatus, limit = 50, offset = 0 } = req.query;

  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  let paramCount = 1;

  if (status) {
    sql += ` AND status = $${paramCount++}`;
    params.push(status);
  }

  if (paymentStatus) {
    sql += ` AND payment_status = $${paramCount++}`;
    params.push(paymentStatus);
  }

  sql += ' ORDER BY created_at DESC LIMIT $' + paramCount + ' OFFSET $' + (paramCount + 1);
  params.push(Math.min(parseInt(limit), 100), parseInt(offset));

  const result = await query(sql, params);
  const countResult = await query('SELECT COUNT(*) FROM orders');

  res.json({
    orders: result.rows,
    total: parseInt(countResult.rows[0].count),
    limit: Math.min(parseInt(limit), 100),
    offset: parseInt(offset),
  });
}));

// GET /api/admin/orders/:id - Get order with items
router.get('/orders/:id', asyncHandler(async (req, res) => {
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

  res.json({
    ...orderResult.rows[0],
    items: itemsResult.rows,
  });
}));

// PUT /api/admin/orders/:id - Update order status
router.put('/orders/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, paymentStatus } = req.body;

  const updates = [];
  const params = [];
  let paramCount = 1;

  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'];
  const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

  if (status !== undefined) {
    if (!validStatuses.includes(status)) {
      throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'ValidationError');
    }
    updates.push(`status = $${paramCount++}`);
    params.push(status);
  }

  if (paymentStatus !== undefined) {
    if (!validPaymentStatuses.includes(paymentStatus)) {
      throw new AppError(`Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`, 400, 'ValidationError');
    }
    updates.push(`payment_status = $${paramCount++}`);
    params.push(paymentStatus);
  }

  if (updates.length === 0) {
    throw new AppError('No fields to update', 400, 'ValidationError');
  }

  updates.push('updated_at = NOW()');
  params.push(id);

  const result = await query(
    `UPDATE orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    throw new AppError('Order not found', 404);
  }

  res.json(result.rows[0]);
}));

// POST /api/admin/keys - Create new admin API key
router.post('/keys', asyncHandler(async (req, res) => {
  const { description } = req.body;

  const newKey = crypto.randomBytes(32).toString('hex');
  const keyHash = crypto.createHash('sha256').update(newKey).digest('hex');

  await query(
    `INSERT INTO admin_keys (key_hash, description, active)
     VALUES ($1, $2, true)`,
    [keyHash, description || 'API Key']
  );

  res.status(201).json({
    message: 'API key created. Save this key securely; it will not be shown again.',
    key: newKey,
    prefix: `bite_${newKey.substring(0, 8)}`,
  });
}));

export default router;
