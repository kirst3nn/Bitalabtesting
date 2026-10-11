# 📚 Bite Lab - Documentation Index

Complete guide to your campus food delivery platform with frontend, backend, and payment integration.

## 🚀 Where to Start?

### If you're ready to deploy the backend:
→ **[DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)** (40 mins)
- Step-by-step checklist for Render deployment
- IntaSend setup instructions
- Environment variables guide
- Testing procedures
- Frontend integration steps

### If you want to understand the architecture:
→ **[BACKEND-SETUP.md](./BACKEND-SETUP.md)** (read in 10 mins)
- Full-stack project structure
- Frontend vs Backend separation
- Directory layout
- Deployment overview

### If you need API documentation:
→ **[api/README.md](./api/README.md)** (complete backend reference)
- All 15 API endpoints documented
- Request/response examples
- Database schema
- IntaSend integration guide
- Security features
- Troubleshooting

### If you need a quick API reference:
→ **[API-REFERENCE.md](./API-REFERENCE.md)** (quick lookup)
- All endpoints at a glance
- cURL examples
- Common issues & solutions

### If you need detailed deployment guide:
→ **[RENDER-DEPLOYMENT.md](./RENDER-DEPLOYMENT.md)** (detailed walkthrough)
- Render service setup
- Environment variable configuration
- Database verification
- Admin API key generation
- Payment webhook setup
- Frontend connection
- Troubleshooting

## 📖 Documentation Map

```
ROOT DIRECTORY
├── 🚀 DEPLOYMENT-CHECKLIST.md      ← START HERE FOR DEPLOYMENT
├── 📚 BACKEND-SETUP.md              ← Full project overview
├── 📡 RENDER-DEPLOYMENT.md          ← Detailed deployment guide
├── 🔌 API-REFERENCE.md              ← Quick API lookup
├── 📋 DEPLOYMENT.md                 ← Frontend deployment (GitHub Pages)
│
├── api/
│   ├── 📖 README.md                 ← Complete backend documentation
│   ├── .env.example                 ← Environment template
│   ├── render.yaml                  ← Render deployment config
│   └── src/
│       ├── index.js                 Express app entry point
│       ├── db/
│       │   ├── pool.js              PostgreSQL connection
│       │   ├── init.js              Database schema
│       │   └── seed.js              Sample menu data
│       ├── middleware/
│       │   ├── auth.js              API key verification
│       │   └── errors.js            Error handling
│       └── routes/
│           ├── menu.js              Public menu endpoint
│           ├── orders.js            Order creation
│           ├── payments.js          IntaSend integration
│           └── admin.js             Admin management
│
└── src/
    ├── App.tsx                      Landing page
    ├── styles.css                   Landing styles
    └── ...
```

## 🎯 Quick Navigation by Task

### Want to deploy the backend?
1. Read: [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)
2. Get IntaSend keys from [intasend.com](https://intasend.com)
3. Follow steps 1-4 in the checklist
4. Test endpoints with cURL examples

### Want to integrate frontend with backend?
1. Read: [API-REFERENCE.md](./API-REFERENCE.md) (quick endpoint overview)
2. Read: [api/README.md](./api/README.md) (full endpoint docs)
3. Update frontend to call `https://api-url/api/orders`
4. Build order form component
5. Connect payment UI to `/api/payments/checkout`

### Want to understand the full architecture?
1. Read: [BACKEND-SETUP.md](./BACKEND-SETUP.md) (full project structure)
2. Read: [DEPLOYMENT.md](./DEPLOYMENT.md) (frontend deployment)
3. Read: [api/README.md](./api/README.md) (backend details)

### Want API examples?
1. Read: [API-REFERENCE.md](./API-REFERENCE.md) (quick examples)
2. Or: [api/README.md](./api/README.md) → "API Endpoints" section

### Want to troubleshoot an issue?
1. Check: [api/README.md](./api/README.md) → "Troubleshooting" section
2. Or: [RENDER-DEPLOYMENT.md](./RENDER-DEPLOYMENT.md) → "Troubleshooting" section
3. Or: [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) → "Troubleshooting" table

### Want to manage admin operations?
1. Read: [api/README.md](./api/README.md) → "Admin Endpoints" section
2. Read: [API-REFERENCE.md](./API-REFERENCE.md) → "Admin Endpoints" section

## 📋 All Files & Their Purpose

### Root Level Documentation

| File | Purpose | Read Time |
|------|---------|-----------|
| **DEPLOYMENT-CHECKLIST.md** | Step-by-step deployment guide | 15 min |
| **BACKEND-SETUP.md** | Full project structure overview | 10 min |
| **RENDER-DEPLOYMENT.md** | Detailed Render deployment walkthrough | 15 min |
| **API-REFERENCE.md** | Quick API endpoint reference | 5 min |
| **DEPLOYMENT.md** | Frontend GitHub Pages deployment | 5 min |
| **README.md** (root) | Project summary | 2 min |

### Backend Documentation

| File | Purpose | Size |
|------|---------|------|
| **api/README.md** | Complete backend API documentation | 12 KB |
| **api/.env.example** | Environment variables template | 0.4 KB |
| **api/render.yaml** | Render deployment configuration | 0.8 KB |
| **api/package.json** | NPM dependencies | 0.5 KB |

### Backend Source Code

| File | Purpose | Lines |
|------|---------|-------|
| **api/src/index.js** | Express app entry point | 50 |
| **api/src/db/pool.js** | PostgreSQL connection pooling | 35 |
| **api/src/db/init.js** | Database schema creation | 100 |
| **api/src/db/seed.js** | Sample menu data | 80 |
| **api/src/middleware/auth.js** | API key authentication | 50 |
| **api/src/middleware/errors.js** | Error handling | 30 |
| **api/src/routes/menu.js** | GET /api/menu endpoint | 40 |
| **api/src/routes/orders.js** | POST /api/orders endpoint | 150 |
| **api/src/routes/payments.js** | IntaSend payment integration | 200 |
| **api/src/routes/admin.js** | Admin CRUD operations | 180 |

## 🔑 Key Information

### API URL After Deployment
```
https://bite-lab-api.render.com
(or whatever name you give it in Render)
```

### Frontend URL
```
https://kirst3nn.github.io/Bitalabtesting
```

### Environment Variables Needed
```
INTASEND_PUBLIC_KEY        (from intasend.com)
INTASEND_SECRET_KEY        (from intasend.com - PRIVATE!)
ADMIN_API_KEY              (generate with: openssl rand -hex 32)
WEBHOOK_SECRET             (generate with: openssl rand -hex 32)
FRONTEND_ORIGIN            (https://kirst3nn.github.io/Bitalabtesting)
```

### Fulfillment Fees
```
Pickup:  KES 200
Delivery: KES 300
```

### Database Tables
- `menu_items` - Food items for sale
- `orders` - Customer orders
- `order_items` - Items within orders
- `payments` - Payment records from IntaSend
- `admin_keys` - Admin API authentication

## 🚀 Deployment Steps (Summary)

1. **Get IntaSend Keys** (5 min)
   - Sign up at [intasend.com](https://intasend.com)
   - Copy API keys from Settings → API Keys

2. **Deploy to Render** (5 min)
   - Create web service at [render.com](https://render.com)
   - Root directory: `api/`
   - Add environment variables

3. **Seed Menu Data** (1 min)
   - Run `npm run seed` in Render shell

4. **Test Backend** (5 min)
   - Visit `https://api-url/health`
   - Visit `https://api-url/api/menu`

5. **Connect Frontend** (10 min)
   - Update API URL in React components
   - Push to main → GitHub Actions deploys

## 💡 Pro Tips

- **Don't commit `.env`** - It's already in `.gitignore`
- **Keep Secret Key private** - Use Render's environment variable management
- **Test in Sandbox first** - Use IntaSend's test keys before going live
- **Read DEPLOYMENT-CHECKLIST.md** - It's the fastest path to deployment
- **Check Render logs** - Great for debugging deployment issues
- **Seed data before testing** - Run `npm run seed` after deployment

## 🤝 Support

- **Backend issues?** → Check [api/README.md](./api/README.md)
- **Deployment stuck?** → Check [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)
- **API questions?** → Check [API-REFERENCE.md](./API-REFERENCE.md)
- **Architecture questions?** → Check [BACKEND-SETUP.md](./BACKEND-SETUP.md)
- **IntaSend help?** → Visit [intasend.com/docs](https://intasend.com/docs)
- **Render help?** → Visit [render.com/docs](https://render.com/docs)

## ✨ What You Have

✅ Complete Node.js backend ready to deploy
✅ PostgreSQL database with auto-schema creation
✅ IntaSend payment integration (M-Pesa + Card)
✅ Admin API for menu/order management
✅ 15 API endpoints fully documented
✅ Sample menu data (10 items)
✅ Security best practices implemented
✅ Production-ready deployment config
✅ Comprehensive documentation (40KB+)
✅ Step-by-step deployment guide

## 📞 Questions?

1. **Deployment question?** → [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md)
2. **API question?** → [API-REFERENCE.md](./API-REFERENCE.md)
3. **Backend question?** → [api/README.md](./api/README.md)
4. **Architecture question?** → [BACKEND-SETUP.md](./BACKEND-SETUP.md)

---

**Happy building! 🍔🚀**

Start with [DEPLOYMENT-CHECKLIST.md](./DEPLOYMENT-CHECKLIST.md) to get your backend live in ~40 minutes.
