const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: String, default: "" },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const tranzilaSchema = new mongoose.Schema(
  {
    terminalName: { type: String, default: "" },
    transactionId: { type: String, default: null },
    responseCode: { type: String, default: null },
    rawResponse: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    items: { type: [orderItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0 },
    shipping: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "ILS" },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "canceled"],
      default: "pending",
    },
    customer: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
    },
    tranzila: { type: tranzilaSchema, default: () => ({}) },
  },
  { timestamps: true, strict: false, collection: "orders" }
);

module.exports = mongoose.model("Order", orderSchema);
