const mongoose = require("mongoose");

const utmSchema = new mongoose.Schema(
  {
    source: { type: String, default: "" },
    medium: { type: String, default: "" },
    campaign: { type: String, default: "" },
    content: { type: String, default: "" },
    term: { type: String, default: "" },
  },
  { _id: false }
);

const leadSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    subject: { type: String, default: "" },
    message: { type: String, default: "" },
    source: { type: String, default: "website" },
    utm: { type: utmSchema, default: () => ({}) },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "won", "lost", "spam"],
      default: "new",
    },
    notes: {
      type: [{ text: { type: String }, at: { type: Date, default: Date.now } }],
      default: [],
    },
    tags: { type: [String], default: [] },
    lastContactedAt: { type: Date, default: null },
    nextFollowUpAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false, collection: "leads" }
);

// מניעת כפילויות: אותו זוג אימייל+טלפון נשמר רק פעם אחת (אותו אימייל עם טלפון שונה מותר)
leadSchema.index({ email: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model("Lead", leadSchema);
