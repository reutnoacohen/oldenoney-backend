/**
 * Tranzila Hosted Checkout (Redirect) integration.
 * Fill in endpoint path and response field names per official Tranzila docs:
 * https://docs.tranzila.com (Payment Request / Hosted Checkout / Redirect)
 */

const https = require("https");
const crypto = require("crypto");

// Base URLs – adjust per Tranzila documentation (sandbox vs production)
const SANDBOX_BASE = "https://secure5.tranzila.com";
const PROD_BASE = "https://secure5.tranzila.com";

function getBaseUrl() {
  const sandbox = process.env.TRANZILA_SANDBOX === "true" || process.env.TRANZILA_SANDBOX === "1";
  return sandbox ? SANDBOX_BASE : PROD_BASE;
}

/**
 * Build Tranzila hosted payment request and return checkout URL.
 * Request body field names (terminal_name, amount, success_url, etc.) follow common
 * hosted-checkout patterns; confirm exact names in Tranzila docs.
 *
 * @param {object} order - Order doc with _id, total, currency, customer, tranzila.terminalName
 * @returns {Promise<{ checkoutUrl: string, tranzilaMeta?: { transactionId?, raw? } }>}
 */
async function createPaymentForOrder(order) {
  const terminal = process.env.TRANZILA_TERMINAL || order.tranzila?.terminalName || "";
  const apiKey = process.env.TRANZILA_API_KEY || "";
  const baseUrl = getBaseUrl();
  const appBase = (process.env.APP_BASE_URL || "").replace(/\/$/, "");
  const orderId = String(order._id);

  if (!terminal) {
    throw new Error("Tranzila config missing: TRANZILA_TERMINAL");
  }

  const successUrl = `${appBase}/checkout/success?orderId=${encodeURIComponent(orderId)}`;
  const failureUrl = `${appBase}/checkout/fail?orderId=${encodeURIComponent(orderId)}`;
  const notifyUrl = `${appBase}/api/webhooks/tranzila`;

  // Hosted checkout payload – adjust field names to match Tranzila API docs exactly
  const payload = {
    terminal_name: terminal,
    amount: Number(order.total).toFixed(2),
    currency: order.currency || "ILS",
    orderId: orderId,
    success_url: successUrl,
    failure_url: failureUrl,
    notify_url: notifyUrl,
  };

  // If Tranzila requires API key in header or body, add here (see docs)
  if (apiKey) {
    payload.api_key = apiKey;
    // Or use Authorization header below; uncomment per docs
    // payload.token = apiKey;
  }

  const body = JSON.stringify(payload);
  // Endpoint path – replace with actual Tranzila Hosted Checkout / Payment Request path from docs
  const path = "/api/v2/payment-request";
  const url = new URL(path, baseUrl);

  const result = await new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (ch) => (data += ch));
        res.on("end", () => {
          try {
            const parsed = data ? JSON.parse(data) : {};
            if (res.statusCode >= 400) {
              const msg = parsed.message || parsed.error || `Tranzila ${res.statusCode}`;
              reject(new Error(msg));
              return;
            }
            // Response field for redirect URL – use the name from Tranzila docs (checkout_url, redirect_url, url, etc.)
            const checkoutUrl =
              parsed.checkout_url ||
              parsed.checkoutUrl ||
              parsed.redirect_url ||
              parsed.redirectUrl ||
              parsed.url ||
              parsed.payment_url;
            if (!checkoutUrl) {
              reject(new Error("Tranzila did not return checkout URL. Check response shape in docs."));
              return;
            }
            resolve({
              checkoutUrl,
              tranzilaMeta: {
                transactionId: parsed.transaction_id ?? parsed.transactionId ?? parsed.id ?? null,
                raw: parsed,
              },
            });
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });

  return result;
}

/**
 * Verify webhook authenticity (signature / token per Tranzila docs).
 * If Tranzila provides a signing secret and signature header, set TRANZILA_WEBHOOK_SECRET in env.
 *
 * @param {object} req - Express req (body; optional req.rawBody for signature verification)
 * @returns {{ ok: boolean, data?: object }}
 */
function verifyWebhook(req) {
  const secret = process.env.TRANZILA_WEBHOOK_SECRET || "";
  const body = req.body;
  if (!body || typeof body !== "object") {
    return { ok: false };
  }

  const signature = req.headers["x-tranzila-signature"] || req.headers["x-signature"] || "";
  if (secret && signature) {
    const raw = typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(body);
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    try {
      const a = Buffer.from(expected, "utf8");
      const b = Buffer.from(signature, "utf8");
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false };
    } catch (_) {
      return { ok: false };
    }
  }

  return { ok: true, data: body };
}

module.exports = {
  createPaymentForOrder,
  verifyWebhook,
};
