
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
    console.log("Initializing database...");
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL,
          config JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY,
          owner TEXT REFERENCES users(username) ON DELETE CASCADE,
          company_id UUID REFERENCES companies(id),
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const compCount = await client.query('SELECT COUNT(*) FROM companies');
    let defaultCompId;
    if (parseInt(compCount.rows[0].count) === 0) {
      defaultCompId = uuidv4();
      await client.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [defaultCompId, 'Société Pilote']);
    } else {
      const firstComp = await client.query('SELECT id FROM companies LIMIT 1');
      defaultCompId = firstComp.rows[0].id;
    }

    await client.query('UPDATE users SET company_id = $1 WHERE company_id IS NULL', [defaultCompId]);

    const adminCheck = await client.query('SELECT * FROM users WHERE LOWER(username) = $1', ['admin']);
    if (adminCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO users (username, password, role, company_id, is_approved) VALUES ($1, $2, $3, $4, $5)',
        ['admin', 'admin', 'SUPER_ADMIN', defaultCompId, true]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("DB Init Error:", err);
  } finally {
    client.release();
  }
};

app.use(cors());
app.use(express.json({ limit: '100mb' })); // Augmentation de la limite pour les gros PDF

// --- COMPANY API ---
app.get('/api/admin/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/companies', async (req, res) => {
  const { name } = req.body;
  const id = uuidv4();
  try {
    const result = await pool.query('INSERT INTO companies (id, name) VALUES ($1, $2) RETURNING *', [id, name]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/company/config', async (req, res) => {
  const { companyId, config } = req.body;
  try {
    await pool.query('UPDATE companies SET config = $1 WHERE id = $2', [config, companyId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- AUTH API ---
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT u.*, c.name as company_name, c.config as company_config
       FROM users u 
       LEFT JOIN companies c ON u.company_id = c.id 
       WHERE LOWER(u.username) = LOWER($1)`,
      [username.trim()]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Utilisateur non trouvé." });
    const user = result.rows[0];
    if (user.password !== password) return res.status(401).json({ error: "Mot de passe incorrect." });
    if (!user.is_approved) return res.status(403).json({ error: "Compte en attente d'approbation." });
    res.json({
      username: user.username,
      companyId: user.company_id,
      companyName: user.company_name || 'N/A',
      role: user.role,
      isApproved: user.is_approved,
      companyConfig: user.company_config,
      createdAt: user.created_at
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/session/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      `SELECT u.*, c.name as company_name, c.config as company_config
       FROM users u 
       LEFT JOIN companies c ON u.company_id = c.id 
       WHERE LOWER(u.username) = LOWER($1)`,
      [username.trim()]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Session non trouvée." });
    const user = result.rows[0];
    res.json({
      username: user.username,
      companyId: user.company_id,
      companyName: user.company_name || 'N/A',
      role: user.role,
      isApproved: user.is_approved,
      companyConfig: user.company_config,
      createdAt: user.created_at
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password, securityQuestion, securityAnswer } = req.body;
  try {
    const compRes = await pool.query('SELECT id FROM companies LIMIT 1');
    const companyId = compRes.rows[0].id;
    await pool.query(
      `INSERT INTO users (username, password, role, company_id, security_question, security_answer, is_approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [username.trim(), password, 'USER', companyId, securityQuestion, securityAnswer, false]
    );
    res.status(201).json({ success: true, pending: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- INVOICE API ---
app.get('/api/invoices', async (req, res) => {
  const { user } = req.query;
  try {
    const result = await pool.query(
      'SELECT data FROM invoices WHERE LOWER(owner) = LOWER($1) ORDER BY created_at DESC',
      [user]
    );
    res.json(result.rows.map(row => row.data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices', async (req, res) => {
  const invoice = req.body;
  if (!invoice.id || !invoice.owner) {
      return res.status(400).json({ error: "Missing Invoice ID or Owner" });
  }
  try {
    // Crucial: Récupérer le nom d'utilisateur exact (casse) et le company_id
    const userRes = await pool.query('SELECT username, company_id FROM users WHERE LOWER(username) = LOWER($1)', [invoice.owner]);
    if (userRes.rows.length === 0) {
        return res.status(404).json({ error: `User ${invoice.owner} not found in database.` });
    }
    const { username, company_id } = userRes.rows[0];
    
    // Upsert de la facture
    await pool.query(
      'INSERT INTO invoices (id, owner, company_id, data) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET data = $4', 
      [invoice.id, username, company_id, invoice]
    );
    res.json({ success: true });
  } catch (err) { 
    console.error("POST /api/invoices DATABASE ERROR:", err);
    res.status(500).json({ error: err.message }); 
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.username, u.role, u.created_at, u.company_id, u.is_approved, u.stats, c.name as company_name
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows.map(u => ({ 
      ...u, 
      isApproved: u.is_approved, 
      companyName: u.company_name, 
      companyId: u.company_id, 
      createdAt: u.created_at,
      stats: u.stats 
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/users/update', async (req, res) => {
  const { username, role, companyId, isApproved } = req.body;
  if (username.toLowerCase() === 'admin' && role !== 'SUPER_ADMIN') {
    return res.status(400).json({ error: "Cannot downgrade master admin role." });
  }
  try {
    await pool.query(
      'UPDATE users SET role = $1, company_id = $2, is_approved = $3 WHERE LOWER(username) = LOWER($4)',
      [role, companyId, isApproved, username]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/users/:username', async (req, res) => {
  const { username } = req.params;
  if (username.toLowerCase() === 'admin') {
    return res.status(400).json({ error: "Cannot delete master admin account." });
  }
  try {
    await pool.query('DELETE FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(port, async () => {
  console.log(`Server ready on port ${port}`);
  await initDb();
});
