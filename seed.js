const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt"); 

const db = new sqlite3.Database(path.join(__dirname, "sustainwear.db"));


async function seedDemoUsers(db) {
  const demoUsers = [
    {
      name: "Admin User",
      email: "admin@sustainwear.com",
      password: "admin123",
      role: "admin",
      status: "approved"
    },
    {
      name: "Staff User",
      email: "staff@sustainwear.com",
      password: "staff123",
      role: "staff",
      status: "approved"
    },
    {
      name: "Demo Donor",
      email: "donor@sustainwear.com",
      password: "donor123",
      role: "donor",
      status: "approved"
    }
  ];

  for (const user of demoUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);

    db.run(
      `
      INSERT OR IGNORE INTO users (name, email, password, role, status)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        user.name,
        user.email,
        hashedPassword,
        user.role,
        user.status
      ]
    );
  }

  console.log("✅ Demo users seeded (if not already present)");
}
module.exports = seedDemoUsers;