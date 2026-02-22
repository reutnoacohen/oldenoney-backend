require("dotenv").config();

// Workaround for querySrv ECONNREFUSED on Windows (DNS SRV lookup fails with system DNS)
require("node:dns").setServers(["1.1.1.1", "8.8.8.8"]);

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Lead = require("./models/Lead");
const requireAuth = require("./middleware/requireAuth");
const leadsAdminRouter = require("./routes/leads.admin");
const adminAuthRouter = require("./routes/admin.auth");
const checkoutRouter = require("./routes/checkout");
const webhooksRouter = require("./routes/webhooks");
const ordersRouter = require("./routes/orders");
const contactRouter = require("./routes/contact");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true, message: "API is up" }));

// Admin auth (no auth required): setup + login
app.use("/api/admin", adminAuthRouter);
// Admin CRM API (protected: JWT Bearer or x-admin-key)
app.use("/api/admin/leads", requireAuth, leadsAdminRouter);

// Checkout & Tranzila
app.use("/api/checkout", checkoutRouter);
app.use("/api/webhooks", webhooksRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/contact", contactRouter);

// POST /api/leads – save a new lead (body: name, email, phone, message, source, utm or utmSource/utmMedium/...)
app.post("/api/leads", async (req, res) => {
  try {
    const utm = req.body.utm && typeof req.body.utm === "object"
      ? req.body.utm
      : {
          source: req.body.utmSource ?? "",
          medium: req.body.utmMedium ?? "",
          campaign: req.body.utmCampaign ?? "",
          content: req.body.utmContent ?? "",
          term: req.body.utmTerm ?? "",
        };
    const data = {
      ...req.body,
      source: req.body.source ?? "website",
      utm,
      status: "new",
      notes: Array.isArray(req.body.notes) ? req.body.notes : [],
      tags: Array.isArray(req.body.tags) ? req.body.tags : [],
      lastContactedAt: req.body.lastContactedAt ?? null,
      nextFollowUpAt: req.body.nextFollowUpAt ?? null,
    };
    delete data.utmSource;
    delete data.utmMedium;
    delete data.utmCampaign;
    delete data.utmContent;
    delete data.utmTerm;
    const lead = new Lead(data);
    await lead.save();
    res.status(201).json({ ok: true, lead });
  } catch (e) {
    console.error("Lead save error:", e.message);
    // כפילות אימייל+טלפון (Unique Index)
    if (e.code === 11000) {
      res.status(409).json({
        ok: false,
        error: "ליד עם אימייל וטלפון אלה כבר נשלח. לא ניתן לשלוח שוב.",
      });
      return;
    }
    res.status(500).json({ ok: false, error: "Failed to save lead" });
  }
});

app.get("/api/leads", async (req, res) => {
  try {
    const leads = await Lead.find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ ok: true, leads });
  } catch (e) {
    console.error("Leads fetch error:", e.message);
    res.status(500).json({ ok: false, error: "Failed to load leads" });
  }
});

// Global error handler – always return JSON so frontend never gets empty body
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);
  if (res.headersSent) return next(err);
  res.status(500).json({ ok: false, error: err.message || "Internal Server Error" });
});

async function start() {
  const port = process.env.PORT || 8080;
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes("***")) {
    console.error("❌ Set MONGODB_URI in .env with your real password (same as in MongoDB Compass).");
    process.exit(1);
  }

  try {
    console.log("MONGODB_URI exists?", !!process.env.MONGODB_URI);

    await mongoose.connect(uri);
    console.log("✅ MongoDB connected (same DB as Compass – check database 'leads')");
  } catch (e) {
    console.error("❌ MongoDB connection failed:", e.message);
    process.exit(1);
  }

  app.listen(port, () => console.log("🚀 Server running on", port));
}

start();
