const express = require("express");
const app = express();
const PORT = 2025;

const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// create / open DB file
const db = new sqlite3.Database(path.join(__dirname, "sustainwear.db"));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------
// CREATE TABLES
// ---------------------------------------------------
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
  category TEXT,
  subcategory TEXT,
  size TEXT,
  condition TEXT,
  description TEXT,
  status TEXT DEFAULT 'pending'
)`);

// ---------------------------------------------------
// SIGNUP
// ---------------------------------------------------
app.post("/signup", (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.json({ message: "All fields required" });
  }

  // donors are auto-approved; staff start as pending
  const status = role === "donor" ? "approved" : "pending";

  db.run(
    `INSERT INTO users (name, email, password, role, status)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, password, role, status],
    err => {
      if (err) {
        return res.json({ message: "Email exists" });
      }
      res.json({ message: "Account created" });
    }
  );
});

// ---------------------------------------------------
// LOGIN
// ---------------------------------------------------
app.post("/login", (req, res) => {
  db.get(
    `SELECT * FROM users WHERE email=? AND password=?`,
    [req.body.email, req.body.password],
    (err, user) => {
      if (!user) return res.json({ message: "Invalid login" });
      res.json(user);
    }
  );
});

// ---------------------------------------------------
// ADMIN – USERS LIST
// ---------------------------------------------------
app.get("/admin/users", (req, res) => {
  db.all(
    `SELECT id, name, email, role, status
     FROM users
     ORDER BY id DESC`,
    (_, rows) => res.json(rows || [])
  );
});

// ---------------------------------------------------
// ADMIN – STATS
// ---------------------------------------------------
app.get("/admin/stats", (req, res) => {
  const stats = {
    totalUsers: 0,
    totalDonors: 0,
    staffApproved: 0,
    staffPending: 0,
    totalDonations: 0,
    donationsPending: 0
  };

  db.all(
    `SELECT role, status, COUNT(*) AS count
     FROM users
     GROUP BY role, status`,
    (_, rows) => {
      rows?.forEach(r => {
        stats.totalUsers += r.count;
        if (r.role === "donor") stats.totalDonors += r.count;
        if (r.role === "staff" && r.status === "approved")
          stats.staffApproved += r.count;
        if (r.role === "staff" && r.status === "pending")
          stats.staffPending += r.count;
      });

      db.all(
        `SELECT status, COUNT(*) AS count
         FROM donations
         GROUP BY status`,
        (_, rows2) => {
          rows2?.forEach(r => {
            stats.totalDonations += r.count;
            if (r.status === "pending") stats.donationsPending += r.count;
          });

          res.json(stats);
        }
      );
    }
  );
});

// ADMIN – PENDING STAFF

app.get("/admin/pending-staff", (req, res) => {
  db.all(
    `SELECT id, name, email
     FROM users
     WHERE role='staff' AND status='pending'`,
    (_, rows) => res.json(rows || [])
  );
});

app.post("/admin/approve", (req, res) => {
  db.run(
    `UPDATE users SET status='approved' WHERE id=?`,
    [req.body.id],
    () => res.json({ message: "Approved" })
  );
});

app.post("/admin/reject", (req, res) => {
  db.run(
    `UPDATE users SET status='rejected' WHERE id=?`,
    [req.body.id],
    () => res.json({ message: "Rejected" })
  );
});

// ---------------------------------------------------
// DONATIONS
// ---------------------------------------------------
app.post("/donate", (req, res) => {
  const d = req.body;
  db.run(
    `INSERT INTO donations
      (donor_name, category, subcategory, size, condition, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [d.donor_name, d.category, d.subcategory, d.size, d.condition, d.description],
    () => res.json({ message: "Added" })
  );
});

app.get("/api/donation-requests", (req, res) => {
  db.all(
    `SELECT * FROM donations WHERE status='pending'`,
    (_, rows) => res.json(rows || [])
  );
});

app.post("/api/approve-donation", (req, res) => {
  db.run(
    `UPDATE donations SET status='approved' WHERE id=?`,
    [req.body.id],
    () => res.json({ message: "Approved" })
  );
});

app.post("/api/reject-donation", (req, res) => {
  db.run(
    `UPDATE donations SET status='rejected' WHERE id=?`,
    [req.body.id],
    () => res.json({ message: "Rejected" })
  );
});

// SERVE ADMIN PAGE

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});


app.get("/admin/leaderboard", (req, res) => {
  const result = {};

  db.get(
    `SELECT category, COUNT(*) as count
     FROM donations
     GROUP BY category
     ORDER BY count DESC
     LIMIT 1`,
    (_, row) => {
      result.topCategory = row?.category || "N/A";

      db.get(
        `SELECT size, COUNT(*) as count
         FROM donations
         GROUP BY size
         ORDER BY count DESC
         LIMIT 1`,
        (_, row2) => {
          result.topSize = row2?.size || "N/A";
          res.json(result);
        }
      );
    }
  );
});
app.listen(PORT, () => console.log("http://localhost:" + PORT));