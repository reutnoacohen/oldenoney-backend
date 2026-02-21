const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const AdminUser = require("../models/AdminUser");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const SETUP_KEY = process.env.ADMIN_SETUP_KEY;

// POST /api/admin/setup – create first admin (one-time, requires ADMIN_SETUP_KEY)
router.post("/setup", async (req, res) => {
  try {
    const { setupKey, username, password } = req.body || {};
    if (!SETUP_KEY) {
      return res.status(503).json({ ok: false, error: "Setup not configured (ADMIN_SETUP_KEY missing)." });
    }
    if (setupKey !== SETUP_KEY) {
      return res.status(403).json({ ok: false, error: "Invalid setup key." });
    }
    const u = (username || "").trim();
    const p = password;
    if (!u || !p || p.length < 6) {
      return res.status(400).json({ ok: false, error: "Username and password (min 6 chars) required." });
    }
    const existing = await AdminUser.countDocuments();
    if (existing > 0) {
      return res.status(409).json({ ok: false, error: "Admin already exists. Use login." });
    }
    const passwordHash = await bcrypt.hash(p, 10);
    await AdminUser.create({ username: u, passwordHash });
    res.status(201).json({ ok: true, message: "Admin created. Use /api/admin/login to sign in." });
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ ok: false, error: "Username already taken." });
    }
    console.error("Admin setup error:", e.message);
    res.status(500).json({ ok: false, error: e.message || "Setup failed." });
  }
});

// POST /api/admin/login – returns JWT
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const u = (username || "").trim();
    if (!u || !password) {
      return res.status(400).json({ ok: false, error: "Username and password required." });
    }
    const admin = await AdminUser.findOne({ username: u });
    if (!admin) {
      return res.status(401).json({ ok: false, error: "Invalid username or password." });
    }
    const match = await bcrypt.compare(password, admin.passwordHash);
    if (!match) {
      return res.status(401).json({ ok: false, error: "Invalid username or password." });
    }
    const token = jwt.sign(
      { id: admin._id.toString(), username: admin.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ ok: true, token, username: admin.username });
  } catch (e) {
    console.error("Admin login error:", e.message);
    res.status(500).json({ ok: false, error: e.message || "Login failed." });
  }
});

module.exports = router;
