const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdminOrManager } = require('../middleware/auth');
const { detectOperator, normalizeSIMNumber } = require('../utils/helpers');
const router = express.Router();

// GET /api/sim-cards
router.get('/', authenticate, async (req, res) => {
  try {
    const { branch_id, status, operator, line_status } = req.query;
    let query = 'SELECT * FROM sim_cards WHERE 1=1';
    const params = [];
    if (branch_id) { params.push(branch_id); query += ` AND branch_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (operator) { params.push(operator); query += ` AND operator = $${params.length}`; }
    if (line_status) { params.push(line_status); query += ` AND line_status = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/sim-cards
router.post('/', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { sim_number, operator, serial_number, notes, line_status, branch_id } = req.body;
    if (!sim_number) return res.status(400).json({ error: 'رقم الخط مطلوب' });

    const normalized = normalizeSIMNumber(sim_number);
    const op = operator || detectOperator(normalized);

    const existing = await db.query('SELECT id FROM sim_cards WHERE sim_number = $1', [normalized]);
    if (existing.rows[0]) return res.status(400).json({ error: 'رقم الخط موجود بالفعل' });

    const { rows } = await db.query(
      `INSERT INTO sim_cards (sim_number, operator, serial_number, notes, line_status, branch_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [normalized, op, serial_number||'', notes||'', line_status||'مفتوح', branch_id||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Add SIM error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/sim-cards/bulk
router.post('/bulk', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { numbers, line_status, branch_id } = req.body;
    if (!numbers || !Array.isArray(numbers)) return res.status(400).json({ error: 'الأرقام مطلوبة' });

    let added = 0, skipped = 0;
    for (const num of numbers) {
      const clean = normalizeSIMNumber(num.trim());
      if (!clean) { skipped++; continue; }
      try {
        await db.query(
          `INSERT INTO sim_cards (sim_number, operator, line_status, branch_id) VALUES ($1,$2,$3,$4)`,
          [clean, detectOperator(clean), line_status||'مفتوح', branch_id||null]
        );
        added++;
      } catch (e) {
        skipped++; // duplicate
      }
    }
    res.json({ added, skipped });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// PUT /api/sim-cards/:id
router.put('/:id', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { sim_number, operator, serial_number, notes, line_status, branch_id } = req.body;
    const { rows } = await db.query(
      `UPDATE sim_cards SET sim_number=$1, operator=$2, serial_number=$3, notes=$4, line_status=$5, branch_id=$6 WHERE id=$7 RETURNING *`,
      [sim_number, operator||'', serial_number||'', notes||'', line_status||'مفتوح', branch_id||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'الخط غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/sim-cards/:id/assign
router.post('/:id/assign', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { employee_id } = req.body;
    if (!employee_id) return res.status(400).json({ error: 'الموظف مطلوب' });
    const { rows } = await db.query(
      `UPDATE sim_cards SET status = 'Assigned', employee_id = $1, assign_date = NOW() WHERE id = $2 RETURNING *`,
      [employee_id, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'الخط غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/sim-cards/:id/return
router.post('/:id/return', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE sim_cards SET status = 'Available', employee_id = NULL, assign_date = NULL WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'الخط غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/sim-cards/:id
router.delete('/:id', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT status FROM sim_cards WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'الخط غير موجود' });
    if (rows[0].status === 'Assigned') return res.status(400).json({ error: 'لا يمكن حذف خط مُسلَّم' });

    await db.query('DELETE FROM sim_cards WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الخط' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
