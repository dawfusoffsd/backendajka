const express = require('express');
const db = require('../config/database');
const { authenticate, requireAdminOrManager } = require('../middleware/auth');
const router = express.Router();

// GET /api/inventory
router.get('/', authenticate, async (req, res) => {
  try {
    const { branch_id, category_id } = req.query;
    let query = 'SELECT * FROM inventory_items WHERE 1=1';
    const params = [];
    if (branch_id) { params.push(branch_id); query += ` AND branch_id = $${params.length}`; }
    if (category_id) { params.push(category_id); query += ` AND category_id = $${params.length}`; }
    query += ' ORDER BY created_at DESC';
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// GET /api/inventory/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM inventory_items WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'الصنف غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// POST /api/inventory
router.post('/', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { name, category_id, brand, model, serial_prefix, device_number, total_qty, min_qty, notes, branch_id, ram, ssd, unit_specs } = req.body;
    if (!name) return res.status(400).json({ error: 'اسم الصنف مطلوب' });

    const { rows } = await db.query(
      `INSERT INTO inventory_items (name, category_id, brand, model, serial_prefix, device_number, total_qty, available_qty, min_qty, notes, branch_id, ram, ssd, unit_specs, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [name, category_id, brand||'', model||'', serial_prefix||'', device_number||'', total_qty||0, min_qty||0, notes||'', branch_id, ram||'', ssd||'', JSON.stringify(unit_specs||{}), req.user.email]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create inventory error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// PUT /api/inventory/:id
router.put('/:id', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { name, category_id, brand, model, serial_prefix, device_number, total_qty, min_qty, notes, branch_id, ram, ssd, unit_specs } = req.body;

    // Get current item to calculate available_qty
    const current = await db.query('SELECT total_qty, available_qty FROM inventory_items WHERE id = $1', [req.params.id]);
    if (!current.rows[0]) return res.status(404).json({ error: 'الصنف غير موجود' });

    let available_qty = current.rows[0].available_qty;
    if (total_qty !== undefined && total_qty !== current.rows[0].total_qty) {
      const assigned = current.rows[0].total_qty - current.rows[0].available_qty;
      available_qty = Math.max(0, total_qty - assigned);
    }

    const { rows } = await db.query(
      `UPDATE inventory_items SET name=$1, category_id=$2, brand=$3, model=$4, serial_prefix=$5, device_number=$6, total_qty=$7, available_qty=$8, min_qty=$9, notes=$10, branch_id=$11, ram=$12, ssd=$13, unit_specs=$14
       WHERE id=$15 RETURNING *`,
      [name, category_id, brand||'', model||'', serial_prefix||'', device_number||'', total_qty||0, available_qty, min_qty||0, notes||'', branch_id, ram||'', ssd||'', JSON.stringify(unit_specs||{}), req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update inventory error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// PATCH /api/inventory/:id/qty - Adjust quantity
router.patch('/:id/qty', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { delta } = req.body;
    const { rows } = await db.query(
      'UPDATE inventory_items SET available_qty = GREATEST(0, available_qty + $1) WHERE id = $2 RETURNING *',
      [delta, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'الصنف غير موجود' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// DELETE /api/inventory/:id
router.delete('/:id', authenticate, requireAdminOrManager, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT total_qty, available_qty FROM inventory_items WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'الصنف غير موجود' });
    if (rows[0].available_qty !== rows[0].total_qty) return res.status(400).json({ error: 'لا يمكن حذف صنف مُسلَّم لموظفين' });

    await db.query('DELETE FROM inventory_items WHERE id = $1', [req.params.id]);
    res.json({ message: 'تم حذف الصنف' });
  } catch (err) {
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

module.exports = router;
