# PayAid Core Module

**Status:** ⏳ **IN PROGRESS**  
**Purpose:** Core authentication, billing, and admin functionality

This is the core module that will be extracted into a separate repository (`payaid-core`) in Phase 2.

---

## 📁 **Structure**

```
core-module/
├── app/
│   ├── api/
│   │   ├── auth/          # Authentication endpoints
│   │   ├── admin/         # Admin endpoints
│   │   ├── settings/      # Settings endpoints
│   │   └── oauth/         # OAuth2 provider endpoints
│   ├── dashboard/
│   │   ├── admin/         # Admin dashboard
│   │   └── settings/      # Settings pages
│   ├── login/
│   ├── register/
│   └── app-store/         # Phase 3
└── lib/
    └── redis/             # Redis client for OAuth2
```

---

## 🔧 **Setup**

This module uses shared packages from `packages/@payaid/*`.

**Note:** This is a template structure. In the actual Phase 2 implementation, this will be a separate Next.js repository.

---

## 📋 **Routes**

### **Auth Routes:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user

### **OAuth2 Provider Routes:**
- `GET /api/oauth/authorize` - Authorization endpoint
- `POST /api/oauth/token` - Token exchange
- `GET /api/oauth/userinfo` - User info endpoint

### **Admin Routes:**
- `GET/PATCH /api/admin/tenants/[tenantId]/modules` - Module management
- `POST /api/admin/reset-password` - Password reset (dev only)

### **Settings Routes:**
- `GET/PATCH /api/settings/profile` - User profile
- `GET/PATCH /api/settings/tenant` - Tenant settings
- `GET/PATCH /api/settings/invoices` - Invoice settings
- `GET/PATCH /api/settings/payment-gateway` - Payment gateway

---

**Status:** ⏳ **IN PROGRESS**
