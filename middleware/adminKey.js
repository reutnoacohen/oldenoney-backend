/**
 * Protects /api/admin routes: requires header x-admin-key to match process.env.ADMIN_KEY.
 */
function adminKeyMiddleware(req, res, next) {
  const key = req.headers["x-admin-key"];
  const expected = process.env.ADMIN_KEY;
  if (!expected || key !== expected) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

module.exports = adminKeyMiddleware;
