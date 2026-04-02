const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdminOrManager } = require('../middleware/auth');
const router = express.Router();

// GET /api/employees
router.get('/', authenticate, async (req, res) => {
  try {
    const { branch_id, department, status } = req.query;
    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];
    if (branch_id) { params.push(branch_id); query += ` AND branch_id = $${params.length}`; }
    if (department) { params.push(department); query += ` AND department = $${params.length}`; }
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/employees/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'الموظف غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/employees
router.post('/', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { name, national_id, address, phone, department, position, join_date, branch_id, team_id } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الموظف مطلوب' });

    const { rows } = await db.query(
      `INSERT INTO employees (name, national_id, address, phone, department, position, join_date, branch_id, team_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [name, national_id||'', address||'', phone||'', department||'', position||'', join_date||null, branch_id||null, team_id||null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create employee error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// PUT /api/employees/:id
router.put('/:id', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { name, national_id, address, phone, department, position, join_date, status, branch_id, team_id, signed_form_url } = req.body;
    const { rows } = await db.query(
      `UPDATE employees SET name=$1, national_id=$2, address=$3, phone=$4, department=$5, position=$6, join_date=$7, status=$8, branch_id=$9, team_id=$10, signed_form_url=$11
       WHERE id=$12 RETURNING *`,
      [name, national_id||'', address||'', phone||'', department||'', position||'', join_date||null, status||'Active', branch_id||null, team_id||null, signed_form_url||null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'الموظف غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/employees/:id
router.delete('/:id', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    // Return all active assignments first
    const activeAssignments = await db.query('SELECT item_id, quantity FROM assignments WHERE employee_id = $1 AND status = $2', [req.params.id, 'Active']);
    
    // Update assignments to Returned
    await db.query(`UPDATE assignments SET status = 'Returned', return_date = NOW() WHERE employee_id = $1 AND status = 'Active'`, [req.params.id]);
    
    // Restore inventory quantities
    for (const a of activeAssignments.rows) {
      await db.query('UPDATE inventory_items SET available_qty = available_qty + $1 WHERE id = $2', [a.quantity, a.item_id]);
    }

    // Return SIM cards
    await db.query(`UPDATE sim_cards SET status = 'Available', employee_id = NULL, assign_date = NULL WHERE employee_id = $1`, [req.params.id]);

    // Log transactions
    for (const a of activeAssignments.rows) {
      await db.query(
        `INSERT INTO transactions (type, item_id, employee_id, quantity, notes, performed_by) VALUES ('RETURN', $1, $2, $3, 'استرجاع تلقائي', $4)`,
        [a.item_id, req.params.id, a.quantity, req.user.email]
      );
    }

    await db.query('DELETE FROM employees WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الموظف', returned_items: activeAssignments.rows.length });
  } catch (err) {
    console.error('Delete employee error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
