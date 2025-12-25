
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

    // 2. Table Utilisateurs (Création de base)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          password TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. MIGRATIONS : Ajout des colonnes si elles manquent
    const migrations = [
      { table: 'users', col: 'company_id', type: 'UUID REFERENCES companies(id)' },
      { table: 'users', col: 'role', type: "TEXT DEFAULT 'USER'" },
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

    // 5. Initialisation Société & Admin par défaut
    const compCount = await client.query('SELECT COUNT(*) FROM companies');
    let defaultCompId;
    
    if (parseInt(compCount.rows[0].count) === 0) {
      defaultCompId = uuidv4();
      await client.query('INSERT INTO companies (id, name) VALUES ($1, $2)', [defaultCompId, 'Société Pilote']);
      console.log("Default company created.");
    } else {
      const firstComp = await client.query('SELECT id FROM companies LIMIT 1');
      defaultCompId = firstComp.rows[0].id;
    }

    const userCount = await client.query('SELECT COUNT(*) FROM users');
    if (parseInt(userCount.rows[0].count) === 0) {
      await client.query(
        'INSERT INTO users (username, password, role, company_id) VALUES ($1, $2, $3, $4)',
        ['admin', 'admin', 'SUPER_ADMIN', defaultCompId]
      );
      console.log("Default user created: admin / admin");
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
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const role = parseInt(userCount.rows[0].count) === 0 ? 'SUPER_ADMIN' : 'USER';

    await pool.query(
      `INSERT INTO users (username, password, role, company_id, security_question, security_answer)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [username.trim(), password, role, companyId, securityQuestion, securityAnswer]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Register Error:", err);
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
    
    res.json({
      username: user.username,
      companyId: user.company_id,
      companyName: user.company_name,
      role: user.role,
      stats: user.stats,
      companyConfig: user.company_config,
      createdAt: user.created_at
    });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { username, newPassword, answer } = req.body;
  try {
    const userRes = await pool.query('SELECT security_answer FROM users WHERE LOWER(username) = LOWER($1)', [username.trim()]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: "Utilisateur non trouvé." });
    
    if (userRes.rows[0].security_answer?.toLowerCase().trim() !== answer.toLowerCase().trim()) {
      return res.status(401).json({ error: "Réponse de sécurité incorrecte." });
    }

    await pool.query('UPDATE users SET password = $1 WHERE LOWER(username) = LOWER($2)', [newPassword, username.trim()]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/company/config', async (req, res) => {
  const { companyId, config } = req.body;
  try {
    await pool.query('UPDATE companies SET config = $1 WHERE id = $2', [config, companyId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/invoices', async (req, res) => {
  const { user } = req.query;
  try {
    const userRes = await pool.query('SELECT company_id, role FROM users WHERE username = $1', [user]);
    if (userRes.rows.length === 0) return res.json([]);
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

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.username, u.role, u.stats, u.created_at, u.company_id, c.name as company_name
      FROM users u 
      JOIN companies c ON u.company_id = c.id
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/companies', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM companies ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));

app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  await initDb();
});
