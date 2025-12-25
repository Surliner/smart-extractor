
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const initDb = async () => {
  const client = await pool.connect();
  try {
    console.log("Starting Database Initialization...");
    await client.query('BEGIN');

    // 1. Table Entreprises
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          config JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Table Utilisateurs
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. MIGRATIONS
    const migrations = [
      { table: 'users', col: 'company_id', type: 'UUID REFERENCES companies(id)' },
      { table: 'users', col: 'role', type: "TEXT DEFAULT 'USER'" },
      { table: 'users', col: 'is_approved', type: "BOOLEAN DEFAULT FALSE" },
      { table: 'users', col: 'security_question', type: 'TEXT' },
      { table: 'users', col: 'security_answer', type: 'TEXT' },
      { table: 'users', col: 'stats', type: "JSONB DEFAULT '{\"extractRequests\": 0, \"totalTokens\": 0, \"lastActive\": \"\"}'" },
      { table: 'users', col: 'login_history', type: "JSONB DEFAULT '[]'" }
    ];

    for (const m of migrations) {
      await client.query(`ALTER TABLE ${m.table} ADD COLUMN IF NOT EXISTS ${m.col} ${m.type};`);
    }

    // 4. Table Invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY,
          owner TEXT REFERENCES users(username) ON DELETE CASCADE,
          company_id UUID REFERENCES companies(id),
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Default Company
    const compCount = await client.query('SELECT COUNT(*) FROM companies');
    let defaultCompId;
    if (parseInt(compCount.rows[0].count) === 0) {
      defaultCompId = uuidv4();
      await client.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [defaultCompId, 'Société Pilote']);
    } else {
      const firstComp = await client.query('SELECT id FROM companies LIMIT 1');
      defaultCompId = firstComp.rows[0].id;
    }

    // 6. Default Admin (Always Approved)
    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO users (username, password, role, company_id, is_approved) VALUES ($1, $2, $3, $4, $5)',
        ['admin', 'admin', 'SUPER_ADMIN', defaultCompId, true]
      );
      console.log("Default user created: admin / admin (Approved)");
    }

    await client.query('COMMIT');
    console.log("Database Schema Initialized Successfully");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("DB Initialization Failure:", err);
  } finally {
    client.release();
  }
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- API AUTH ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password, securityQuestion, securityAnswer } = req.body;
  try {
    const compRes = await pool.query('SELECT id FROM companies LIMIT 1');
    if (compRes.rows.length === 0) return res.status(500).json({ error: "Aucune société disponible." });
    
    const companyId = compRes.rows[0].id;
    // Super admin detection is handled in SQL: first user is approved and super_admin, others pending
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const isFirst = parseInt(userCount.rows[0].count) === 0;
    const role = isFirst ? 'SUPER_ADMIN' : 'USER';
    const approved = isFirst; // First user approved by default

    await pool.query(
      `INSERT INTO users (username, password, role, company_id, security_question, security_answer, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [username.trim(), password, role, companyId, securityQuestion, securityAnswer, approved]
    );
    res.status(201).json({ success: true, pending: !approved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT u.*, c.name as company_name, c.config as company_config
       FROM users u 
       JOIN companies c ON u.company_id = c.id 
       WHERE LOWER(u.username) = LOWER($1)`,
      [username.trim()]
    );
    
    if (result.rows.length === 0) return res.status(404).json({ error: "Utilisateur non trouvé." });
    
    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ error: "Mot de passe incorrect." });
    if (!user.is_approved) return res.status(403).json({ error: "Votre compte est en attente d'approbation par un administrateur." });
    
    res.json({
      username: user.username,
      companyId: user.company_id,
      companyName: user.company_name,
      role: user.role,
      isApproved: user.is_approved,
      stats: user.stats,
      companyConfig: user.company_config,
      createdAt: user.created_at
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users/approve', async (req, res) => {
    const { username } = req.body;
    try {
        await pool.query('UPDATE users SET is_approved = TRUE WHERE username = $1', [username]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.username, u.role, u.stats, u.created_at, u.company_id, u.is_approved, c.name as company_name
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id
    `);
    res.json(result.rows.map(u => ({
        ...u,
        isApproved: u.is_approved // mapping snake_case to camelCase
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices', async (req, res) => {
  const invoice = req.body;
  try {
    const userRes = await pool.query('SELECT company_id FROM users WHERE username = $1', [invoice.owner]);
    if (userRes.rows.length === 0) return res.status(404).json({error: "User not found"});
    const cid = userRes.rows[0].company_id;
    await pool.query(
      'INSERT INTO invoices (id, owner, company_id, data) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET data = $4', 
      [invoice.id, invoice.owner, cid, invoice]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initDb();
});
