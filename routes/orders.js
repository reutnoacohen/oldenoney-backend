const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");

const router = express.Router();

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

// GET /api/orders/:orderId – frontend uses this to confirm payment status
router.get("/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    if (!isValidObjectId(orderId)) {
      return res.status(400).json({ ok: false, error: "Invalid orderId" });
    }
    const order = await Order.findById(orderId).lean();
    if (!order) {
      return res.status(404).json({ ok: false, error: "Order not found" });
    }
    res.json({ ok: true, order });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || "Failed to load order" });
  }
});

module.exports = router;
