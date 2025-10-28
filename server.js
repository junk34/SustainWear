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


//signup
app.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.json({ message: 'All fields required.' });
  }

  // only donors work rn so remove this when doing staff registering
  if (role !== 'donor') {
    return res.json({ message: 'Charity staff not yet done' });
  }

  const status = 'approved'; 

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


//login space
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

app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
