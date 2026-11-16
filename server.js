const express = require("express"),
  bcrypt = require("bcryptjs"),
  jwt = require("jsonwebtoken"),
  db = require("./db");

const app = express(),
  SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.use(express.json());
app.use(express.static("public"));

function auth(role) {
  return (req, res, next) => {
    try {
      req.user = jwt.verify(
        (req.headers.authorization || "").replace("Bearer ", ""),
        SECRET,
      );
    } catch (e) {
      return bad(res, "กรุณาเข้าสู่ระบบ", 401);
    }
    if (role && req.user.role !== role)
      return bad(res, "ไม่มีสิทธิ์เข้าถึง", 403);
    next();
  };
}

const bad = (res, m, c) => res.status(c || 400).json({ error: m });
const sign = (u) =>
  jwt.sign({ id: u.id, role: u.role }, SECRET, { expiresIn: "2h" });

// ---------- Auth ----------
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(email || "") || (password || "").length < 6)
    return bad(res, "อีเมลไม่ถูกต้อง หรือรหัสผ่านสั้นกว่า 6 ตัว");
  try {
    const r = await db.query(
      "INSERT INTO users(email, password, role) VALUES($1, $2, 'customer') RETURNING id, role",
      [email, bcrypt.hashSync(password, 10)],
    );
    const u = r.rows[0];
    res.status(201).json({
      token: sign(u),
      role: u.role,
    });
  } catch (e) {
    bad(res, "อีเมลนี้ถูกใช้แล้ว", 409);
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  try {
    const r = await db.query("SELECT * FROM users WHERE email = $1", [
      email || "",
    ]);
    const u = r.rows[0];
    if (!u || !bcrypt.compareSync(password || "", u.password))
      return bad(res, "อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
    res.json({ token: sign(u), role: u.role });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---------- Products ----------
app.get("/api/products", async (req, res) => {
  const q = req.query,
    w = [],
    a = [];
  if (q.q) {
    a.push("%" + q.q + "%");
    w.push(`name ILIKE $${a.length}`);
  }
  if (q.cat) {
    a.push(q.cat);
    w.push(`cat = $${a.length}`);
  }
  if (+q.ram > 0) {
    a.push(+q.ram);
    w.push(`ram >= $${a.length}`);
  }
  if (q.gpu) {
    a.push(q.gpu);
    w.push(`gpu = $${a.length}`);
  }
  if (+q.cond > 0) {
    a.push(+q.cond);
    w.push(`cond >= $${a.length}`);
  }
  if (+q.price > 0) {
    a.push(+q.price);
    w.push(`price <= $${a.length}`);
  }

  const sql =
    "SELECT * FROM products" +
    (w.length ? " WHERE " + w.join(" AND ") : "") +
    " ORDER BY id";

  try {
    const r = await db.query(sql, a);
    res.json(r.rows);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

function pick(b) {
  const p = {
    name: String(b.name || "").trim(),
    cat: b.cat || "",
    ram: +b.ram || 0,
    gpu: b.gpu || "",
    cond: +b.cond,
    price: +b.price,
    spec: b.spec || "",
    img: /^(images|uploads)\/[\w.-]+$/.test(b.img || "") ? b.img : "",
  };
  return p.name && p.price > 0 && p.cond >= 0 && p.cond <= 100 ? p : null;
}

app.post("/api/products", auth("admin"), async (req, res) => {
  const p = pick(req.body || {});
  if (!p) return bad(res, "ข้อมูลสินค้าไม่ครบหรือไม่ถูกต้อง");
  try {
    const r = await db.query(
      "INSERT INTO products(name, cat, ram, gpu, cond, price, spec, img) VALUES($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      [p.name, p.cat, p.ram, p.gpu, p.cond, p.price, p.spec, p.img],
    );
    res.status(201).json({ id: r.rows[0].id, ...p });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

app.put("/api/products/:id", auth("admin"), async (req, res) => {
  const p = pick(req.body || {});
  if (!p) return bad(res, "ข้อมูลสินค้าไม่ครบหรือไม่ถูกต้อง");
  try {
    const r = await db.query(
      "UPDATE products SET name=$1, cat=$2, ram=$3, gpu=$4, cond=$5, price=$6, spec=$7, img=$8 WHERE id=$9",
      [
        p.name,
        p.cat,
        p.ram,
        p.gpu,
        p.cond,
        p.price,
        p.spec,
        p.img,
        +req.params.id,
      ],
    );
    r.rowCount
      ? res.json({ id: +req.params.id, ...p })
      : bad(res, "ไม่พบสินค้า", 404);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

app.delete("/api/products/:id", auth("admin"), async (req, res) => {
  try {
    const r = await db.query("DELETE FROM products WHERE id = $1", [
      +req.params.id,
    ]);
    r.rowCount ? res.status(204).end() : bad(res, "ไม่พบสินค้า", 404);
  } catch (e) {
    bad(res, "ลบไม่ได้ เพราะสินค้านี้อยู่ในคำสั่งซื้อแล้ว", 409);
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const r = await db.query("SELECT * FROM products WHERE id = $1", [
      +req.params.id,
    ]);
    r.rows[0] ? res.json(r.rows[0]) : bad(res, "ไม่พบสินค้า", 404);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

app.get("/api/stats", async (req, res) => {
  try {
    const p = await db.query(
      "SELECT COUNT(*)::int n, COUNT(DISTINCT cat)::int c, ROUND(AVG(cond))::int a FROM products",
    );
    const u = await db.query(
      "SELECT COUNT(*)::int n FROM users WHERE role = 'customer'",
    );
    res.json({
      products: p.rows[0].n,
      cats: p.rows[0].c,
      cond: p.rows[0].a || 0,
      users: u.rows[0].n,
    });
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---------- Orders ----------
app.post("/api/orders", auth(), async (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  if (!items.length) return bad(res, "ตะกร้าว่าง");

  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    let sub = 0;
    const rows = [];
    for (const i of items) {
      const pRes = await client.query(
        "SELECT id, price FROM products WHERE id = $1",
        [+i.id],
      );
      const p = pRes.rows[0];
      const qty = +i.qty;
      if (!p || !(qty > 0)) throw new Error("สินค้าไม่ถูกต้อง");
      sub += p.price * qty;
      rows.push({ p, qty });
    }
    const total = sub + (sub < 50000 ? 150 : 0);
    const oRes = await client.query(
      "INSERT INTO orders(user_id, total) VALUES($1, $2) RETURNING id",
      [req.user.id, total],
    );
    const orderId = oRes.rows[0].id;
    for (const r of rows) {
      await client.query(
        "INSERT INTO order_items(order_id, product_id, qty, price) VALUES($1, $2, $3, $4)",
        [orderId, r.p.id, r.qty, r.p.price],
      );
    }
    await client.query("COMMIT");
    res.status(201).json({ id: orderId, total });
  } catch (e) {
    await client.query("ROLLBACK");
    bad(res, e.message);
  } finally {
    client.release();
  }
});

app.get("/api/orders/me", auth(), async (req, res) => {
  try {
    const sql = `
      SELECT o.*,
        (SELECT string_agg(p.name || ' x' || i.qty, ', ')
         FROM order_items i
         JOIN products p ON p.id = i.product_id
         WHERE i.order_id = o.id) AS items
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.id DESC
    `;
    const r = await db.query(sql, [req.user.id]);
    res.json(r.rows);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

app.get("/api/orders", auth("admin"), async (req, res) => {
  try {
    const sql = `
      SELECT o.*, u.email
      FROM orders o
      JOIN users u ON u.id = o.user_id
      ORDER BY o.id DESC
    `;
    const r = await db.query(sql);
    res.json(r.rows);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

app.patch("/api/orders/:id/status", auth("admin"), async (req, res) => {
  if (
    !["รอชำระเงิน", "ชำระแล้ว", "จัดส่งแล้ว", "ยกเลิก"].includes(
      req.body.status,
    )
  )
    return bad(res, "สถานะไม่ถูกต้อง");
  try {
    const r = await db.query("UPDATE orders SET status = $1 WHERE id = $2", [
      req.body.status,
      +req.params.id,
    ]);
    r.rowCount ? res.json({ ok: true }) : bad(res, "ไม่พบคำสั่งซื้อ", 404);
  } catch (e) {
    bad(res, e.message, 500);
  }
});

// ---------- อัปโหลดรูป (Admin) ----------
const multer = require("multer"),
  path = require("path"),
  fs = require("fs");

fs.mkdirSync("public/uploads", { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: "public/uploads",
    filename: (q, f, cb) =>
      cb(null, Date.now() + path.extname(f.originalname).toLowerCase()),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (q, f, cb) =>
    cb(null, ["image/jpeg", "image/png", "image/webp"].includes(f.mimetype)),
});

app.post("/api/upload", auth("admin"), upload.single("image"), (req, res) =>
  req.file
    ? res.status(201).json({ url: "uploads/" + req.file.filename })
    : bad(res, "ต้องเป็นไฟล์ JPG, PNG หรือ WEBP"),
);

app.use((err, req, res, next) =>
  bad(res, "อัปโหลดไม่สำเร็จ (ไฟล์ต้องไม่เกิน 2 MB)"),
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("เปิดที่ http://localhost:" + PORT));
