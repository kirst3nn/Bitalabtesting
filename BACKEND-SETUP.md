# Bite Lab - Full Stack Campus Food Delivery Platform

A modern campus food delivery platform built with React/Vite frontend and Node.js/PostgreSQL backend, integrated with IntaSend for M-Pesa and card payments.

## 📁 Project Structure

```
.
├── src/                          # React frontend (Vite)
│   ├── App.tsx                  # Main landing page component
│   ├── styles.css               # Landing page styles
│   └── ...
├── index.html                    # Frontend entry point
├── vite.config.ts               # Vite config (GitHub Pages base path)
├── package.json                 # Frontend dependencies
│
├── api/                          # Node.js backend (Express)
│   ├── src/
│   │   ├── index.js             # Express app entry point
│   │   ├── db/                  # Database (PostgreSQL)
│   │   ├── routes/              # API endpoints (menu, orders, payments, admin)
│   │   └── middleware/          # Auth, error handling
│   ├── package.json             # Backend dependencies
│   ├── .env.example             # Environment template
│   ├── render.yaml              # Render deployment config
│   └── README.md                # Backend documentation
│
├── .github/
│   └── workflows/
│       └── deploy-pages.yml     # GitHub Actions workflow (frontend)
├── DEPLOYMENT.md                # Deployment guide
└── README.md                    # This file

```

## 🚀 Quick Start

### Frontend (React + Vite)

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Preview built site
npm run preview
```

Frontend runs on `http://localhost:5173` locally and deploys to **GitHub Pages** at:
- `https://kirst3nn.github.io/Bitalabtesting`

### Backend (Node.js + PostgreSQL)

```bash
cd api

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your database and IntaSend credentials
# Then start the server:

npm run dev      # Development with auto-reload
npm start        # Production mode
npm run seed     # Seed sample menu data
```

Backend runs on `http://localhost:3000` locally and deploys to **Render** at:
- `https://bite-lab-api.render.com` (or your Render URL)

## 🍔 Features

### Frontend
- ✅ Static landing page (Bite Lab branding)
- ✅ Privacy Policy & Terms of Service pages
- ✅ Responsive design (mobile-friendly)
- ✅ GitHub Pages hosting (free)
- [ ] Order form UI (menu selection, checkout)
- [ ] Order tracking page
- [ ] Admin dashboard

### Backend API
- ✅ **Public Endpoints**
  - GET `/api/menu` - List food items
  - GET `/api/menu/categories` - List categories
  - POST `/api/orders` - Create order
  - GET `/api/orders/:id` - Check order status
  - POST `/api/payments/checkout` - Initiate payment (M-Pesa or Card)
  - GET `/api/payments/status/:invoiceId` - Check payment status
  
- ✅ **Admin Endpoints** (API key required)
  - CRUD operations on menu items
  - Order management and status updates
  - Admin API key generation

- ✅ **Payment Integration**
  - M-Pesa STK Push (direct payment prompt on phone)
  - Card payments (Visa/Mastercard) via IntaSend checkout
  - Kenyan Shillings (KES) currency
  - Fulfillment fees: KES 200 (pickup), KES 300 (delivery)

- ✅ **Security**
  - Input validation (email, Kenyan phone format)
  - SQL injection prevention (parameterized queries)
  - API key authentication (SHA256 hashed)
  - CORS restrictions
  - HTML sanitization

- ✅ **Database**
  - PostgreSQL with proper indexes
  - Optimized for high-traffic queries
  - Transactional order creation

## 🔧 Configuration

### Frontend Environment

Frontend environment is embedded in `vite.config.ts` (GitHub Pages auto-detection):
- Automatically sets `base` path for GitHub Pages project sites
- No `.env` needed for landing page

### Backend Environment

Create `api/.env` (copy from `api/.env.example`):

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/bitelab

INTASEND_PUBLIC_KEY=your_intasend_publishable_key
INTASEND_SECRET_KEY=your_intasend_secret_key
INTASEND_TEST_MODE=true

ADMIN_API_KEY=generate-a-random-api-key
FRONTEND_ORIGIN=http://localhost:5173
WEBHOOK_SECRET=generate-a-random-webhook-secret
```

## 📦 Getting IntaSend API Keys

1. Go to [intasend.com](https://intasend.com)
2. Sign up and create an account
3. Navigate to Settings → API Keys
4. Copy **Publishable Key** (public) and **Secret Key** (private)
5. For testing, use "Sandbox" environment keys
6. For production, use "Live" environment keys

## 🌐 Deployment

### Frontend (GitHub Pages)

Automatic via GitHub Actions on every push to `main`:

1. ✅ Already configured in `.github/workflows/deploy-pages.yml`
2. ✅ Builds and deploys to `https://kirst3nn.github.io/Bitalabtesting`
3. Make sure GitHub Pages source is set to "GitHub Actions" in Settings → Pages

### Backend (Render)

One-click deployment using `api/render.yaml`:

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select branch (`main`) and root directory (`api/`)
5. Add environment variables:
   - `INTASEND_PUBLIC_KEY`
   - `INTASEND_SECRET_KEY`
   - `ADMIN_API_KEY`
   - `WEBHOOK_SECRET`
6. Deploy! Render auto-creates PostgreSQL database

See [api/README.md](./api/README.md) for detailed backend deployment steps.

## 📡 API Endpoints

### Public (No Auth Required)

```bash
# List all menu items
GET /api/menu

# Get specific order status
GET /api/orders/:orderId

# Create new order
POST /api/orders
Body: {
  "customerName": "John",
  "customerEmail": "john@example.com",
  "customerPhone": "+254722000000",
  "fulfillmentType": "delivery",
  "deliveryAddress": "Campus Gate 2",
  "items": [
    {"menuItemId": "uuid", "quantity": 2}
  ]
}

# Initiate payment (M-Pesa or Card)
POST /api/payments/checkout
Body: {
  "orderId": "uuid",
  "paymentMethod": "card" // or "mpesa"
}

# Check payment status
GET /api/payments/status/:invoiceId
```

### Admin (API Key Required)

Add header: `Authorization: Bearer <YOUR_ADMIN_API_KEY>`

```bash
# Menu management
POST   /api/admin/menu          # Create
PUT    /api/admin/menu/:id      # Update
DELETE /api/admin/menu/:id      # Delete

# Order management
GET    /api/admin/orders        # List all
GET    /api/admin/orders/:id    # Get single
PUT    /api/admin/orders/:id    # Update status

# API Keys
POST   /api/admin/keys          # Create new API key
```

See [api/README.md](./api/README.md) for full API documentation.

## 🛠️ Development Workflow

### Adding a Feature

1. **Frontend**: Edit files in `src/`, test with `npm run dev`
2. **Backend**: Edit files in `api/src/`, test with `npm run dev` in `api/` folder
3. **Commit**: Push to GitHub and create a PR
4. **Deploy**: Merge to `main` and GitHub Actions auto-deploys both frontend and backend

### Database Migrations

For now, schema is auto-created on first run via `src/db/init.js`. To add new tables:

1. Update `api/src/db/init.js`
2. Restart the API server
3. New tables/indexes will be created

### Seeding Menu Data

```bash
cd api
npm run seed
```

Adds sample menu items to the database. Customize items in `api/src/db/seed.js`.

## 📚 Important Files

| File | Purpose |
|------|---------|
| [src/App.tsx](./src/App.tsx) | Main React component (landing page) |
| [src/styles.css](./src/styles.css) | Landing page styles |
| [vite.config.ts](./vite.config.ts) | Vite build config (GitHub Pages support) |
| [api/src/index.js](./api/src/index.js) | Express app entry point |
| [api/src/db/init.js](./api/src/db/init.js) | Database schema |
| [api/.env.example](./api/.env.example) | Backend environment template |
| [.github/workflows/deploy-pages.yml](./.github/workflows/deploy-pages.yml) | Frontend auto-deploy |
| [api/render.yaml](./api/render.yaml) | Backend deployment config |

## 🔐 Security Checklist

- ✅ Secrets stored in environment variables (never committed)
- ✅ Frontend origin restricted in CORS
- ✅ Input validation on all API endpoints
- ✅ Parameterized SQL queries (no injection)
- ✅ API key hashing (SHA256)
- ✅ HTTPS enforced in production
- ⚠️ TODO: Add rate limiting for production
- ⚠️ TODO: Enhance webhook signature verification

## 🧪 Testing

### Frontend
```bash
npm run build
npm run preview
```

### Backend
```bash
cd api

# Health check
curl http://localhost:3000/health

# Get menu
curl http://localhost:3000/api/menu

# Create test order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"customerName":"Test","customerEmail":"test@test.com","customerPhone":"+254722000000","fulfillmentType":"pickup","items":[{"menuItemId":"...","quantity":1}]}'
```

## 📈 Next Steps

1. **Frontend Order Flow**
   - Create order form component (menu selection, customer details)
   - Connect to backend `/api/orders` endpoint
   - Display order confirmation

2. **Payment Integration**
   - Add payment method selector (M-Pesa vs Card)
   - Call `/api/payments/checkout` endpoint
   - Redirect to IntaSend for card payments
   - Show STK prompt for M-Pesa

3. **Order Tracking**
   - Create tracking page (check order status in real-time)
   - Display order items, fulfillment time, pickup/delivery location

4. **Admin Dashboard**
   - Menu management UI (add/edit/delete items)
   - Order queue view (pending → preparing → ready → collected)
   - Analytics (daily orders, revenue, top items)

5. **Production Hardening**
   - Add rate limiting (express-rate-limit)
   - Improve webhook signature verification
   - Set up error tracking (Sentry)
   - Add uptime monitoring

## 📞 Support

- **Frontend Issues**: Check [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Backend Issues**: Check [api/README.md](./api/README.md)
- **IntaSend Help**: Visit [intasend.com/docs](https://intasend.com/docs)

---

**Built with ❤️ for Bite Lab – Campus Food Delivery for Kenya**
