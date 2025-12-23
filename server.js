
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
    rejectUnauthorized: false // Requis pour Render/Heroku
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- ROUTES API ---

// 1. Récupérer les factures
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

// 2. Sauvegarder une facture
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

// 3. Synchroniser les utilisateurs et activités
app.post('/api/users/sync', async (req, res) => {
  const { username, stats, activity } = req.body;
  try {
    // Mise à jour ou création de l'utilisateur
    await pool.query(
      'INSERT INTO users (username, stats) VALUES ($1, $2) ON CONFLICT (username) DO UPDATE SET stats = $2',
      [username, stats]
    );
    
    // Enregistrement de l'activité
    if (activity) {
      await pool.query(
        'INSERT INTO activities (id, username, action, details, timestamp) VALUES ($1, $2, $3, $4, $5)',
        [activity.id, username, activity.action, activity.details, activity.timestamp]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Admin : Liste des utilisateurs
app.get('/api/admin/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT username, stats, role, created_at FROM users');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Servir les fichiers statiques du frontend (Vite/React)
app.use(express.static(path.join(__dirname, 'dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
