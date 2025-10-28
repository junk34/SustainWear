const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

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


app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
