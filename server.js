const express = require("express");
const app = express();
const PORT = 2000;

app.use(express.json());
app.use(express.static("C:/Users/44795/OneDrive/SustainWear/SustainWear/public"));

const db = new sqlite3.Database(dbPath);

let donations = [];       // all donations
let notifications = [];   // notifications for donors

let donationIdCounter = 1;
let notifIdCounter = 1;


function getDonorId() {
  return 1;
}

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

app.post("/api/donate-item", (req, res) => {
  const donorId = getDonorId();
  const { donorName, category, type, size, condition, description } = req.body;

  if (!donorName || !category || !type || !size || !condition) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  const donation = {
    id: donationIdCounter++,
    donorId,
    donorName,
    category,
    type,
    size,
    condition,
    description: description || "",
    status: "pending"
  };

  donations.push(donation);

  return res.json({
    message: "Donation submitted successfully!",
    donation
  });
});


//  STAFF ROUTE – Get all pending donations

app.get("/api/donation-requests", (req, res) => {
  const pending = donations.filter((d) => d.status === "pending");
  res.json(pending);
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

app.get("/donor/history", (req, res) => {
  const { donor } = req.query;

  if (!donor) return res.json([]);

//  STAFF ROUTE – Approve donation

app.post("/api/approve-donation", (req, res) => {
  const { id } = req.body;
  const donation = donations.find((d) => d.id === Number(id));

  if (!donation) {
    return res.status(404).json({ message: "Donation not found." });
  }

  donation.status = "approved";

  notifications.push({
    id: notifIdCounter++,
    donorId: donation.donorId,
    donationId: donation.id,
    message: "Your donation was approved!"
  });

  res.json({ message: "Donation approved + Notification sent." });
});


//  STAFF ROUTE – Reject donation

app.post("/api/reject-donation", (req, res) => {
  const { id, reason } = req.body;
  const donation = donations.find((d) => d.id === Number(id));

  if (!donation) {
    return res.status(404).json({ message: "Donation not found." });
  }

  donation.status = "rejected";

  notifications.push({
    id: notifIdCounter++,
    donorId: donation.donorId,
    donationId: donation.id,
    message: reason
      ? `Your donation was rejected: ${reason}`
      : "Your donation was rejected."
  });

  res.json({ message: "Donation rejected + Notification sent." });
});


//  DONOR ROUTE – Get notifications

app.get("/api/notifications", (req, res) => {
  const donorId = getDonorId();

  const list = notifications
    .filter((n) => n.donorId === donorId)
    .sort((a, b) => b.id - a.id);

  res.json(list);
});

app.listen(PORT, () => {
  console.log(`Server running → http://localhost:${PORT}`);
})
});
