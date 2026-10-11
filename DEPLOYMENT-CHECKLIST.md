# 📋 Deployment Checklist - Bite Lab Backend

Use this checklist to deploy your backend to Render and integrate with IntaSend.

## ✅ Pre-Deployment (15 minutes)

### IntaSend Setup
- [ ] Go to [intasend.com](https://intasend.com) and sign up
- [ ] Log in and go to **Settings → API Keys**
- [ ] Copy **Publishable Key** (e.g., `pk_sandbox_abc123...`)
- [ ] Copy **Secret Key** (e.g., `sk_sandbox_xyz789...`)
- [ ] ⚠️ **Do NOT commit Secret Key to GitHub**
- [ ] Go to **Settings → Webhooks**
- [ ] Add webhook URL: `https://your-api.render.com/api/payments/webhook`

### Generate Admin API Key (Locally)
```bash
# Generate random string for admin key
openssl rand -hex 32
# Or just use: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5...

# Generate webhook secret
openssl rand -hex 32
```

## 🚀 Deployment (5 minutes)

### Step 1: Create Render Service
- [ ] Go to [render.com](https://render.com) and sign in (create account if needed)
- [ ] Click **"New +"** → **"Web Service"**
- [ ] Select **"GitHub"** and authorize (use OAuth)
- [ ] Select repository: **kirst3nn/Bitalabtesting**
- [ ] Click **"Connect"**

### Step 2: Configure Service
- [ ] **Name**: `bite-lab-api` (or your preferred name)
- [ ] **Region**: Select one closest to Kenya (or default)
- [ ] **Runtime**: Node (auto-detected)
- [ ] **Build Command**: `npm install`
- [ ] **Start Command**: `npm start`
- [ ] **Root Directory**: `api/` (IMPORTANT!)

### Step 3: Add Environment Variables
Click **"Advanced"** (or go to "Environment" tab after creation):

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Optional, defaults to production |
| `PORT` | `3000` | Optional, Render assigns port |
| `INTASEND_PUBLIC_KEY` | `pk_sandbox_...` | From IntaSend Settings |
| `INTASEND_SECRET_KEY` | `sk_sandbox_...` | **KEEP PRIVATE** - Never share |
| `ADMIN_API_KEY` | `a1b2c3d4...` (32 hex chars) | Generate with `openssl rand -hex 32` |
| `WEBHOOK_SECRET` | `x9y8z7w6...` (32 hex chars) | Generate with `openssl rand -hex 32` |
| `FRONTEND_ORIGIN` | `https://kirst3nn.github.io/Bitalabtesting` | Your GitHub Pages URL |

- [ ] Click **"Create Web Service"**
- [ ] Render auto-creates PostgreSQL database (will show in "Databases" tab)
- [ ] Wait for deployment (green "Live" status, ~2-3 minutes)

### Step 4: Verify Deployment
- [ ] Check logs in Render dashboard (should see "🍔 Bite Lab API running")
- [ ] Test health endpoint:
  ```bash
  curl https://YOUR_SERVICE_NAME.render.com/health
  # Should return: {"status":"ok","timestamp":"..."}
  ```
- [ ] Test menu endpoint:
  ```bash
  curl https://YOUR_SERVICE_NAME.render.com/api/menu
  # Should return: {"items":[],"count":0}
  ```

## 🌱 Post-Deployment (5 minutes)

### Seed Menu Data
Option A: Using Render Shell (Easiest)
- [ ] In Render dashboard, click **"Shell"** tab
- [ ] Run: `npm run seed`
- [ ] Should see: `✅ Seeded 10 menu items`

Option B: Using psql
- [ ] Get database credentials from Render "Databases" tab
- [ ] Run locally:
  ```bash
  psql postgresql://user:password@host:5432/bitelab -c "
    INSERT INTO menu_items (name, description, price_kes, category, image_url, available)
    VALUES 
      ('Chicken Biryani', 'Fragrant basmati rice with spiced chicken', 350, 'Rice', '/images/biryani.jpg', true),
      ('Beef Samosa', 'Crispy fried pastry with spiced beef filling', 50, 'Appetizers', '/images/samosa.jpg', true),
      ...
  "
  ```

### Verify Menu
- [ ] Test menu endpoint again:
  ```bash
  curl https://YOUR_SERVICE_NAME.render.com/api/menu
  # Should now return 10 menu items
  ```

## 🧪 Testing (10 minutes)

### Test Order Creation
```bash
# Get a menu item ID first
curl https://YOUR_SERVICE_NAME.render.com/api/menu | jq '.items[0].id'

# Create test order (replace with actual ID)
curl -X POST https://YOUR_SERVICE_NAME.render.com/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerName": "Test User",
    "customerEmail": "test@example.com",
    "customerPhone": "+254722000000",
    "fulfillmentType": "pickup",
    "items": [{"menuItemId": "ITEM_ID", "quantity": 1}],
    "notes": "Test order"
  }'

# Save the orderId from response
```

### Test Payment (M-Pesa)
```bash
curl -X POST https://YOUR_SERVICE_NAME.render.com/api/payments/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "paymentMethod": "mpesa"
  }'

# Should return: {"status":"initiated", "paymentMethod":"mpesa", ...}
```

### Test Payment (Card)
```bash
curl -X POST https://YOUR_SERVICE_NAME.render.com/api/payments/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "ORDER_ID",
    "paymentMethod": "card"
  }'

# Should return: {"status":"initiated", "checkoutUrl":"https://...", ...}
```

### Test Admin Endpoints
```bash
# List orders (use your ADMIN_API_KEY)
curl -H "Authorization: Bearer YOUR_ADMIN_API_KEY" \
  https://YOUR_SERVICE_NAME.render.com/api/admin/orders

# Should return: {"orders":[...], "total":..., ...}
```

## 📱 Frontend Integration (15 minutes)

### Update Frontend API URL
Edit files to reference your backend:

1. **src/App.tsx** (or create `.env.production`):
```typescript
const API_URL = 'https://YOUR_SERVICE_NAME.render.com';

// Fetch menu on component mount
useEffect(() => {
  fetch(`${API_URL}/api/menu`)
    .then(r => r.json())
    .then(data => setMenuItems(data.items));
}, []);

// Handle order submission
async function submitOrder(orderData) {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderData)
  });
  const order = await response.json();
  return order;
}

// Handle payment
async function initPayment(orderId, method) {
  const response = await fetch(`${API_URL}/api/payments/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, paymentMethod: method })
  });
  const payment = await response.json();
  if (payment.checkoutUrl) {
    window.location.href = payment.checkoutUrl; // Redirect to IntaSend
  }
}
```

### Build and Test Frontend
- [ ] Commit frontend changes
- [ ] Push to `main` branch
- [ ] GitHub Actions auto-deploys to GitHub Pages
- [ ] Visit `https://kirst3nn.github.io/Bitalabtesting`
- [ ] Test "Order Now" button → creates order
- [ ] Test payment flow (M-Pesa or Card)

## 🔐 Security Checklist

- [ ] ⚠️ Secret Key stored in Render env vars (NEVER in code)
- [ ] ⚠️ Admin API Key stored in Render env vars
- [ ] ⚠️ Webhook Secret stored in Render env vars
- [ ] ✅ `.env` file is in `.gitignore` (local development only)
- [ ] ✅ HTTPS enforced (Render handles this)
- [ ] ✅ CORS restricted to frontend origin
- [ ] ✅ Input validation enabled (email, phone, delivery address)

## 📊 Monitoring

### Check API Logs
- [ ] Go to Render dashboard
- [ ] Click **"Logs"** tab
- [ ] See real-time API activity
- [ ] Look for errors or slow queries

### Check Database
- [ ] Go to Render dashboard
- [ ] Click **"Databases"** tab
- [ ] View connection info and metrics
- [ ] Monitor disk usage

### Monitor Payment Webhooks
- [ ] Go to IntaSend dashboard
- [ ] Click **"Webhooks"** → **"Logs"**
- [ ] See list of webhook deliveries
- [ ] Check success/failure status

## 🆘 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Build fails** | Check logs; ensure `package.json` exists in `api/` |
| **Database connection error** | Wait 2-3 minutes for DB to initialize; restart service |
| **CORS error from frontend** | Verify `FRONTEND_ORIGIN` matches GitHub Pages URL |
| **Menu items not showing** | Run `npm run seed` in Render shell |
| **Payment fails** | Check IntaSend API keys; ensure phone format is correct |
| **Webhook not received** | Verify webhook URL in IntaSend settings; check Render logs |

## ✨ After Deployment

- [ ] Share backend URL with team: `https://YOUR_SERVICE_NAME.render.com`
- [ ] Document API keys securely (password manager)
- [ ] Set up GitHub secret for deployment (if needed)
- [ ] Monitor first few orders for payment flow
- [ ] Build admin dashboard for menu management
- [ ] Add order tracking feature for customers

## 📚 Documentation

- Full backend docs: [api/README.md](../api/README.md)
- API quick reference: [API-REFERENCE.md](../API-REFERENCE.md)
- Full deployment guide: [RENDER-DEPLOYMENT.md](../RENDER-DEPLOYMENT.md)
- Full project structure: [BACKEND-SETUP.md](../BACKEND-SETUP.md)

---

**Total estimated time: 40 minutes**

Once deployed, you'll have:
- ✅ Live backend API on Render
- ✅ PostgreSQL database with menu items
- ✅ M-Pesa + Card payment processing
- ✅ Admin API for menu/order management
- ✅ Frontend-backend integration ready

**Happy deploying! 🚀🍔**
