const express = require("express");
const mongoose = require("mongoose");
const Lead = require("../models/Lead");

const router = express.Router();

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

function handleDuplicateKey(res, err) {
  if (err.code === 11000) {
    res.status(409).json({
      ok: false,
      error: "Duplicate email or phone (already used by another lead).",
    });
    return true;
  }
  return false;
}

// GET /api/admin/leads – list with filters and pagination
router.get("/", async (req, res) => {
  try {
    const {
      q,
      status,
      source,
      from,
      to,
      page = 1,
      limit = 20,
    } = req.query;

    // Show leads that are not soft-deleted (isDeleted: false or field missing)
    const filter = {
      $and: [
        {
          $or: [
            { isDeleted: false },
            { isDeleted: { $exists: false } },
          ],
        },
      ],
    };

    if (q && String(q).trim()) {
      const term = String(q).trim();
      filter.$and.push({
        $or: [
          { name: new RegExp(term, "i") },
          { email: new RegExp(term, "i") },
          { phone: new RegExp(term, "i") },
        ],
      });
    }
    if (status) filter.$and.push({ status });
    if (source) filter.$and.push({ source });
    if (from || to) {
      const dateRange = {};
      if (from) dateRange.$gte = new Date(from);
      if (to) dateRange.$lte = new Date(to);
      filter.$and.push({ createdAt: dateRange });
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
      Lead.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Lead.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.json({
      ok: true,
      items,
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    });
  } catch (e) {
    console.error("Admin leads list error:", e.message);
    res.status(500).json({ ok: false, error: e.message || "Failed to list leads" });
  }
});

// GET /api/admin/leads/:id – single lead
router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ ok: false, error: "Invalid lead ID" });
    }
    const lead = await Lead.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    }).lean();
    if (!lead) {
      return res.status(404).json({ ok: false, error: "Lead not found" });
    }
    res.json({ ok: true, lead });
  } catch (e) {
    console.error("Admin get lead error:", e.message);
    res.status(500).json({ ok: false, error: e.message || "Failed to get lead" });
  }
});

// PATCH /api/admin/leads/:id
const PATCH_ALLOWED = [
  "status", "source", "name", "email", "phone", "subject", "message",
  "tags", "nextFollowUpAt", "lastContactedAt",
];
router.patch("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ ok: false, error: "Invalid lead ID" });
    }
    const update = {};
    for (const key of PATCH_ALLOWED) {
      if (req.body[key] !== undefined) {
        if (key === "tags" && Array.isArray(req.body[key])) update[key] = req.body[key];
        else if (key === "nextFollowUpAt" || key === "lastContactedAt") {
          update[key] = req.body[key] === null || req.body[key] === "" ? null : new Date(req.body[key]);
        } else if (typeof req.body[key] === "string" || typeof req.body[key] === "number") {
          update[key] = req.body[key];
        }
      }
    }
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: update },
      { new: true, runValidators: true }
    ).lean();
    if (!lead) {
      return res.status(404).json({ ok: false, error: "Lead not found" });
    }
    res.json({ ok: true, lead });
  } catch (e) {
    if (handleDuplicateKey(res, e)) return;
    console.error("Admin patch lead error:", e.message);
    res.status(500).json({ ok: false, error: e.message || "Failed to update lead" });
  }
});

// POST /api/admin/leads/:id/notes
router.post("/:id/notes", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ ok: false, error: "Invalid lead ID" });
    }
    const text = req.body?.text != null ? String(req.body.text) : "";
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $push: { notes: { text, at: new Date() } } },
      { new: true }
    ).lean();
    if (!lead) {
      return res.status(404).json({ ok: false, error: "Lead not found" });
    }
    res.json({ ok: true, lead });
  } catch (e) {
    console.error("Admin add note error:", e.message);
    res.status(500).json({ ok: false, error: e.message || "Failed to add note" });
  }
});

// DELETE /api/admin/leads/:id – soft delete
router.delete("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ ok: false, error: "Invalid lead ID" });
    }
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, isDeleted: { $ne: true } },
      { $set: { isDeleted: true } },
      { new: true }
    ).lean();
    if (!lead) {
      return res.status(404).json({ ok: false, error: "Lead not found" });
    }
    res.json({ ok: true, lead });
  } catch (e) {
    console.error("Admin delete lead error:", e.message);
    res.status(500).json({ ok: false, error: e.message || "Failed to delete lead" });
  }
});

module.exports = router;
