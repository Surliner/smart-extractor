
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

    await client.query(`
      CREATE TABLE IF NOT EXISTS processing_logs (
          id UUID PRIMARY KEY,
          username TEXT REFERENCES users(username) ON DELETE CASCADE,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const userMigrations = [
      { table: 'users', col: 'company_id', type: 'UUID REFERENCES companies(id)' },
      { table: 'users', col: 'role', type: "TEXT DEFAULT 'USER'" },
      { table: 'users', col: 'is_approved', type: "BOOLEAN DEFAULT FALSE" },
      { table: 'users', col: 'security_question', type: 'TEXT' },
      { table: 'users', col: 'security_answer', type: 'TEXT' },
      { table: 'users', col: 'stats', type: "JSONB DEFAULT '{\"extractRequests\": 0, \"totalTokens\": 0, \"lastActive\": \"\"}'" },
      { table: 'users', col: 'login_history', type: "JSONB DEFAULT '[]'" }
    ];

    for (const m of userMigrations) {
      await client.query(`ALTER TABLE ${m.table} ADD COLUMN IF NOT EXISTS ${m.col} ${m.type};`);
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
          id UUID PRIMARY KEY,
          owner TEXT REFERENCES users(username) ON DELETE CASCADE,
          data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const invoiceMigrations = [
      { table: 'invoices', col: 'company_id', type: 'UUID REFERENCES companies(id)' },
      { table: 'invoices', col: 'is_archived', type: 'BOOLEAN DEFAULT FALSE' }
    ];

    for (const m of invoiceMigrations) {
       await client.query(`ALTER TABLE ${m.table} ADD COLUMN IF NOT EXISTS ${m.col} ${m.type};`);
    }

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

    const adminCheck = await client.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', ['admin']);
    if (adminCheck.rows.length === 0) {
      await client.query(
        'INSERT INTO users (username, password, role, company_id, is_approved, security_question, security_answer) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        ['admin', 'admin', 'SUPER_ADMIN', defaultCompId, true, 'Quel est votre mot de code secret préféré ?', 'Admin123']
      );
    }

    await client.query('COMMIT');
    console.log("Database synced and migrated.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("DB Init Error:", err);
  } finally {
    client.release();
  }
};

app.use(cors());
app.use(express.json({ limit: '100mb' }));

app.get('/api/admin/companies', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) as user_count,
        (SELECT SUM(COALESCE((stats->>'totalTokens')::bigint, 0)) FROM users u WHERE u.company_id = c.id) as total_tokens,
        (SELECT COUNT(*) FROM invoices i WHERE i.company_id = c.id) as invoice_count,
        (SELECT SUM(COALESCE((stats->>'extractRequests')::int, 0)) FROM users u WHERE u.company_id = c.id) as total_extracts
      FROM companies c 
      ORDER BY c.name ASC
    `);
    
    const companies = result.rows.map(row => ({
      ...row,
      userCount: parseInt(row.user_count) || 0,
      totalTokens: parseInt(row.total_tokens) || 0,
      invoiceCount: parseInt(row.invoice_count) || 0,
      totalExtracts: parseInt(row.total_extracts) || 0
    }));
    
    res.json(companies);
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
      createdAt: user.created_at,
      stats: user.stats
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
      createdAt: user.created_at,
      stats: user.stats
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

app.get('/api/auth/recovery/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const result = await pool.query(
      'SELECT username, security_question FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Identité introuvable." });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  const { username, newPassword, answer } = req.body;
  try {
    const userRes = await pool.query(
      'SELECT security_answer FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    if (userRes.rows.length === 0) return res.status(404).json({ error: "Utilisateur introuvable." });
    if (userRes.rows[0].security_answer.toLowerCase().trim() !== answer.toLowerCase().trim()) {
      return res.status(401).json({ error: "Réponse de sécurité incorrecte." });
    }
    await pool.query(
      'UPDATE users SET password = $1 WHERE LOWER(username) = LOWER($2)',
      [newPassword, username.trim()]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/invoices', async (req, res) => {
  const { companyId } = req.query;
  try {
    const result = await pool.query(
      'SELECT data, is_archived FROM invoices WHERE company_id = $1 ORDER BY created_at DESC',
      [companyId]
    );
    res.json(result.rows.map(row => ({ ...row.data, isArchived: row.is_archived })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices', async (req, res) => {
  const invoice = req.body;
  if (!invoice.id || !invoice.owner) {
      return res.status(400).json({ error: "Missing Invoice ID or Owner" });
  }
  try {
    const userRes = await pool.query('SELECT username, company_id FROM users WHERE LOWER(username) = LOWER($1)', [invoice.owner]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: `User ${invoice.owner} not found.` });
    const { username, company_id } = userRes.rows[0];
    await pool.query(
      'INSERT INTO invoices (id, owner, company_id, data, is_archived) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO UPDATE SET data = $4, is_archived = $5', 
      [invoice.id, username, company_id, invoice, invoice.isArchived || false]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users/stats', async (req, res) => {
  const { username, tokens } = req.body;
  try {
    await pool.query(
      `UPDATE users 
       SET stats = stats || jsonb_build_object(
         'extractRequests', (COALESCE((stats->>'extractRequests')::int, 0) + 1),
         'totalTokens', (COALESCE((stats->>'totalTokens')::bigint, 0) + $1),
         'lastActive', CURRENT_TIMESTAMP
       )
       WHERE LOWER(username) = LOWER($2)`,
      [tokens || 0, username]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/logs/:username', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM processing_logs WHERE LOWER(username) = LOWER($1) ORDER BY timestamp DESC LIMIT 100',
      [req.params.username]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/logs', async (req, res) => {
  const { username, message, type } = req.body;
  try {
    const id = uuidv4();
    await pool.query(
      'INSERT INTO processing_logs (id, username, message, type) VALUES ($1, $2, $3, $4)',
      [id, username, message, type]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices/bulk-delete', async (req, res) => {
  const { ids } = req.body;
  try {
    await pool.query('DELETE FROM invoices WHERE id = ANY($1::uuid[])', [ids]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/invoices/bulk-archive', async (req, res) => {
  const { ids, archived } = req.body;
  try {
    await pool.query('UPDATE invoices SET is_archived = $1 WHERE id = ANY($2::uuid[])', [archived, ids]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', async (req, res) => {
  const { companyId } = req.query;
  try {
    let query = `
      SELECT u.username, u.role, u.created_at, u.company_id, u.is_approved, u.stats, c.name as company_name
      FROM users u 
      LEFT JOIN companies c ON u.company_id = c.id
    `;
    let params = [];
    if (companyId) { query += ` WHERE u.company_id = $1 `; params.push(companyId); }
    query += ` ORDER BY u.created_at DESC `;
    const result = await pool.query(query, params);
    res.json(result.rows.map(u => ({ 
      ...u, isApproved: u.is_approved, companyName: u.company_name, 
      companyId: u.company_id, createdAt: u.created_at, stats: u.stats 
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/users/update', async (req, res) => {
  const { username, role, companyId, isApproved } = req.body;
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
