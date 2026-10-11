# Bite Lab Backend API

A Node.js + Express + PostgreSQL API for managing food orders, menu items, and payments via IntaSend (M-Pesa STK Push & card payments in Kenyan Shillings).

## Features

- 🍔 **Public Menu API**: List food items by category
- 📦 **Order Management**: Create and track orders with validation
- 💳 **IntaSend Payments**: M-Pesa STK Push and card payments (KES)
- 🔐 **Admin API**: Manage menu items and orders (API key auth)
- 📊 **Database Indexes**: Optimized queries for high-traffic fields
- 🔍 **Input Validation & Sanitization**: Email, phone (Kenyan), field validation
- 📝 **Structured Logging**: All queries and errors logged with timestamps
- 🚀 **Render Deployment**: Pre-configured `render.yaml` for one-click deployment

## Architecture

```
api/
├── src/
│   ├── index.js                 # Express app entry point
│   ├── db/
│   │   ├── pool.js             # PostgreSQL connection pool
│   │   ├── init.js             # Database schema initialization
│   │   └── seed.js             # Sample menu data seeding
│   ├── middleware/
│   │   ├── auth.js             # API key verification & error handler
│   │   └── errors.js           # Custom error classes
│   └── routes/
│       ├── menu.js             # GET /api/menu (public)
│       ├── orders.js           # POST /api/orders (public)
│       ├── payments.js         # POST /api/payments/checkout, webhooks
│       └── admin.js            # CRUD menu & orders (admin key required)
├── package.json
├── .env.example
├── .gitignore
└── render.yaml                 # Render deployment config
```

## Installation

### Local Development

```bash
cd api
npm install
cp .env.example .env
```

Edit `.env` with your local database and IntaSend credentials:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/bitelab

INTASEND_PUBLIC_KEY=your_test_publishable_key
INTASEND_SECRET_KEY=your_test_secret_key
INTASEND_TEST_MODE=true

ADMIN_API_KEY=your-random-admin-api-key
FRONTEND_ORIGIN=http://localhost:5173
WEBHOOK_SECRET=your-random-webhook-secret
```

### Database Setup

Ensure PostgreSQL is running, then:

```bash
npm start
```

The API will automatically create all tables on first run. To seed sample menu data:

```bash
npm run seed
```

### Development Mode

For automatic restarts on file changes:

```bash
npm run dev
```

## API Endpoints

### Public Endpoints (No Authentication)

#### GET `/api/menu`
List all available menu items.

**Query Parameters:**
- `category` (optional): Filter by category (e.g., "Main Course", "Bread")

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Beef Stew & Rice",
      "description": "Tender beef in rich tomato gravy with white rice",
      "price_kes": 300,
      "category": "Main Course",
      "image_url": "/images/beefstew.jpg",
      "available": true
    }
  ],
  "count": 10
}
```

#### POST `/api/orders`
Create a new order.

**Request Body:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+254722123456",
  "fulfillmentType": "delivery",
  "deliveryAddress": "Campus Gate 2, Nairobi",
  "items": [
    {
      "menuItemId": "uuid",
      "quantity": 2
    }
  ],
  "notes": "No onions, extra sauce"
}
```

**Validation:**
- Email must be valid format
- Phone must be Kenyan (+254 or 0 prefix)
- Fulfillment type: "pickup" (KES 200) or "delivery" (KES 300)
- At least one item required
- Delivery address required for delivery orders

**Response:**
```json
{
  "orderId": "uuid",
  "totalAmount": 650,
  "fulfillmentFee": 300,
  "status": "pending",
  "paymentStatus": "pending"
}
```

#### GET `/api/orders/:id`
Get order details with items.

**Response:**
```json
{
  "id": "uuid",
  "customer_name": "John Doe",
  "customer_email": "john@example.com",
  "customer_phone": "+254722123456",
  "fulfillment_type": "delivery",
  "delivery_address": "Campus Gate 2, Nairobi",
  "total_amount_kes": 650,
  "status": "pending",
  "payment_status": "pending",
  "items": [
    {
      "id": "uuid",
      "quantity": 2,
      "unit_price_kes": 300,
      "name": "Beef Stew & Rice",
      "description": "..."
    }
  ]
}
```

### Payment Endpoints

#### POST `/api/payments/checkout`
Initiate payment with IntaSend.

**Request Body:**
```json
{
  "orderId": "uuid",
  "paymentMethod": "card"
}
```

**Payment Methods:**
- `card`: Card (Visa/Mastercard) payment via IntaSend checkout
- `mpesa`: M-Pesa STK Push (prompt on customer's phone)

**Response (Card):**
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

**Response (M-Pesa):**
```json
{
  "paymentId": "uuid",
  "invoiceId": "uuid",
  "checkoutUrl": null,
  "paymentMethod": "mpesa",
  "amount": 650,
  "currency": "KES",
  "status": "initiated"
}
```

#### GET `/api/payments/status/:invoiceId`
Check payment status (polls IntaSend).

**Response:**
```json
{
  "invoiceId": "uuid",
  "status": "completed",
  "amount": 650,
  "paymentMethod": "card",
  "updatedAt": "2024-01-15T12:34:56Z"
}
```

#### POST `/api/payments/webhook`
Handle IntaSend webhook callbacks (updates payment and order status).

**Headers:**
IntaSend will POST to this endpoint on payment completion/failure.

### Admin Endpoints (Requires API Key)

Add `Authorization: Bearer <API_KEY>` header to all admin requests.

#### POST `/api/admin/menu`
Create menu item.

**Request Body:**
```json
{
  "name": "New Dish",
  "description": "Delicious new dish",
  "price_kes": 250,
  "category": "Main Course",
  "imageUrl": "/images/new-dish.jpg"
}
```

#### PUT `/api/admin/menu/:id`
Update menu item.

#### DELETE `/api/admin/menu/:id`
Delete menu item (soft delete via availability).

#### GET `/api/admin/orders`
List all orders (paginated).

**Query Parameters:**
- `status`: Filter by order status (pending, confirmed, preparing, ready, completed, cancelled)
- `paymentStatus`: Filter by payment status (pending, paid, failed, refunded)
- `limit`: Results per page (default 50, max 100)
- `offset`: Pagination offset (default 0)

#### GET `/api/admin/orders/:id`
Get order with all items.

#### PUT `/api/admin/orders/:id`
Update order status.

**Request Body:**
```json
{
  "status": "preparing",
  "paymentStatus": "paid"
}
```

#### POST `/api/admin/keys`
Create new admin API key.

**Request Body:**
```json
{
  "description": "POS System Access"
}
```

**Response:**
```json
{
  "message": "API key created. Save this key securely; it will not be shown again.",
  "key": "abc123...",
  "prefix": "bite_abc123"
}
```

## Deployment on Render

### 1. Connect GitHub Repository

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository (kirst3nn/Bitalabtesting)
4. Select "Python" (Render will auto-detect the `render.yaml`)

### 2. Configure Environment Variables

In Render Dashboard:
- Go to "Environment" tab
- Add the following:
  - `INTASEND_PUBLIC_KEY`: Your IntaSend publishable key (test/prod)
  - `INTASEND_SECRET_KEY`: Your IntaSend secret key
  - `ADMIN_API_KEY`: Generate a strong random string (e.g., `openssl rand -hex 32`)
  - `WEBHOOK_SECRET`: Generate another random string

### 3. Database

Render will automatically create a PostgreSQL database linked via `DATABASE_URL` (defined in `render.yaml`).

### 4. Deploy

1. Push to `main` branch
2. Render auto-deploys via GitHub Actions
3. Once live, the API URL will be: `https://bite-lab-api.render.com`

### 5. Frontend Integration

Update frontend `.env.production`:
```env
VITE_API_URL=https://bite-lab-api.render.com
```

## IntaSend Integration

### Getting API Keys

1. Sign up at [intasend.com](https://intasend.com)
2. Go to Settings → API Keys
3. Copy **Publishable Key** (public) and **Secret Key** (private)
4. Use "Sandbox" keys for testing

### Payment Flow

**Card Payment:**
1. User selects "Pay with Card"
2. POST `/api/payments/checkout` with `paymentMethod: "card"`
3. Redirect user to `checkoutUrl` (IntaSend-hosted page)
4. User enters card details and completes payment
5. IntaSend sends webhook to `/api/payments/webhook`
6. Order status updated to `confirmed`, payment status to `paid`

**M-Pesa Payment:**
1. User selects "Pay with M-Pesa"
2. POST `/api/payments/checkout` with `paymentMethod: "mpesa"`
3. STK prompt appears on user's phone
4. User enters M-Pesa PIN
5. IntaSend sends webhook on completion
6. Order and payment statuses updated

## Database Schema

### menu_items
- `id` (UUID)
- `name`, `description`, `price_kes`, `category`
- `image_url`, `available`
- `created_at`, `updated_at`

### orders
- `id` (UUID)
- `customer_name`, `customer_email`, `customer_phone`
- `fulfillment_type` (pickup/delivery), `delivery_address`
- `total_amount_kes`, `status`, `payment_status`
- `intasend_invoice_id`, `notes`
- `created_at`, `updated_at`

### order_items
- `id` (UUID)
- `order_id`, `menu_item_id`, `quantity`, `unit_price_kes`
- `created_at`

### payments
- `id` (UUID)
- `order_id`, `intasend_invoice_id`, `amount_kes`
- `payment_method`, `status`, `metadata`
- `created_at`, `updated_at`

### admin_keys
- `id` (UUID)
- `key_hash` (SHA256), `description`, `active`
- `last_used_at`, `created_at`

## Testing

### Test Endpoints Locally

```bash
# Health check
curl http://localhost:3000/health

# List menu items
curl http://localhost:3000/api/menu

# Create order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "customerPhone": "+254722000000",
    "fulfillmentType": "pickup",
    "items": [
      {"menuItemId": "...", "quantity": 1}
    ]
  }'

# Check admin endpoint (requires API key)
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  http://localhost:3000/api/admin/orders
```

## Security Considerations

- ✅ **Input Validation**: All fields validated (email, phone format, price > 0)
- ✅ **Sanitization**: HTML tags removed from strings
- ✅ **API Key Auth**: Admin endpoints require Bearer token (SHA256 hashed)
- ✅ **CORS**: Limited to frontend origin only
- ✅ **HTTPS**: Force HTTPS in production (Render handles this)
- ✅ **SQL Injection Prevention**: Parameterized queries via pg library
- ✅ **Rate Limiting**: TODO—recommend adding express-rate-limit for production
- ✅ **Webhook Verification**: TODO—enhance signature verification

## Environment Variables Reference

| Variable | Type | Required | Example |
|----------|------|----------|---------|
| `NODE_ENV` | string | No | `development` or `production` |
| `PORT` | number | No | `3000` |
| `DATABASE_URL` | string | **Yes** | `postgresql://user:pass@host/db` |
| `INTASEND_PUBLIC_KEY` | string | **Yes** | Public IntaSend key |
| `INTASEND_SECRET_KEY` | string | **Yes** | Secret IntaSend key |
| `INTASEND_TEST_MODE` | boolean | No | `true` for sandbox |
| `ADMIN_API_KEY` | string | No | Random string for API auth |
| `FRONTEND_ORIGIN` | string | No | `http://localhost:5173` |
| `WEBHOOK_SECRET` | string | No | Random string for webhook verification |

## Next Steps

1. **Frontend Integration**: Add "Order Now" button to landing page
2. **Order Form UI**: Menu selection, customer details, checkout
3. **Payment UI**: Display IntaSend checkout
4. **Order Tracking**: Page to check order status
5. **Admin Dashboard**: Web UI for managing menu and orders
6. **Rate Limiting**: Add `express-rate-limit` to prevent abuse
7. **Webhook Verification**: Enhance IntaSend signature verification

## Support & Troubleshooting

**Database not connecting:**
- Verify `DATABASE_URL` format: `postgresql://user:password@host:5432/dbname`
- Ensure PostgreSQL is running locally
- On Render, check database credentials in Environment tab

**IntaSend errors:**
- Verify API keys are correct (test vs. production)
- Check phone number is Kenyan format (+254 or 0)
- Ensure amount is in cents for card payments

**CORS errors:**
- Verify `FRONTEND_ORIGIN` matches your frontend URL
- For GitHub Pages: `https://kirst3nn.github.io/Bitalabtesting`

---

**Built with ❤️ for Bite Lab Campus Food Delivery**
