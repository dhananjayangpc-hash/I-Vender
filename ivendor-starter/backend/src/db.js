const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://ivendor:ivendor@localhost:5432/ivendor'
});

async function initDb() {
  // simple connectivity check
  await pool.query('SELECT 1');
  // check if migrations have been applied (tenants table exists)
  const { rows } = await pool.query("SELECT to_regclass('public.tenants') as tenants_table");
  if (!rows[0] || !rows[0].tenants_table) {
    console.log('Migrations not detected; applying initial migration from migrations/001_init.sql');
    const fs = require('fs');
    const path = require('path');
    const sqlPath = path.join(__dirname, 'migrations', '001_init.sql');
    try {
      const sql = fs.readFileSync(sqlPath, 'utf8');
      // execute the SQL migration
      await pool.query(sql);
      console.log('Initial migration applied successfully');
    } catch (err) {
      console.error('Failed to apply migration', err);
      throw err;
    }
  }
}

function query(text, params) {
  return pool.query(text, params);
}

module.exports = { initDb, query, pool };
