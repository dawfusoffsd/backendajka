const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'مطلوب تسجيل الدخول' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await db.query('SELECT id, email, name, role, status FROM users WHERE id = $1 AND status = $2', [decoded.id, 'Active']);
    if (!rows[0]) return res.status(401).json({ error: 'المستخدم غير موجود أو غير نشط' });

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'جلسة غير صالحة' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') return res.status(403).json({ error: 'صلاحية مدير مطلوبة' });
  next();
};

const requireAdminOrManager = (req, res, next) => {
  if (!['Admin', 'Manager'].includes(req.user.role)) return res.status(403).json({ error: 'صلاحية غير كافية' });
  next();
};

module.exports = { authenticate, requireAdmin, requireAdminOrManager };
