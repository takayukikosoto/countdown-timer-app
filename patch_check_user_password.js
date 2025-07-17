#!/usr/bin/env node
const fs = require('fs');
const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

(async () => {
  const sql = fs.readFileSync('fix_check_user_password.sql', 'utf8');
  const connStr = process.env.LOCAL_DB_URL || 'postgres://postgres:postgres@127.0.0.1:54322/postgres';
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    await client.query(sql);
    console.log('check_user_password function replaced successfully');
  } catch (err) {
    console.error('Error executing SQL:', err.message);
  } finally {
    await client.end();
  }
})();
