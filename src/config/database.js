const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../../data/asset_custody.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('✅ SQLite Database connected:', dbPath);

module.exports = db;
