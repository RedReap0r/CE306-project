const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Load .env if present
const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let val = (match[2] || "").trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      process.env[match[1]] = val;
    }
  }
}

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:uXpGsiAhzqdspvljX6tnDbG5HHbpQtzUCn3U7IoNGsW03CXCvV0u2s5wiiOL0Pez@cude-db.m3ow.xyz:5129/postgres";

const pool = new Pool({
  connectionString,
  ssl: false,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
});

async function init() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'customer'
      );
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        cat TEXT,
        ram INTEGER DEFAULT 0,
        gpu TEXT,
        cond INTEGER,
        price INTEGER NOT NULL,
        spec TEXT,
        img TEXT
      );
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        total INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'รอชำระเงิน',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS order_items (
        order_id INTEGER REFERENCES orders(id),
        product_id INTEGER REFERENCES products(id),
        qty INTEGER,
        price INTEGER
      );
    `);

    // Ensure default admin user exists
    const adminCheck = await pool.query(
      "SELECT 1 FROM users WHERE role = 'admin' LIMIT 1",
    );
    if (adminCheck.rows.length === 0) {
      await pool.query(
        "INSERT INTO users (email, password, role) VALUES ($1, $2, 'admin')",
        ["admin@comtrade.local", bcrypt.hashSync("admin1234", 10)],
      );
    }
    console.log("Connected to PostgreSQL database successfully.");
  } catch (err) {
    console.error("PostgreSQL initialization error:", err.message);
  }
}

init();

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
