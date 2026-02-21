# Admin CRM API – Leads

Admin **leads** routes require authentication: either **JWT** (after login) or **`x-admin-key`** (optional fallback).

Base URL: `http://localhost:8080` (or your `PORT`). Replace `LEAD_ID` and `YOUR_TOKEN` in examples.

---

## 1. Admin auth (login with username + password)

### Environment variables (.env)

```env
JWT_SECRET=your-long-random-secret-for-signing-tokens
ADMIN_SETUP_KEY=one-time-secret-to-create-first-admin
ADMIN_KEY=optional-fallback-api-key-for-scripts
```

- **JWT_SECRET** – used to sign login tokens; set a long random string.
- **ADMIN_SETUP_KEY** – required only for creating the first admin (see Setup below).
- **ADMIN_KEY** – optional; if set, you can still call admin leads API with header `x-admin-key` instead of JWT.

### Create first admin (one-time): POST /api/admin/setup

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"setupKey":"YOUR_ADMIN_SETUP_KEY","username":"admin","password":"YourSecurePassword123"}' \
  "http://localhost:8080/api/admin/setup"
```

- **setupKey** must equal `ADMIN_SETUP_KEY` from .env.
- **password** minimum 6 characters.
- After the first admin exists, this returns 409.

### Login: POST /api/admin/login

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourSecurePassword123"}' \
  "http://localhost:8080/api/admin/login"
```

**Response:** `{ "ok": true, "token": "eyJ...", "username": "admin" }`

Use the **token** in the **Authorization** header for all admin leads requests:  
`Authorization: Bearer <token>`

---

## 2. Admin leads API (require JWT or x-admin-key)

### Example: GET /api/admin/leads – list leads (paginated, filterable)

```bash
# With JWT (after login)
curl -s -H "Authorization: Bearer YOUR_TOKEN" "http://localhost:8080/api/admin/leads"

# With query params
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8080/api/admin/leads?q=john&status=new&source=website&from=2025-01-01&to=2025-12-31&page=1&limit=20"

# Or with x-admin-key (if ADMIN_KEY is set in .env)
curl -s -H "x-admin-key: YOUR_ADMIN_KEY" "http://localhost:8080/api/admin/leads"
```

**Query params:**

| Param  | Description                                      |
|--------|--------------------------------------------------|
| `q`    | Search by name / email / phone (partial match)   |
| `status` | Filter by status (new, contacted, qualified, won, lost, spam) |
| `source` | Filter by source                                |
| `from` | ISO date – filter createdAt >= from              |
| `to`   | ISO date – filter createdAt <= to                |
| `page` | Page number (default 1)                         |
| `limit`| Items per page (default 20, max 100)            |

**Response:** `{ ok: true, items: [...], page, limit, total, totalPages }`

---

### 2. GET /api/admin/leads/:id – get one lead

```bash
curl -s -H "Authorization: Bearer YOUR_TOKEN" "http://localhost:8080/api/admin/leads/LEAD_ID"
```

**Response:** `{ ok: true, lead: { ... } }`  
**404** if not found or soft-deleted.

---

### 3. PATCH /api/admin/leads/:id – update lead

Allowed fields: `status`, `source`, `name`, `email`, `phone`, `subject`, `message`, `tags`, `nextFollowUpAt`, `lastContactedAt`.

```bash
curl -s -X PATCH \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"contacted","nextFollowUpAt":"2025-02-20T10:00:00.000Z"}' \
  "http://localhost:8080/api/admin/leads/LEAD_ID"
```

**Response:** `{ ok: true, lead: { ... } }` (updated lead).  
**409** if update would create duplicate email/phone.

---

### 4. POST /api/admin/leads/:id/notes – add note

```bash
curl -s -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Called back, will decide next week."}' \
  "http://localhost:8080/api/admin/leads/LEAD_ID/notes"
```

**Response:** `{ ok: true, lead: { ... } }` (lead with new note in `notes[]`).

---

### 5. DELETE /api/admin/leads/:id – soft delete

```bash
curl -s -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:8080/api/admin/leads/LEAD_ID"
```

**Response:** `{ ok: true, lead: { ... } }` (lead with `isDeleted: true`).  
Soft-deleted leads are excluded from GET list and GET by id.

---

## Error handling

- **400** – Invalid MongoDB ObjectId for `:id`.
- **401** – Missing or invalid JWT / `x-admin-key`.
- **404** – Lead not found or soft-deleted.
- **409** – Duplicate key (e.g. email or phone already used by another lead).
- **500** – Server error (body includes `{ ok: false, error: "..." }`).
