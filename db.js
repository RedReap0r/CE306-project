const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const db = new Database("comtrade.db");
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'customer');
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, cat TEXT, ram INTEGER DEFAULT 0, gpu TEXT, cond INTEGER, price INTEGER NOT NULL, spec TEXT, img TEXT);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id), total INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'รอชำระเงิน', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS order_items(order_id INTEGER REFERENCES orders(id), product_id INTEGER REFERENCES products(id), qty INTEGER, price INTEGER);
`);
try {
  db.exec("ALTER TABLE products ADD COLUMN img TEXT");
} catch (e) {}
if (!db.prepare("SELECT 1 FROM users WHERE role='admin'").get()) {
  db.prepare("INSERT INTO users(email,password,role) VALUES(?,?,'admin')").run(
    "admin@comtrade.local",
    bcrypt.hashSync("admin1234", 10),
  );
}
if (!db.prepare("SELECT 1 FROM products").get()) {
  const ins = db.prepare(
    "INSERT INTO products(name,cat,ram,gpu,cond,price,spec) VALUES(?,?,?,?,?,?,?)",
  );
  [
    [
      "MacBook Pro 14 M2 Pro",
      "โน้ตบุ๊ก",
      16,
      "Integrated",
      98,
      45900,
      "SSD 512GB | Space Gray",
    ],
    [
      "Intel i7-13700KF RTX 4070",
      "เดสก์ท็อป",
      32,
      "RTX",
      95,
      38500,
      "DDR5 | NVMe 1TB",
    ],
    [
      "Dell UltraSharp 34 Curved",
      "จอมอนิเตอร์",
      0,
      "Integrated",
      90,
      16900,
      "WQHD | IPS | USB-C Hub",
    ],
    [
      "ASUS ROG Strix RTX 3080 10GB",
      "การ์ดจอ",
      0,
      "RTX",
      92,
      12900,
      "มีกล่องครบ",
    ],
    [
      "Lenovo ThinkPad T14",
      "โน้ตบุ๊ก",
      8,
      "Integrated",
      82,
      11500,
      "Ryzen 5 PRO | SSD 256GB",
    ],
    [
      "HP Omen 15 GTX 1660 Ti",
      "โน้ตบุ๊ก",
      16,
      "GTX",
      85,
      19900,
      "i7-9750H | SSD 512GB",
    ],
    [
      "Ryzen 5 5600 Radeon RX 6600",
      "เดสก์ท็อป",
      16,
      "Radeon",
      88,
      15900,
      "B550 | NVMe 500GB",
    ],
    [
      "LG 27GL850 Gaming 144Hz",
      "จอมอนิเตอร์",
      0,
      "Integrated",
      80,
      6900,
      "QHD | Nano IPS",
    ],
    [
      "MSI Katana RTX 4060",
      "โน้ตบุ๊ก",
      32,
      "RTX",
      96,
      32900,
      "i7-13620H | SSD 1TB",
    ],
    [
      "Gigabyte GTX 1080 Ti 11GB",
      "การ์ดจอ",
      0,
      "GTX",
      75,
      7500,
      "ผ่านการทดสอบโหลด",
    ],
  ].forEach((r) => ins.run(...r));
}
const IMG = {
  "MacBook Pro 14 M2 Pro": "macbook-pro-14",
  "Intel i7-13700KF RTX 4070": "intel-i7-rtx4070",
  "Dell UltraSharp 34 Curved": "dell-ultrasharp-34",
  "ASUS ROG Strix RTX 3080 10GB": "asus-rog-rtx3080",
  "Lenovo ThinkPad T14": "lenovo-thinkpad-t14",
  "HP Omen 15 GTX 1660 Ti": "hp-omen-15",
  "Ryzen 5 5600 Radeon RX 6600": "ryzen5-rx6600",
  "LG 27GL850 Gaming 144Hz": "lg-27gl850",
  "MSI Katana RTX 4060": "msi-katana-rtx4060",
};
for (const [n, f] of Object.entries(IMG))
  db.prepare("UPDATE products SET img=? WHERE name=? AND img IS NULL").run(
    "images/" + f + ".jpg",
    n,
  );
module.exports = db;
