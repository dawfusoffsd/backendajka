const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// ========== BRANCHES ==========
router.get('/branches', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM branches ORDER BY created_at');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

router.post('/branches', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, location, phone, manager, status } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الفرع مطلوب' });
    const { rows } = await db.query(
      'INSERT INTO branches (name, location, phone, manager, status) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [name, location||'', phone||'', manager||'', status||'Active']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

router.delete('/branches/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM branches WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الفرع' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ========== TEAMS ==========
router.get('/teams', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM teams ORDER BY created_at');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

router.post('/teams', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, manager, team_leader, description } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الفريق مطلوب' });
    const { rows } = await db.query(
      'INSERT INTO teams (name, manager, team_leader, description) VALUES ($1,$2,$3,$4) RETURNING *',
      [name, manager||'', team_leader||'', description||'']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

router.delete('/teams/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM teams WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الفريق' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ========== CATEGORIES ==========
router.get('/categories', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY created_at');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

router.post('/categories', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الفئة مطلوب' });
    const { rows } = await db.query(
      'INSERT INTO categories (name, icon, color) VALUES ($1,$2,$3) RETURNING *',
      [name, icon||'monitor', color||'#3B82F6']
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

router.delete('/categories/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM categories WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الفئة' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

// ========== NOTIFICATIONS ==========
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

router.patch('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'تمت القراءة' });
  } catch (err) { res.status(500).json({ error: 'خطأ في الخادم' }); }
});

module.exports = router;
