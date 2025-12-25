
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
          password TEXT,
          role TEXT DEFAULT 'USER',
          company_id UUID REFERENCES companies(id),
          security_question TEXT,
          security_answer TEXT,
          stats JSONB DEFAULT '{"extractRequests": 0, "totalTokens": 0, "lastActive": ""}',
          login_history JSONB DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Table Invoices
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY,
          owner TEXT REFERENCES users(username) ON DELETE CASCADE,
          company_id UUID REFERENCES companies(id),
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Table Activités
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
          id UUID PRIMARY KEY,
          username TEXT REFERENCES users(username) ON DELETE CASCADE,
          company_id UUID REFERENCES companies(id),
          action TEXT,
          details TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration initiale si vide
    const compCount = await client.query('SELECT COUNT(*) FROM companies');
    if (parseInt(compCount.rows[0].count) === 0) {
      const defaultCompId = uuidv4();
      await client.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [defaultCompId, 'Société Pilote']);
    }

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

// --- AUTH & CONFIG ---

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
    
    const profile = {
      username: user.username,
      companyId: user.company_id,
      companyName: user.company_name,
      role: user.role,
      stats: user.stats,
      companyConfig: user.company_config,
      createdAt: user.created_at
    };
    res.json(profile);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Sauvegarde de la configuration de l'entreprise (ERP, Templates, etc)
app.post('/api/company/config', async (req, res) => {
  const { companyId, config } = req.body;
  try {
    await pool.query('UPDATE companies SET config = $1 WHERE id = $2', [config, companyId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ADMIN / SUPER ADMIN ---

app.get('/api/admin/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/companies', async (req, res) => {
  const { name } = req.body;
  try {
    const result = await pool.query('INSERT INTO companies (id, name) VALUES ($1, $2) RETURNING *', [uuidv4(), name]);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/users', async (req, res) => {
  const { username, password, role, companyId } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (username, password, role, company_id) VALUES ($1, $2, $3, $4) RETURNING username, role',
      [username, password, role, companyId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', async (req, res) => {
  const { requester, role } = req.query;
  try {
    let query = `
      SELECT u.username, u.role, u.stats, u.created_at, u.company_id, c.name as company_name
      FROM users u 
      JOIN companies c ON u.company_id = c.id
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- INVOICES (FILTERED BY COMPANY) ---

app.get('/api/invoices', async (req, res) => {
  const { user } = req.query;
  try {
    const userRes = await pool.query('SELECT company_id, role FROM users WHERE username = $1', [user]);
    const u = userRes.rows[0];
    let query = 'SELECT data FROM invoices WHERE company_id = $1';
    if (u.role === 'SUPER_ADMIN') query = 'SELECT data FROM invoices';
    
    const result = await pool.query(query, u.role === 'SUPER_ADMIN' ? [] : [u.company_id]);
    res.json(result.rows.map(r => r.data));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices', async (req, res) => {
  const invoice = req.body;
  try {
    const userRes = await pool.query('SELECT company_id FROM users WHERE username = $1', [invoice.owner]);
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
  console.log(`SaaS Server running on port ${port}`);
  await initDb();
});
