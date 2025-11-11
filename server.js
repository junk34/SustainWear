const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();


const app = express();
const PORT = 2000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const db = new sqlite3.Database('./sustainwear.db');


db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT,
  role TEXT,
  status TEXT
)`);


db.run(`CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_name TEXT,
  item TEXT,
  quantity INTEGER,
  message TEXT,
  status TEXT,
  reason TEXT,
  staff_message TEXT
)`);


app.post('/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.json({ message: 'All fields required.' });
  }
;
  const status = role === 'donor' ? 'approved' : 'pending';

  db.run(
    `INSERT INTO users (name, email, password, role, status)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, password, role, status], 
    function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint')) {
          res.json({ message: 'Email already exists.' });
        } else {
          res.json({ message: 'Error creating account.' });
        }
      } else {
        res.json({ message: 'Account created! You can now log in.' });
      }
    }
  );
});


app.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE email = ? AND password = ?`,
    [email, password], 
    (err, row) => {
      if (err) return res.json({ message: 'Database error.' });
      if (!row) return res.json({ message: 'Invalid email or password.' });

      res.json({
        message: 'Login successful.',
        role: row.role,
        status: row.status
      });
    }
  );
});


app.get('/admin/pending-staff', (req, res) => {
  db.all(
    `SELECT id, name, email FROM users WHERE role = 'staff' AND status = 'pending'`,
    [],
    (err, rows) => {
      if (err) return res.json({ message: 'Database error.' });
      res.json(rows);
    }
  );
});


app.post('/admin/approve', (req, res) => {
  const { id } = req.body;
  db.run(
    `UPDATE users SET status = 'approved' WHERE id = ?`,
    [id],
    function (err) {
      if (err) return res.json({ message: 'Database error.' });
      res.json({ message: 'Staff approved.' });
    }
  );
});


app.post('/admin/reject', (req, res) => {
  const { id } = req.body;
  db.run(`DELETE FROM users WHERE id = ?`, [id], function (err) {
    if (err) return res.json({ message: 'Database error.' });
    res.json({ message: 'Staff rejected and removed.' });
  });
});


app.get('/api/donation-requests', (req, res) => {
  db.all(`SELECT * FROM donations WHERE status IS NULL`, [], (err, rows) => {
    if (err) return res.json({ message: 'Database error.' });
    res.json(rows);
  });
});


app.post('/api/respond', (req, res) => {
  const { donationId, status, reason, customMessage } = req.body;

  db.run(
    `UPDATE donations SET status = ?, reason = ?, staff_message = ? WHERE id = ?`,
    [status, reason || null, customMessage || null, donationId],
    function (err) {
      if (err) return res.json({ message: 'Database error.' });
      res.json({ message: 'Response saved successfully.' });
    }
  );
});


app.post('/debug/users', (req, res) => {
  db.all(`SELECT * FROM users`, [], (err, rows) => {
    if (err) return res.json({ message: 'Database error.' });
    res.json(rows);
  });
});


app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
