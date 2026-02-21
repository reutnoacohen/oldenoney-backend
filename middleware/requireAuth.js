const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";

/**
 * Protects admin routes: requires valid JWT in Authorization: Bearer <token>.
 * Optionally allows x-admin-key as fallback if ADMIN_KEY is set (for scripts/backward compat).
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.admin = { id: payload.id, username: payload.username };
      return next();
    } catch (e) {
      // token invalid or expired
    }
  }

  // Fallback: x-admin-key (optional)
  const key = req.headers["x-admin-key"];
  const expected = process.env.ADMIN_KEY;
  if (expected && key === expected) {
    req.admin = { id: "key", username: "admin" };
    return next();
  }

  return res.status(401).json({ ok: false, error: "Unauthorized" });
}

module.exports = requireAuth;
