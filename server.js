const express = require("express");
const app = express();
const PORT = 2025;
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const session = require("express-session");
// create / open DB file
const db = new sqlite3.Database(path.join(__dirname, "sustainwear.db"));

app.use(express.json());
app.use(session({
  secret: "sustainwear_secret_change_me",
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, 
    maxAge: 24 * 60 * 60 * 1000 
  }
}));
app.use((req, res, next) => {
  const requestPath = req.path; // Rename to avoid conflict with 'path' module
  
  // ONLY check direct HTML file requests
  if (requestPath === '/admin.html' || 
      requestPath === '/charity_staff.html' || 
      requestPath === '/donor.html') {
    
    if (!req.session.user) {
      return res.redirect('/login.html');
    }
    
    if (requestPath === '/admin.html' && req.session.user.role !== 'admin') {
      return res.status(403).send('Access denied');
    }
    if (requestPath === '/charity_staff.html' && req.session.user.role !== 'staff') {
      return res.status(403).send('Access denied');
    }
    if (requestPath === '/donor.html' && req.session.user.role !== 'donor') {
      return res.status(403).send('Access denied');
    }
  }
  
  next();
});

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
// AUTH HELPERS
// ---------------------------------------------------
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not logged in" });
  }
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Not logged in" });
    }
    if (req.session.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
function requireStaffOrAdmin(req, res, next) {
  if (!req.session.user) return res.status(401).json({ message: "Not logged in" });
  const r = req.session.user.role;
  if (r !== "staff" && r !== "admin") return res.status(403).json({ message: "Forbidden" });
  next();
}

app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ loggedIn: false });
  res.json({ loggedIn: true, ...req.session.user });
});
app.post("/logout", (req, res) => {
 req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    res.clearCookie("connect.sid");
    res.json({ success: true, message: "Logged out" });
  });
});


// ---------------------------------------------------
// SIGNUP
// ---------------------------------------------------
app.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields required" });
  }
  const validRoles = ["donor", "staff", "admin"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid role" });
  }
  // donors are auto-approved; staff start as pending
  const status = role === "donor" ? "approved" : "pending";
  try {
    const hashedPassword = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (name, email, password, role, status)
     VALUES (?, ?, ?, ?, ?)`,
    [name, email, hashedPassword, role, status],
    err => {
      if (err) {
        return res.json({ message: "Email exists" });
    }
      res.json({ message: "Account created" });
    }
  );
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Signup failed" });
   }
});


// ---------------------------------------------------
// LOGIN
// ---------------------------------------------------
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  
  // Add input validation
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }
  
  db.get(
    `SELECT * FROM users WHERE email=?`,
    [email],
    async (err, user) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Server error" });
      }
      if (!user) return res.status(401).json({ message: "Invalid login" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ message: "Invalid login" });

      if (user.status === "pending") {
        return res.json({ 
          success: false, 
          status: "pending",
          message: "Account pending approval" 
        });
      }
      
      if (user.status === "rejected") {
        return res.json({ 
          success: false,
          status: "rejected",
          message: "Account rejected. Contact admin." 
        });
      }

      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      };

      res.json({
        success: true,
        ...req.session.user
      });
    }
  );
});

// ---------------------------------------------------
// ADMIN – USERS LIST
// ---------------------------------------------------
app.get("/admin/users",requireRole("admin"), (req, res) => {
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
app.get("/admin/stats",requireRole("admin"), (req, res) => {
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
app.get("/admin/pending-staff", requireRole("admin"), (req, res) => {
  db.all(
    `SELECT id, name, email
     FROM users
     WHERE role='staff' AND status='pending'`,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json(rows || []);
    }
  );
});

app.post("/admin/approve", requireRole("admin"), (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "User ID required" });
  
  db.run(
    `UPDATE users SET status='approved' WHERE id=?`,
    [id],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ message: "Approved" });
    }
  );
});

app.post("/admin/reject", requireRole("admin"), (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "User ID required" });
  
  db.run(
    `UPDATE users SET status='rejected' WHERE id=?`,
    [id],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ message: "Rejected" });
    }
  );
});
// ---------------------------------------------------
// DONATIONS
// ---------------------------------------------------
app.post("/donate", requireLogin, (req, res) => {
  const d = req.body;
  
  // Basic validation
  if (!d.donor_name || !d.category) {
    return res.status(400).json({ message: "Missing required fields" });
  }
  
  db.run(
    `INSERT INTO donations
      (donor_name, category, subcategory, size, condition, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [d.donor_name, d.category, d.subcategory, d.size, d.condition, d.description],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ 
        message: "DONATION SUBMITTED",
        id: this.lastID 
      });
    }
  );
});

app.get("/api/donation-requests", requireStaffOrAdmin, (req, res) => {
  db.all(
    `SELECT * FROM donations WHERE status='pending'`,
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json(rows || []);
    }
  );
});

app.post("/api/approve-donation", requireStaffOrAdmin, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "Donation ID required" });
  
  db.run(
    `UPDATE donations SET status='approved' WHERE id=?`,
    [id],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ message: "Approved" });
    }
  );
});

app.post("/api/reject-donation", requireStaffOrAdmin, (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ message: "Donation ID required" });
  
  db.run(
    `UPDATE donations SET status='rejected' WHERE id=?`,
    [id],
    function(err) {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json({ message: "Rejected" });
    }
  );
});

app.get("/donor/history", requireLogin, (req, res) => {
  const donor = req.session.user.name;
  db.all(
    `SELECT * FROM donations
     WHERE donor_name = ?
     ORDER BY id DESC`,
    [donor],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "Database error" });
      }
      res.json(rows || []);
    }
  );
});

//donor
app.get("/donor", requireLogin, (req, res) => {
  if (req.session.user.role !== "donor") {
    return res.redirect(`/${req.session.user.role}`);
  }
  res.sendFile(path.join(__dirname, "public/donor.html"));
});
app.get("/staff", requireLogin, (req, res) => {
  if (req.session.user.role !== "staff") {
    return res.redirect(`/${req.session.user.role}`);
  }
  res.sendFile(path.join(__dirname, "public/charity_staff.html"));
});
// redirect authenticated users away from login/signup
app.get(["/login.html", "/signup.html"], (req, res, next) => {
  if (req.session.user) {
    return res.redirect(`/${req.session.user.role}`);
  }
  next(); 
});



// SERVE ADMIN PAGE

app.get("/admin", requireRole("admin"), (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});


app.get("/admin/leaderboard", requireRole("admin"), (req, res) => {
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