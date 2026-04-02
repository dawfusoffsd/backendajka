const db = require('./src/config/database');

console.log('\n🧪 Testing SQLite Database\n');
console.log('═'.repeat(50));

try {
  const time = db.prepare("SELECT datetime('now') as now").get();
  console.log('✅ Database connected');
  console.log(`   Time: ${time.now}\n`);
  
  const tables = db.prepare(`
    SELECT name FROM sqlite_master 
    WHERE type='table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();
  
  if (tables.length > 0) {
    console.log('📌 Tables:');
    tables.forEach(t => {
      const count = db.prepare(`SELECT COUNT(*) as count FROM ${t.name}`).get();
      console.log(`   ✓ ${t.name.padEnd(20)} (${count.count} records)`);
    });
  } else {
    console.log('⚠️  No tables found');
  }
  
  console.log('\n✅ All tests passed!\n');
  
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
