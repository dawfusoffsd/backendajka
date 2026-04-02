const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdminOrManager } = require('../middleware/auth');
const router = express.Router();

// GET /api/assignments
router.get('/', authenticate, async (req, res) => {
  try {
    const { employee_id, status, branch_id } = req.query;
    let query = 'SELECT * FROM assignments WHERE 1=1';
    const params = [];
    if (employee_id) { params.push(employee_id); query += ` AND employee_id = $${params.length}`; }
    if (status) { params.push(status); query += ` AND status = $${params.length}`; }
    if (branch_id) { params.push(branch_id); query += ` AND branch_id = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/assignments - Assign item
router.post('/', authenticate, requireAdminOrManager, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { employee_id, item_id, item_name, quantity, serial_numbers, due_date, notes, condition, accessories, branch_id } = req.body;
    if (!employee_id || !item_id) return res.status(400).json({ error: 'الموظف والصنف مطلوبين' });

    // Create assignment
    const { rows } = await client.query(
      `INSERT INTO assignments (employee_id, item_id, item_name, quantity, serial_numbers, assign_date, due_date, notes, assigned_by, condition, accessories, branch_id)
       VALUES ($1,$2,$3,$4,$5,NOW(),$6,$7,$8,$9,$10,$11) RETURNING *`,
      [employee_id, item_id, item_name||'', quantity||1, serial_numbers||'', due_date||null, notes||'', req.user.email, condition||'', accessories||[], branch_id||null]
    );

    // Decrease available quantity
    await client.query('UPDATE inventory_items SET available_qty = GREATEST(0, available_qty - $1) WHERE id = $2', [quantity||1, item_id]);

    // Create transaction log
    await client.query(
      `INSERT INTO transactions (type, item_id, employee_id, quantity, notes, performed_by, branch_id)
       VALUES ('ASSIGN', $1, $2, $3, $4, $5, $6)`,
      [item_id, employee_id, quantity||1, notes||'', req.user.email, branch_id||null]
    );

    // Create temp custody if due_date
    if (due_date) {
      await client.query(
        `INSERT INTO temp_custody (assignment_id, employee_id, due_date) VALUES ($1, $2, $3)`,
        [rows[0].id, employee_id, due_date]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Assign error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

// POST /api/assignments/:id/return - Return item
router.post('/:id/return', authenticate, requireAdminOrManager, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query('SELECT * FROM assignments WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'العُهدة غير موجودة' });
    if (rows[0].status !== 'Active') return res.status(400).json({ error: 'العُهدة غير نشطة' });

    const assignment = rows[0];

    // Update assignment
    await client.query(`UPDATE assignments SET status = 'Returned', return_date = NOW() WHERE id = $1`, [req.params.id]);

    // Restore quantity
    await client.query('UPDATE inventory_items SET available_qty = available_qty + $1 WHERE id = $2', [assignment.quantity, assignment.item_id]);

    // Update temp custody
    await client.query(`UPDATE temp_custody SET returned = TRUE WHERE assignment_id = $1`, [req.params.id]);

    // Transaction log
    await client.query(
      `INSERT INTO transactions (type, item_id, employee_id, quantity, performed_by, branch_id)
       VALUES ('RETURN', $1, $2, $3, $4, $5)`,
      [assignment.item_id, assignment.employee_id, assignment.quantity, req.user.email, assignment.branch_id]
    );

    await client.query('COMMIT');
    res.json({ message: 'تم استرجاع العُهدة' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Return error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

// POST /api/assignments/return-all/:employeeId
router.post('/return-all/:employeeId', authenticate, requireAdminOrManager, async (req, res) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');
    const active = await client.query('SELECT * FROM assignments WHERE employee_id = $1 AND status = $2', [req.params.employeeId, 'Active']);

    for (const a of active.rows) {
      await client.query(`UPDATE assignments SET status = 'Returned', return_date = NOW() WHERE id = $1`, [a.id]);
      await client.query('UPDATE inventory_items SET available_qty = available_qty + $1 WHERE id = $2', [a.quantity, a.item_id]);
      await client.query(
        `INSERT INTO transactions (type, item_id, employee_id, quantity, notes, performed_by, branch_id) VALUES ('RETURN', $1, $2, $3, 'استرجاع تلقائي', $4, $5)`,
        [a.item_id, a.employee_id, a.quantity, req.user.email, a.branch_id]
      );
    }
    await client.query(`UPDATE temp_custody SET returned = TRUE WHERE employee_id = $1 AND returned = FALSE`, [req.params.employeeId]);

    await client.query('COMMIT');
    res.json({ message: 'تم استرجاع جميع العُهد', count: active.rows.length });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'خطأ في الخادم' });
  } finally {
    client.release();
  }
});

// PATCH /api/assignments/mark-not-returned/:employeeId
router.patch('/mark-not-returned/:employeeId', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    await db.query(`UPDATE assignments SET status = 'NotReturned' WHERE employee_id = $1 AND status = 'Active'`, [req.params.employeeId]);
    res.json({ message: 'تم التحديث' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/assignments/transactions
router.get('/transactions/all', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM transactions ORDER BY created_at DESC LIMIT 100');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Temp custody routes
// GET /api/assignments/temp-custody
router.get('/temp-custody/all', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM temp_custody WHERE returned = FALSE ORDER BY due_date');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// PATCH /api/assignments/temp-custody/:id/extend
router.patch('/temp-custody/:id/extend', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { newDate } = req.body;
    const { rows } = await db.query('UPDATE temp_custody SET extended_date = $1 WHERE id = $2 RETURNING *', [newDate, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
