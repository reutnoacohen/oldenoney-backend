const express = require("express");
const Order = require("../models/Order");
const TranzilaService = require("../services/TranzilaService");

const router = express.Router();

/**
 * Calculate totals on server only. Do not trust frontend amounts.
 */
function computeTotals(items, shippingAmount) {
  const qty = (it) => Math.max(1, parseInt(it.quantity ?? it.qty, 10) || 1);
  const subtotal = (items || []).reduce((sum, it) => sum + (Number(it.price) || 0) * qty(it), 0);
  const shipping = Number(shippingAmount) >= 0 ? Number(shippingAmount) : 0;
  const total = Math.round((subtotal + shipping) * 100) / 100;
  return { subtotal, shipping, total };
}

// POST /api/checkout/create
router.post("/create", async (req, res) => {
  try {
    const { items, customer, shippingAddress } = req.body || {};
    const customerObj = customer && typeof customer === "object" ? customer : {};
    const list = Array.isArray(items) ? items : [];

    if (list.length === 0) {
      return res.status(400).json({ ok: false, error: "items required and must be non-empty" });
    }

    const terminalName = process.env.TRANZILA_TERMINAL || "";
    const { subtotal, shipping, total } = computeTotals(list, req.body.shipping);

    const order = new Order({
      items: list.map((it) => ({
        productId: it.productId ?? "",
        name: String(it.name || ""),
        price: Number(it.price) || 0,
        quantity: Math.max(1, parseInt(it.quantity ?? it.qty, 10) || 1),
      })),
      subtotal,
      shipping,
      total,
      currency: "ILS",
      status: "pending",
      customer: {
        name: String(customerObj.name ?? ""),
        email: String(customerObj.email ?? ""),
        phone: String(customerObj.phone ?? ""),
      },
      tranzila: { terminalName },
    });
    await order.save();

    const { checkoutUrl, tranzilaMeta } = await TranzilaService.createPaymentForOrder(order);

    if (tranzilaMeta?.transactionId != null) {
      order.tranzila.transactionId = tranzilaMeta.transactionId;
      await order.save();
    }

    return res.status(201).json({
      ok: true,
      orderId: String(order._id),
      checkoutUrl,
    });
  } catch (e) {
    if (!res.headersSent) {
      const status = e.message && e.message.includes("config missing") ? 503 : 500;
      res.status(status).json({ ok: false, error: e.message || "Checkout failed" });
    }
  }
});

module.exports = router;
