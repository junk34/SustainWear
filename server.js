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

const dbPath = path.join(__dirname, 'sustainwear.db');
console.log("DB LOADED FROM:", dbPath);

const db = new sqlite3.Database(dbPath);
   
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT,
    status TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_name TEXT,
    category TEXT,
    subcategory TEXT,
    size TEXT,
    condition TEXT,
    description TEXT,
    status TEXT DEFAULT 'pending'
  )
`);


app.post("/signup", (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role)
    return res.json({ message: "All fields required." });

  const status = role === "donor" ? "approved" : "pending";

  db.run(
    `INSERT INTO users (name, email, password, role, status)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, password, role, status],
    err => {
      if (err) {
        if (err.message.includes("UNIQUE"))
          return res.json({ message: "Email already exists." });
        return res.json({ message: "Error creating account." });
      }
      res.json({ message: "Account created! You can now log in." });
    }
  );
});



app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE email = ? AND password = ?`,
    [email, password],
    (err, user) => {
      if (err) {
        return res.json({ message: "Database error." });
      }

      if (!user) {
        return res.json({ message: "Invalid email or password." });
      }

      res.json({
        message: "Login successful.",
        role: user.role,
        status: user.status,
        name: user.name
      });
    }
  );
});



app.post("/donate", (req, res) => {
  const { donor_name, category, subcategory, size, condition, description } = req.body;

  if (!donor_name || !category || !subcategory || !size || !condition)
    return res.json({ message: "Missing fields." });

  db.run(
    `INSERT INTO donations (donor_name, category, subcategory, size, condition, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [donor_name, category, subcategory, size, condition, description],
    err => {
      if (err) return res.json({ message: "Database error." });
      res.json({ message: "Donation submitted!" });
    }
  );
});


app.get("/admin/pending-staff", (req, res) => {
  db.all(
    `SELECT id, name, email FROM users WHERE role = 'staff' AND status = 'pending'`,
    [],
    (err, rows) => {
      if (err) return res.json({ message: "Database error." });
      res.json(rows);
    }
  );
});


app.post("/admin/approve", (req, res) => {
  const { id } = req.body;

  db.run(
    `UPDATE users SET status = 'approved' WHERE id = ?`,
    [id],
    err => {
      if (err) return res.json({ message: "Database error." });
      res.json({ message: "Staff approved." });
    }
  );
});

app.post("/admin/reject", (req, res) => {
  const { id } = req.body;

  db.run(
    `DELETE FROM users WHERE id = ?`,
    [id],
    err => {
      if (err) return res.json({ message: "Database error." });
      res.json({ message: "Staff rejected and removed." });
    }
  );
});


app.get("/staff/donations", (req, res) => {
  db.all(
    `SELECT * FROM donations WHERE status = 'pending'`,
    [],
    (err, rows) => {
      if (err) return res.json({ message: "Database error." });
      res.json(rows);
    }
  );
});


app.post("/staff/donations/approve", (req, res) => {
  const { id } = req.body;

  db.run(
    `UPDATE donations SET status = 'approved' WHERE id = ?`,
    [id],
    err => {
      if (err) return res.json({ message: "Database error." });
      res.json({ message: "Donation approved." });
    }
  );
});

app.post("/staff/donations/reject", (req, res) => {
  const { id } = req.body;

  db.run(
    `DELETE FROM donations WHERE id = ?`,
    [id],
    err => {
      if (err) return res.json({ message: "Database error." });
      res.json({ message: "Donation rejected." });
    }
  );
});

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`)
);