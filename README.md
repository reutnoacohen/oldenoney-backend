אוקי תכ# Backend

Node.js + Express + MongoDB (Mongoose). Leads API, Admin CRM, Checkout with Tranzila.

## Run

```bash
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI, ADMIN_KEY, JWT_SECRET, ADMIN_SETUP_KEY, Tranzila vars
node server.js
```

Server runs on `PORT` (default 8080).

## Tranzila (payments)

- **POST /api/checkout/create** – body: `{ items, customer: { name, email, phone }, shippingAddress? }`. Backend computes total. Returns `{ orderId, checkoutUrl }`.
- **GET /api/checkout/order/:orderId** – returns order (status: pending / paid / failed).
- Webhook: **POST /api/webhooks/tranzila** – Tranzila callbacks; do not require auth.

### Env

- `TRANZILA_TERMINAL` – terminal name from Tranzila.
- `TRANZILA_API_KEY` or `TRANZILA_ACCESS_TOKEN` – API key (per Tranzila docs).
- `TRANZILA_SANDBOX=true` – use sandbox.
- `APP_BASE_URL` – base URL for success/fail redirects and webhook (e.g. `https://your-site.com`).
- `TRANZILA_WEBHOOK_SECRET` – optional; if Tranzila signs webhooks, set this and the code will verify.

### Tranzila Dashboard

1. Set **success URL** to: `{APP_BASE_URL}/checkout/success?orderId=...` (or let the API send it per request).
2. Set **failure URL** to: `{APP_BASE_URL}/checkout/fail?orderId=...`.
3. Set **webhook / notify URL** to: `{APP_BASE_URL}/api/webhooks/tranzila` (must be HTTPS in production).

### Sandbox

- Use `TRANZILA_SANDBOX=true` and Tranzila test terminal/key.
- Expose local server with ngrok (or similar) and set `APP_BASE_URL` to the public URL so Tranzila can reach the webhook.

## Security

- Totals are computed only on the backend; frontend amounts are ignored.
- No card data (CVV, full number) is stored.
- Do not log API keys or secrets.
