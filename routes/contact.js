const express = require("express");
const router = express.Router();

/**
 * Normalize Israeli phone to wa.me format: 972XXXXXXXXX (no leading 0).
 * Input e.g. 0545714494 or 054-571-4494 -> 972545714494
 */
function toWhatsAppNumber(raw) {
  if (!raw || typeof raw !== "string") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const withoutLeadingZero = digits.startsWith("0") ? digits.slice(1) : digits;
  const withCountry = withoutLeadingZero.startsWith("972") ? withoutLeadingZero : "972" + withoutLeadingZero;
  return withCountry;
}

function getWhatsAppUrl() {
  const num = toWhatsAppNumber(process.env.WHATSAPP_CONTACT_NUMBER || "");
  if (!num) return null;
  return `https://wa.me/${num}`;
}

// GET /api/contact/whatsapp – JSON { url }. With ?text=... – 302 redirect to wa.me
router.get("/whatsapp", (req, res) => {
  const base = getWhatsAppUrl();
  if (!base) {
    return res.status(503).json({ ok: false, error: "WhatsApp contact not configured" });
  }
  const text = req.query.text;
  if (text !== undefined && text !== "") {
    const target = `${base}?text=${encodeURIComponent(String(text))}`;
    return res.redirect(302, target);
  }
  res.json({ ok: true, url: base });
});

module.exports = router;
