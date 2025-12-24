# Core Module - Route Testing Guide

**Status:** ✅ **READY FOR TESTING**  
**Date:** Week 6

---

## 📋 **Routes to Test**

### **1. Authentication Routes**

#### `POST /api/auth/login`
- **Purpose:** User login
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Expected Response:** 200 OK with user, tenant, and token
- **Test Cases:**
  - ✅ Valid credentials
  - ✅ Invalid email
  - ✅ Invalid password
  - ✅ Missing fields

#### `POST /api/auth/register`
- **Purpose:** User registration
- **Request Body:**
  ```json
  {
    "email": "newuser@example.com",
    "password": "password123",
    "name": "New User",
    "tenantName": "New Company"
  }
  ```
- **Expected Response:** 201 Created with user and token
- **Test Cases:**
  - ✅ Valid registration
  - ✅ Duplicate email
  - ✅ Invalid email format
  - ✅ Weak password

#### `GET /api/auth/me`
- **Purpose:** Get current user
- **Headers:** `Authorization: Bearer <token>`
- **Expected Response:** 200 OK with user profile
- **Test Cases:**
  - ✅ Valid token
  - ✅ Invalid token
  - ✅ Missing token
  - ✅ Expired token

---

### **2. Admin Routes**

#### `GET /api/admin/tenants/[tenantId]/modules`
- **Purpose:** Get tenant's licensed modules
- **Headers:** `Authorization: Bearer <token>`
- **Expected Response:** 200 OK with licensedModules array
- **Test Cases:**
  - ✅ Valid tenant ID
  - ✅ Unauthorized access
  - ✅ Invalid tenant ID

#### `PATCH /api/admin/tenants/[tenantId]/modules`
- **Purpose:** Update tenant's licensed modules (admin only)
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "licensedModules": ["crm", "invoicing"]
  }
  ```
- **Expected Response:** 200 OK with updated tenant
- **Test Cases:**
  - ✅ Admin user can update
  - ✅ Non-admin cannot update
  - ✅ Invalid module IDs
  - ✅ Empty array

#### `POST /api/admin/reset-password`
- **Purpose:** Reset user password (dev only)
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "newPassword": "newpassword123"
  }
  ```
- **Expected Response:** 200 OK
- **Test Cases:**
  - ✅ Valid email
  - ✅ Invalid email
  - ✅ Only works in development

---

### **3. Settings Routes**

#### `GET /api/settings/profile`
- **Purpose:** Get user profile
- **Headers:** `Authorization: Bearer <token>`
- **Expected Response:** 200 OK with user profile
- **Test Cases:**
  - ✅ Valid token
  - ✅ Invalid token

#### `PATCH /api/settings/profile`
- **Purpose:** Update user profile
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "name": "Updated Name",
    "email": "newemail@example.com",
    "avatar": "https://example.com/avatar.jpg",
    "password": "newpassword123"
  }
  ```
- **Expected Response:** 200 OK with updated profile
- **Test Cases:**
  - ✅ Update name
  - ✅ Update email (check duplicate)
  - ✅ Update password
  - ✅ Update avatar

#### `GET /api/settings/tenant`
- **Purpose:** Get tenant settings
- **Headers:** `Authorization: Bearer <token>`
- **Expected Response:** 200 OK with tenant settings
- **Test Cases:**
  - ✅ Valid token
  - ✅ Invalid token

#### `PATCH /api/settings/tenant`
- **Purpose:** Update tenant settings
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "name": "Updated Company Name",
    "subdomain": "newsubdomain"
  }
  ```
- **Expected Response:** 200 OK with updated tenant
- **Test Cases:**
  - ✅ Update name
  - ✅ Update subdomain (check uniqueness)

#### `GET /api/settings/invoices`
- **Purpose:** Get invoice settings
- **Headers:** `Authorization: Bearer <token>`
- **Expected Response:** 200 OK with invoice settings
- **Test Cases:**
  - ✅ Valid token
  - ✅ Invalid token

#### `PATCH /api/settings/invoices`
- **Purpose:** Update invoice settings
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "invoicePrefix": "INV",
    "invoiceNumber": 1,
    "terms": "Payment due in 30 days"
  }
  ```
- **Expected Response:** 200 OK with updated settings
- **Test Cases:**
  - ✅ Update prefix
  - ✅ Update number
  - ✅ Update terms

#### `GET /api/settings/payment-gateway`
- **Purpose:** Get payment gateway settings
- **Headers:** `Authorization: Bearer <token>`
- **Expected Response:** 200 OK with payment gateway config
- **Test Cases:**
  - ✅ Valid token
  - ✅ Invalid token

#### `PATCH /api/settings/payment-gateway`
- **Purpose:** Update payment gateway settings
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "provider": "payaid",
    "apiKey": "encrypted_key",
    "apiSecret": "encrypted_secret"
  }
  ```
- **Expected Response:** 200 OK with updated config
- **Test Cases:**
  - ✅ Update provider
  - ✅ Update credentials
  - ✅ Encryption validation

---

### **4. OAuth2 Provider Routes**

#### `GET /api/oauth/authorize`
- **Purpose:** OAuth2 authorization endpoint
- **Query Parameters:**
  - `client_id`: OAuth2 client ID
  - `redirect_uri`: Redirect URI
  - `response_type`: Must be "code"
  - `state`: Optional state parameter
  - `scope`: Optional scope (default: "openid profile email")
- **Expected Response:** Redirect to redirect_uri with code
- **Test Cases:**
  - ✅ Valid client_id
  - ✅ Invalid client_id
  - ✅ Missing redirect_uri
  - ✅ User not logged in (redirects to login)
  - ✅ User logged in (generates code)

#### `POST /api/oauth/token`
- **Purpose:** Exchange authorization code for access token
- **Request Body:**
  ```json
  {
    "grant_type": "authorization_code",
    "code": "authorization_code",
    "redirect_uri": "https://module.example.com/callback",
    "client_id": "client_id"
  }
  ```
- **Expected Response:** 200 OK with access_token
- **Test Cases:**
  - ✅ Valid code
  - ✅ Invalid code
  - ✅ Expired code
  - ✅ Invalid grant_type

#### `GET /api/oauth/userinfo`
- **Purpose:** Get user info from access token
- **Headers:** `Authorization: Bearer <access_token>`
- **Expected Response:** 200 OK with user info
- **Test Cases:**
  - ✅ Valid access token
  - ✅ Invalid access token
  - ✅ Expired access token

---

## 🧪 **Testing Instructions**

### **Manual Testing**

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Use a tool like Postman, Insomnia, or curl to test each route**

3. **For authenticated routes, first get a token:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"user@example.com","password":"password123"}'
   ```

4. **Use the token in subsequent requests:**
   ```bash
   curl -X GET http://localhost:3000/api/auth/me \
     -H "Authorization: Bearer <token>"
   ```

### **Automated Testing (Future)**

Create test files using Jest or similar:
- `__tests__/auth.test.ts`
- `__tests__/admin.test.ts`
- `__tests__/settings.test.ts`
- `__tests__/oauth.test.ts`

---

## ✅ **Test Checklist**

- [ ] All auth routes work correctly
- [ ] All admin routes work correctly (with proper authorization)
- [ ] All settings routes work correctly
- [ ] All OAuth2 routes work correctly
- [ ] Error handling works for invalid inputs
- [ ] Token validation works correctly
- [ ] Database operations succeed
- [ ] Shared packages (@payaid/auth, @payaid/db) work correctly

---

## 📝 **Notes**

- All routes use shared packages from `packages/@payaid/*`
- Authentication is handled via JWT tokens
- OAuth2 routes require Redis for code storage
- Admin routes require owner/admin role
- Settings routes require valid authentication

