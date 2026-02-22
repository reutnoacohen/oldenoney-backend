const express = require("express");
const Order = require("../models/Order");
const TranzilaService = require("../services/TranzilaService");

const router = express.Router();

// Optional: set req.rawBody for signature verification (e.g. if using raw body parser for this path)
router.use((req, res, next) => {
  if (req.originalUrl === "/api/webhooks/tranzila" && req.body && typeof req.body === "object" && !req.rawBody) {
    req.rawBody = JSON.stringify(req.body);
  }
  next();
});

// POST /api/webhooks/tranzila
// Verify request authenticity, extract orderId, update order status, store raw payload. Return 200.
router.post("/tranzila", async (req, res) => {
  try {
    const { ok, data } = TranzilaService.verifyWebhook(req);
    if (!ok || !data) {
      return res.status(400).send("Invalid or unverified webhook");
    }

    // Extract orderId – use field names from Tranzila docs (orderId, order_id, reference, etc.)
    const orderId = data.orderId ?? data.order_id ?? data.reference;
    if (!orderId) {
      return res.status(200).send("OK");
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(200).send("OK");
    }

    // Security: amount must match order total (use field names from Tranzila docs)
    const payloadAmount = parseFloat(data.amount ?? data.sum ?? data.total ?? 0);
    const orderTotal = Number(order.total);
    if (payloadAmount > 0 && Math.abs(payloadAmount - orderTotal) > 0.01) {
      return res.status(200).send("OK");
    }

    // Response/status fields – adjust to Tranzila docs (Response, status, result, approved, etc.)
    const statusFromGateway = (data.status ?? data.Response ?? data.result ?? "").toString().toLowerCase();
    const approved = statusFromGateway === "approved" || statusFromGateway === "success" || data.approved === true || data.success === true;
    const declined = statusFromGateway === "failed" || statusFromGateway === "error" || statusFromGateway === "declined" || data.approved === false;

    const responseCode = data.responseCode ?? data.Response ?? data.response_code ?? data.code ?? null;
    const transactionId = data.transactionId ?? data.transaction_id ?? data.tranzilaTxnId ?? data.id ?? null;

    if (approved) {
      order.status = "paid";
    } else if (declined) {
      order.status = "failed";
    }

    order.tranzila.transactionId = transactionId ?? order.tranzila.transactionId;
    order.tranzila.responseCode = responseCode != null ? String(responseCode) : order.tranzila.responseCode;
    order.tranzila.rawResponse = typeof data === "object" ? { ...data } : data;
    await order.save();

    res.status(200).send("OK");
  } catch (e) {
    console.error("Tranzila webhook error:", e.message);
    res.status(500).send("Error");
  }
});

module.exports = router;
