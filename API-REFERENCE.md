# 🍔 Bite Lab API Quick Reference

## Base URL
```
Local:      http://localhost:3000
Production: https://bite-lab-api.render.com
```

## Public Endpoints (No Auth)

### Get Menu Items
```bash
GET /api/menu
GET /api/menu?category=Main%20Course
```
Response: `{ items: [...], count: 10 }`

### Get Categories
```bash
GET /api/menu/categories
```
Response: `{ categories: ["Main Course", "Bread", "Dessert", ...] }`

### Create Order
```bash
POST /api/orders
Content-Type: application/json

{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+254722000000",
  "fulfillmentType": "delivery",
  "deliveryAddress": "Campus Gate 2",
  "items": [
    {"menuItemId": "uuid", "quantity": 2},
    {"menuItemId": "uuid", "quantity": 1}
  ],
  "notes": "No onions"
}
```
Response:
```json
{
  "orderId": "uuid",
  "totalAmount": 650,
  "fulfillmentFee": 300,
  "status": "pending",
  "paymentStatus": "pending"
}
```

### Get Order
```bash
GET /api/orders/:orderId
```
Response:
```json
{
  "id": "uuid",
  "customer_name": "John Doe",
  "total_amount_kes": 650,
  "status": "pending",
  "payment_status": "pending",
  "items": [
    {
      "quantity": 2,
      "unit_price_kes": 300,
      "name": "Beef Stew & Rice",
      "description": "..."
    }
  ]
}
```

### Checkout (Payment)
```bash
POST /api/payments/checkout
Content-Type: application/json

{
  "orderId": "uuid",
  "paymentMethod": "card"
}
```

**Payment Methods:**
- `card` → Redirect to IntaSend checkout (Visa/Mastercard)
- `mpesa` → M-Pesa STK push prompt on phone

Response:
```json
{
  "paymentId": "uuid",
  "invoiceId": "uuid",
  "checkoutUrl": "https://payment.intasend.com/...",
  "paymentMethod": "card",
  "amount": 650,
  "currency": "KES",
  "status": "initiated"
}
```

### Check Payment Status
```bash
GET /api/payments/status/:invoiceId
```
Response:
```json
{
  "invoiceId": "uuid",
  "status": "completed",
  "amount": 650,
  "paymentMethod": "card"
}
```

## Admin Endpoints (Requires API Key)

**Header:**
```
Authorization: Bearer YOUR_ADMIN_API_KEY
```

### Menu Management

```bash
# Create
POST /api/admin/menu
{ "name": "Dish", "price_kes": 250, "category": "Main", "description": "..." }

# Update
PUT /api/admin/menu/:itemId
{ "name": "New Name", "price_kes": 300, ... }

# Delete
DELETE /api/admin/menu/:itemId
```

### Order Management

```bash
# List all orders
GET /api/admin/orders
GET /api/admin/orders?status=pending&paymentStatus=paid&limit=50&offset=0

# Get order details
GET /api/admin/orders/:orderId

# Update order status
PUT /api/admin/orders/:orderId
{
  "status": "preparing",
  "paymentStatus": "paid"
}
```

**Valid Statuses:**
- Order: `pending` | `confirmed` | `preparing` | `ready` | `completed` | `cancelled`
- Payment: `pending` | `paid` | `failed` | `refunded`

### API Keys

```bash
# Generate new admin key
POST /api/admin/keys
{ "description": "POS System" }

Response:
{
  "message": "API key created. Save this key securely...",
  "key": "abc123...",
  "prefix": "bite_abc123"
}
```

## Error Responses

```json
{
  "error": "ValidationError",
  "message": "Invalid email address",
  "timestamp": "2024-01-15T12:34:56.789Z"
}
```

**Status Codes:**
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid API key)
- `404` - Not Found (order, menu item, etc.)
- `500` - Server Error

## Fulfillment Fees

| Type | Fee |
|------|-----|
| Pickup | KES 200 |
| Delivery | KES 300 |

## Menu Items (Sample)

| Item | Price | Category |
|------|-------|----------|
| Chicken Biryani | KES 350 | Rice |
| Beef Samosa | KES 50 | Appetizers |
| Naan Bread | KES 80 | Bread |
| Grilled Tilapia | KES 450 | Main Course |
| Ugali & Sukuma | KES 200 | Main Course |
| Beef Stew & Rice | KES 300 | Main Course |
| Chapati | KES 40 | Bread |
| Nyama Choma | KES 400 | Main Course |
| Mango Juice | KES 100 | Beverages |
| Chocolate Cake | KES 120 | Dessert |

## Testing with cURL

```bash
# Health check
curl http://localhost:3000/health

# Get menu
curl http://localhost:3000/api/menu

# Create order (save orderId for payment)
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test",
    "customerEmail": "test@test.com",
    "customerPhone": "+254722000000",
    "fulfillmentType": "pickup",
    "items": [{"menuItemId": "...", "quantity": 1}]
  }'

# Checkout (get checkoutUrl or use STK push)
curl -X POST http://localhost:3000/api/payments/checkout \
  -H "Content-Type: application/json" \
  -d '{"orderId": "...", "paymentMethod": "card"}'

# Check payment
curl http://localhost:3000/api/payments/status/invoice-id

# Admin: List orders (use your ADMIN_API_KEY)
curl -H "Authorization: Bearer your-api-key" \
  http://localhost:3000/api/admin/orders
```

## Environment Variables

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@host:5432/db
INTASEND_PUBLIC_KEY=pk_sandbox_...
INTASEND_SECRET_KEY=sk_sandbox_...
ADMIN_API_KEY=random-string
FRONTEND_ORIGIN=https://kirst3nn.github.io/Bitalabtesting
WEBHOOK_SECRET=random-string
```

## Common Issues

| Issue | Solution |
|-------|----------|
| CORS error | Check `FRONTEND_ORIGIN` env var |
| Invalid phone | Use Kenya format: +254722000000 or 0722000000 |
| Order not found | Verify `orderId` is correct UUID |
| Menu empty | Run `npm run seed` to add sample items |
| Payment failed | Check IntaSend API keys and test mode |
| Database error | Verify `DATABASE_URL` and PostgreSQL running |

---

**Full docs:** [api/README.md](api/README.md) | **Deployment:** [RENDER-DEPLOYMENT.md](RENDER-DEPLOYMENT.md)
