const express = require('express');
const cors = require('cors');
const db = require('./config/database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => {
  res.json({
    name: 'Asset Custody API',
    version: '1.0.0',
    database: 'SQLite',
    status: 'running'
  });
});

app.get('/health', (req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({ status: 'healthy', database: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const stats = {
      employees: db.prepare('SELECT COUNT(*) as c FROM employees').get().c,
      items: db.prepare('SELECT COUNT(*) as c FROM inventory_items').get().c,
      assignments: db.prepare('SELECT COUNT(*) as c FROM assignments').get().c,
    };
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const data = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const result = db.prepare('INSERT INTO categories (name, icon, color) VALUES (?, ?, ?)').run(name, icon || 'folder', color || '#3B82F6');
    const category = db.prepare('SELECT * FROM categories WHERE rowid = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/employees', (req, res) => {
  try {
    const data = db.prepare('SELECT * FROM employees ORDER BY name').all();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/employees', (req, res) => {
  try {
    const { name, phone, department } = req.body;
    const result = db.prepare('INSERT INTO employees (name, phone, department) VALUES (?, ?, ?)').run(name, phone || '', department || '');
    const employee = db.prepare('SELECT * FROM employees WHERE rowid = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: employee });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/inventory', (req, res) => {
  try {
    const data = db.prepare('SELECT * FROM inventory_items ORDER BY name').all();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/inventory', (req, res) => {
  try {
    const { name, brand, model, total_qty } = req.body;
    const result = db.prepare('INSERT INTO inventory_items (name, brand, model, total_qty, available_qty) VALUES (?, ?, ?, ?, ?)').run(name, brand || '', model || '', total_qty || 0, total_qty || 0);
    const item = db.prepare('SELECT * FROM inventory_items WHERE rowid = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('');
  console.log('═'.repeat(60));
  console.log('🚀 Asset Custody Backend (SQLite)');
  console.log('═'.repeat(60));
  console.log(`✅ Server: http://localhost:${PORT}`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log('═'.repeat(60));
  console.log('');
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  db.close();
  process.exit(0);
});
