const db = require('../src/config/database');

const migration = `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'User' CHECK (role IN ('Admin', 'Manager', 'User')),
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Pending')),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  location TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  manager TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'monitor',
  color TEXT DEFAULT '#3B82F6',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  national_id TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  department TEXT DEFAULT '',
  position TEXT DEFAULT '',
  status TEXT DEFAULT 'Active',
  branch_id TEXT REFERENCES branches(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Inventory
CREATE TABLE IF NOT EXISTS inventory_items (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id),
  brand TEXT DEFAULT '',
  model TEXT DEFAULT '',
  total_qty INTEGER DEFAULT 0,
  available_qty INTEGER DEFAULT 0,
  branch_id TEXT REFERENCES branches(id),
  created_at TEXT DEFAULT (datetime('now'))
);

-- Assignments
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  employee_id TEXT REFERENCES employees(id),
  item_id TEXT REFERENCES inventory_items(id),
  quantity INTEGER DEFAULT 1,
  assign_date TEXT DEFAULT (datetime('now')),
  status TEXT DEFAULT 'Active',
  created_at TEXT DEFAULT (datetime('now'))
);
`;

try {
  console.log('🔄 Running SQLite migrations...\n');
  
  db.exec(migration);
  
  console.log('✅ Migrations completed!\n');
  console.log('📋 Created tables:');
  console.log('   ✓ users, branches, categories');
  console.log('   ✓ employees, inventory_items, assignments\n');
  
} catch (err) {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
}
