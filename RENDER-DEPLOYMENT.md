# 🚀 Backend Deployment Guide (IntaSend + Render + PostgreSQL)

This guide walks you through deploying your Bite Lab backend to Render (Node.js API + PostgreSQL database) and connecting it to IntaSend for payments.

## 📋 Prerequisites

- ✅ GitHub account (already have)
- ✅ Render account (free at [render.com](https://render.com))
- ✅ IntaSend account (free at [intasend.com](https://intasend.com))
- ✅ Backend code pushed to `main` branch (just did this! ✓)

## 🔐 Step 1: Set Up IntaSend Account & Get API Keys

1. **Sign up** at [intasend.com](https://intasend.com)
2. **Log in** and go to **Settings → API Keys**
3. **Copy** your:
   - **Publishable Key** (public, safe to share)
   - **Secret Key** (PRIVATE, never commit to GitHub)
4. **Choose environment**:
   - Use **Sandbox** keys for testing (payments won't be charged)
   - Use **Live** keys for production (real M-Pesa and card payments)

**Example keys** (replace with yours):
```
Publishable: pk_sandbox_abc123...
Secret: sk_sandbox_xyz789...
```

## 🌐 Step 2: Deploy Backend to Render

### Option A: One-Click Deploy (Easiest)

1. Go to [render.com](https://render.com) and **sign in**
2. Click **"New +"** → **"Web Service"**
3. Select **"Deploy an existing repo from GitHub"**
4. **Connect GitHub** and authorize
5. **Select repository**: `kirst3nn/Bitalabtesting`
6. **Configure**:
   - **Name**: `bite-lab-api`
   - **Runtime**: Node (auto-detected)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Root Directory**: `api/` (IMPORTANT!)

7. **Click** "Create Web Service"
8. Render will now:
   - ✅ Build the backend
   - ✅ Create a PostgreSQL database automatically
   - ✅ Assign a URL like `https://bite-lab-api.render.com`

### Option B: Manual Configuration (If One-Click Fails)

1. Create new **Web Service** and connect your repo
2. Leave Build/Start commands blank (Render auto-reads from api/package.json)
3. Click **"Advanced"** and add:
   - **Root Directory**: `api`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

## 🔑 Step 3: Add Environment Variables

Once the service is created:

1. Click on your **`bite-lab-api`** service
2. Go to **"Environment"** tab
3. **Add** each variable:

| Key | Value | Notes |
|-----|-------|-------|
| `INTASEND_PUBLIC_KEY` | Your publishable key | From IntaSend Settings → API Keys |
| `INTASEND_SECRET_KEY` | Your secret key | **KEEP PRIVATE!** |
| `ADMIN_API_KEY` | Generate random string | `openssl rand -hex 32` or any strong password |
| `WEBHOOK_SECRET` | Generate random string | For IntaSend webhook verification |
| `FRONTEND_ORIGIN` | `https://kirst3nn.github.io/Bitalabtesting` | Your GitHub Pages URL |
| `NODE_ENV` | `production` | (Optional, default: production on Render) |

**Example:**
```
INTASEND_PUBLIC_KEY = pk_sandbox_abc123def456...
INTASEND_SECRET_KEY = sk_sandbox_xyz789uvw012...
ADMIN_API_KEY = a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5...
WEBHOOK_SECRET = x9y8z7w6v5u4t3s2r1q0p1o2n3m4l5...
FRONTEND_ORIGIN = https://kirst3nn.github.io/Bitalabtesting
```

4. **Click** "Save" → Render auto-restarts the service

## 🗄️ Step 4: Verify Database Creation

Render auto-creates a PostgreSQL database. To verify:

1. In your service dashboard, click **"Databases"** tab
2. You should see **`bitelab-db`**
3. Database credentials are automatically in `DATABASE_URL` env var

**The database is ready!** Tables will auto-create on first API request.

## ✅ Step 5: Test the API

Once the service is "live" (green status):

```bash
# Health check
curl https://bite-lab-api.render.com/health

# Should return:
# {"status":"ok","timestamp":"2024-01-15T12:34:56Z"}

# List menu items
curl https://bite-lab-api.render.com/api/menu

# Should return an empty menu (no items seeded yet)
# {"items":[],"count":0}
```

## 🌱 Step 6: Seed Menu Data

Connect to your Render database and run the seed script:

### Option A: Using psql (Command Line)

1. Get database credentials from Render dashboard
2. Run:
```bash
psql postgresql://username:password@host:5432/bitelab -f api/src/db/seed.js
```

### Option B: Using Render's Shell (Easiest)

1. In Render dashboard, click **"Shell"** tab
2. Run:
```bash
npm run seed
```

This adds 10 sample menu items:
- Chicken Biryani (KES 350)
- Beef Samosa (KES 50)
- Naan Bread (KES 80)
- Grilled Tilapia (KES 450)
- Ugali & Sukuma Wiki (KES 200)
- Beef Stew & Rice (KES 300)
- Chapati (KES 40)
- Nyama Choma (KES 400)
- Mango Juice (KES 100)
- Chocolate Cake (KES 120)

## 🔗 Step 7: Connect IntaSend Webhooks

When a customer completes payment, IntaSend sends a webhook to your API.

1. Go to **IntaSend Dashboard** → **Settings → Webhooks**
2. **Add Webhook**:
   - **URL**: `https://bite-lab-api.render.com/api/payments/webhook`
   - **Events**: Payment completed, failed, cancelled
3. **Save**

Now IntaSend will notify your API when payments complete!

## 🎯 Step 8: Update Frontend API URL

The frontend needs to know your backend URL.

1. Edit `vite.config.ts` (or create `.env.production`):
```typescript
const API_URL = process.env.VITE_API_URL || 'https://bite-lab-api.render.com';
```

2. Or in your frontend components:
```typescript
const API = 'https://bite-lab-api.render.com';

// Fetch menu
const menu = await fetch(`${API}/api/menu`).then(r => r.json());

// Create order
const order = await fetch(`${API}/api/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ customerName, ... })
});
```

## 🧪 Step 9: Test Payment Flow

### Test M-Pesa Payment (STK Push)

1. Create order:
```bash
curl -X POST https://bite-lab-api.render.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test User",
    "customerEmail": "test@test.com",
    "customerPhone": "+254722000000",
    "fulfillmentType": "pickup",
    "items": [{"menuItemId": "...", "quantity": 1}]
  }'
```

2. Initiate M-Pesa payment:
```bash
curl -X POST https://bite-lab-api.render.com/api/payments/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "...",
    "paymentMethod": "mpesa"
  }'
```

3. An STK prompt appears on the test phone number's M-Pesa app
4. Complete payment in M-Pesa
5. Check payment status:
```bash
curl https://bite-lab-api.render.com/api/payments/status/invoice-uuid
```

### Test Card Payment

1. Same order creation as above
2. Initiate card payment:
```bash
curl -X POST https://bite-lab-api.render.com/api/payments/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "...",
    "paymentMethod": "card"
  }'
```

3. You'll get a `checkoutUrl` - open it in a browser
4. Use IntaSend test card: `4200 0000 0000 0000` with any future expiry and CVC
5. Payment processes and webhook updates order status

## 🔐 Step 10: Set Up Admin API Key

Create an admin API key for managing menu and orders:

1. In Render shell or local:
```bash
curl -X POST https://bite-lab-api.render.com/api/admin/keys \
  -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"description": "POS System"}'
```

**Note**: The first request's API key must match your `ADMIN_API_KEY` env var.

2. You'll receive a new key - use this for admin operations:
```bash
curl -X GET https://bite-lab-api.render.com/api/admin/orders \
  -H "Authorization: Bearer new-admin-key"
```

## 📊 Monitor Logs

1. In Render dashboard, click **"Logs"** tab
2. See real-time API activity, errors, database queries
3. Debug payment issues, webhook events, etc.

## 🆘 Troubleshooting

### "Database connection failed"
- Check `DATABASE_URL` env var exists
- Restart service (Render → "Restart")
- Wait 2-3 minutes for database to be ready

### "INTASEND_SECRET_KEY is undefined"
- Go to Environment tab
- Verify all IntaSend keys are set
- Restart service after adding variables

### "CORS error from frontend"
- Check `FRONTEND_ORIGIN` matches your GitHub Pages URL
- It should be: `https://kirst3nn.github.io/Bitalabtesting`

### "Webhook not received"
- IntaSend in Sandbox mode - webhooks may be delayed
- Check IntaSend webhook settings
- Verify `https://bite-lab-api.render.com/api/payments/webhook` is registered

### "Menu items not showing"
- Run seed script: `npm run seed`
- Or manually insert via admin endpoint

## 📈 Next Steps

1. **Frontend Integration**:
   - Build order form component
   - Connect to `/api/orders` endpoint
   - Show payment method selector

2. **Order Tracking**:
   - Create tracking page
   - Poll `/api/orders/:id` for status updates

3. **Admin Dashboard**:
   - Build menu management UI
   - Show order queue for kitchen staff

4. **Production Hardening**:
   - Add rate limiting (express-rate-limit)
   - Set up error tracking (Sentry)
   - Monitor API performance

## 🎉 Success!

Your backend is now live! You can:
- ✅ Manage menu items (admin API)
- ✅ Create and track orders
- ✅ Accept M-Pesa and card payments via IntaSend
- ✅ Serve the frontend from GitHub Pages

### API URL for Frontend:
```
https://bite-lab-api.render.com
```

### Admin Dashboard (TODO):
Create a web UI at `/admin` to:
- Add/edit/delete menu items
- View order queue
- Update order status (preparing → ready → collected)

---

**Need help?**
- Backend docs: [api/README.md](../api/README.md)
- IntaSend docs: [intasend.com/docs](https://intasend.com/docs)
- Render docs: [render.com/docs](https://render.com/docs)

**Built for Bite Lab 🍔🚚**
