import express from 'express';
import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/auth.js';

const router = express.Router();

// GET /api/menu - List all available menu items
router.get('/', asyncHandler(async (req, res) => {
  const { category } = req.query;

  let sql = 'SELECT * FROM menu_items WHERE available = true';
  const params = [];

  if (category) {
    sql += ' AND category = $1';
    params.push(category);
  }

  sql += ' ORDER BY category, name';

  const result = await query(sql, params);

  res.json({
    items: result.rows,
    count: result.rows.length,
  });
}));

// GET /api/menu/categories - List all categories
router.get('/categories', asyncHandler(async (req, res) => {
  const result = await query(
    'SELECT DISTINCT category FROM menu_items WHERE available = true ORDER BY category'
  );

  res.json({
    categories: result.rows.map(r => r.category),
  });
}));

export default router;
