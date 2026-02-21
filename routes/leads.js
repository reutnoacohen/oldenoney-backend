import express from "express";
import Lead from "../models/Lead.js";

const router = express.Router();

// POST /api/leads - Create a new lead
router.post("/", async (req, res) => {
  try {
    const { email, name, phone, subject, message } = req.body;

    // Validate required fields
    if (!email || !name || !phone || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "כל השדות נדרשים",
      });
    }

    // Create new lead
    const lead = new Lead({
      email,
      name,
      phone,
      subject,
      message,
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: "הליד נשמר בהצלחה",
      data: lead,
    });
  } catch (error) {
    console.error("Error saving lead:", error);
    res.status(500).json({
      success: false,
      message: "שגיאה בשמירת הליד",
      error: error.message,
    });
  }
});

// GET /api/leads - Get all leads
router.get("/", async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    console.error("Error fetching leads:", error);
    res.status(500).json({
      success: false,
      message: "שגיאה בטעינת הלידים",
      error: error.message,
    });
  }
});

export default router;
