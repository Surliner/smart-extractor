
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuration de la base de données PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// --- SYNC / MIGRATION SCRIPT ---
const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const columnsToEnsure = [
      { name: 'password', type: 'TEXT' },
      { name: 'role', type: "TEXT DEFAULT 'USER'" },
      { name: 'security_question', type: 'TEXT' },
      { name: 'security_answer', type: 'TEXT' },
      { name: 'stats', type: "JSONB DEFAULT '{\"extractRequests\": 0, \"totalTokens\": 0, \"lastActive\": \"\"}'" },
      { name: 'login_history', type: "JSONB DEFAULT '[]'" }
    ];

    for (const col of columnsToEnsure) {
      await client.query(`
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TABLE users ADD COLUMN ${col.name} ${col.type};
          EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column ${col.name} already exists';
          END;
        END $$;
      `);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY,
          owner TEXT REFERENCES users(username) ON DELETE CASCADE,
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS activities (
          id UUID PRIMARY KEY,
          username TEXT REFERENCES users(username) ON DELETE CASCADE,
          action TEXT,
          details TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("DB Sync Error:", err);
  } finally {
    client.release();
  }
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- AUTH ---

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT username, password, role, stats, security_question FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Identité inconnue." });
    
    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ error: "Incorrect credentials." });
    
    // Update login history
    await pool.query(
      "UPDATE users SET login_history = login_history || $1::jsonb WHERE username = $2",
      [JSON.stringify(new Date().toISOString()), user.username]
    );

    delete user.password;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN ROUTES ---

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.username, u.role, u.stats, u.created_at, u.login_history,
             (SELECT json_agg(act) FROM (SELECT * FROM activities WHERE username = u.username ORDER BY timestamp DESC LIMIT 20) act) as activity_log
      FROM users u 
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows.map(u => ({
      ...u,
      stats: u.stats || {},
      loginHistory: u.login_history || [],
      activityLog: u.activity_log || []
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/role', async (req, res) => {
  const { username, role } = req.body;
  try {
    await pool.query('UPDATE users SET role = $1 WHERE username = $2', [role, username]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/password', async (req, res) => {
  const { username, password } = req.body;
  try {
    await pool.query('UPDATE users SET password = $1 WHERE username = $2', [password, username]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users', async (req, res) => {
  const { username } = req.query;
  try {
    await pool.query('DELETE FROM users WHERE username = $1', [username]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- INVOICES & SYNC ---

app.get('/api/invoices', async (req, res) => {
  const { user, role } = req.query;
  try {
    let query = 'SELECT data FROM invoices';
    let params = [];
    if (role !== 'ADMIN') {
      query += ' WHERE owner = $1';
      params.push(user);
    }
    const result = await pool.query(query, params);
    res.json(result.rows.map(r => r.data));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  const invoice = req.body;
  try {
    await pool.query('INSERT INTO invoices (id, owner, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $3', [invoice.id, invoice.owner, invoice]);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/sync', async (req, res) => {
  const { username, stats, activity } = req.body;
  try {
    await pool.query('UPDATE users SET stats = $2 WHERE username = $1', [username, stats]);
    if (activity) {
      await pool.query('INSERT INTO activities (id, username, action, details, timestamp) VALUES ($1, $2, $3, $4, $5)', [activity.id, username, activity.action, activity.details, activity.timestamp]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initDb();
});
