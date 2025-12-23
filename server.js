
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
  console.log("Synchronisation du schéma de la base de données...");
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Création des tables de base
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          username TEXT PRIMARY KEY,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Migration : Ajout des colonnes manquantes si la table existait déjà
    const columnsToEnsure = [
      { name: 'password', type: 'TEXT' },
      { name: 'role', type: "TEXT DEFAULT 'USER'" },
      { name: 'security_question', type: 'TEXT' },
      { name: 'security_answer', type: 'TEXT' },
      { name: 'stats', type: "JSONB DEFAULT '{\"extractRequests\": 0, \"totalTokens\": 0, \"lastActive\": \"\"}'" }
    ];

    for (const col of columnsToEnsure) {
      await client.query(`
        DO $$ 
        BEGIN 
          BEGIN
            ALTER TABLE users ADD COLUMN ${col.name} ${col.type};
          EXCEPTION
            WHEN duplicate_column THEN RAISE NOTICE 'column ${col.name} already exists in users table.';
          END;
        END $$;
      `);
    }

    // 3. Autres tables
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

    // 4. Index de performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invoices_owner ON invoices(owner);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(username);`);

    await client.query('COMMIT');
    console.log("Base de données synchronisée avec succès.");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Erreur critique lors de la synchronisation DB:", err);
  } finally {
    client.release();
  }
};

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- ROUTES AUTHENTIFICATION ---

app.post('/api/auth/register', async (req, res) => {
  const { username, password, role, security_question, security_answer } = req.body;
  
  // Validation stricte du rôle admin pour les noms réservés
  const masterAdmins = ['admin', 'jean duhamel', 'manager'];
  const finalRole = masterAdmins.includes(username.toLowerCase().trim()) ? 'ADMIN' : role;

  try {
    const query = `
      INSERT INTO users (username, password, role, security_question, security_answer)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO UPDATE SET 
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        security_question = EXCLUDED.security_question,
        security_answer = EXCLUDED.security_answer
      RETURNING username, role, stats, created_at;
    `;
    const result = await pool.query(query, [username, password, finalRole, security_question, security_answer]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT username, password, role, stats, security_question FROM users WHERE LOWER(username) = LOWER($1)',
      [username.trim()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Identité inconnue dans cette instance." });
    }
    
    const user = result.rows[0];
    if (user.password !== password) {
      return res.status(401).json({ error: "Accès refusé : Identifiants incorrects." });
    }
    
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
    const result = await pool.query('SELECT username, stats, role, created_at, security_question FROM users ORDER BY created_at DESC');
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
