
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

// --- INITIALISATION AUTOMATIQUE ---
const initDb = async () => {
  console.log("Initialisation de la base de données...");
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          password TEXT,
          role TEXT DEFAULT 'USER',
          security_question TEXT,
          security_answer TEXT,
          stats JSONB DEFAULT '{"extractRequests": 0, "totalTokens": 0, "lastActive": ""}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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
    console.log("Base de données prête.");
  } catch (err) {
    console.error("Erreur d'initialisation DB:", err);
  }
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- ROUTES AUTHENTIFICATION ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password, role, security_question, security_answer } = req.body;
  try {
    const query = `
      INSERT INTO users (username, password, role, security_question, security_answer)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING username, role, stats, created_at;
    `;
    const result = await pool.query(query, [username, password, role, security_question, security_answer]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: "Cet utilisateur existe déjà." });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT username, password, role, stats, security_question FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Utilisateur non trouvé." });
    }
    
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: "Mot de passe incorrect." });
    }
    
    // On ne renvoie pas le mot de passe au front
    delete user.password;
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ROUTES API FACTURES ---

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
    const query = 'INSERT INTO invoices (id, owner, data) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET data = $3';
    await pool.query(query, [invoice.id, invoice.owner, invoice]);
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/sync', async (req, res) => {
  const { username, stats, activity } = req.body;
  try {
    await pool.query(
      'UPDATE users SET stats = $2 WHERE username = $1',
      [username, stats]
    );
    if (activity) {
      await pool.query(
        'INSERT INTO activities (id, username, action, details, timestamp) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING',
        [activity.id, username, activity.action, activity.details, activity.timestamp]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT username, stats, role, created_at, security_question FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Lancement
app.listen(port, async () => {
  console.log(`Serveur démarré sur le port ${port}`);
  await initDb();
});
