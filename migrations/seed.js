const db = require('../src/config/database');
const bcrypt = require('bcryptjs');

console.log('🌱 Seeding database...\n');

try {
  // Admin user
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT OR IGNORE INTO users (email, name, password_hash, role, status)
    VALUES ('admin@example.com', 'Admin', ?, 'Admin', 'Active')
  `).run(hash);
  console.log('✓ Admin user created');
  
  // Sample category
  db.prepare(`
    INSERT OR IGNORE INTO categories (name, icon, color)
    VALUES ('Laptops', 'laptop', '#3B82F6')
  `).run();
  console.log('✓ Sample category created');
  
  console.log('\n✅ Seeding complete!\n');
} catch (err) {
  console.error('❌ Seed failed:', err.message);
}
