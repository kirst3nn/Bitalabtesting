import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Query completed in ${duration}ms`);
    return res;
  } catch (error) {
    console.error('[DB] Query error:', error.message, { text, params });
    throw error;
  }
}

export async function getClient() {
  return pool.connect();
}

export async function closePool() {
  return pool.end();
}
