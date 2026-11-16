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
app.post("/api/auth/register", (req, res) => {
  const { email, password } = req.body || {};
  if (!/^\S+@\S+\.\S+$/.test(email || "") || (password || "").length < 6)
    return bad(res, "อีเมลไม่ถูกต้อง หรือรหัสผ่านสั้นกว่า 6 ตัว");
  try {
    const r = db
      .prepare("INSERT INTO users(email,password) VALUES(?,?)")
      .run(email, bcrypt.hashSync(password, 10));
    res
      .status(201)
      .json({
        token: sign({ id: r.lastInsertRowid, role: "customer" }),
        role: "customer",
      });
  } catch (e) {
    bad(res, "อีเมลนี้ถูกใช้แล้ว", 409);
  }
});
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  const u = db.prepare("SELECT * FROM users WHERE email=?").get(email || "");
  if (!u || !bcrypt.compareSync(password || "", u.password))
    return bad(res, "อีเมลหรือรหัสผ่านไม่ถูกต้อง", 401);
  res.json({ token: sign(u), role: u.role });
});

// ---------- Products ----------
app.get("/api/products", (req, res) => {
  const q = req.query,
    w = [],
    a = [];
  if (q.q) {
    w.push("name LIKE ?");
    a.push("%" + q.q + "%");
  }
  if (q.cat) {
    w.push("cat=?");
    a.push(q.cat);
  }
  if (+q.ram > 0) {
    w.push("ram>=?");
    a.push(+q.ram);
  }
  if (q.gpu) {
    w.push("gpu=?");
    a.push(q.gpu);
  }
  if (+q.cond > 0) {
    w.push("cond>=?");
    a.push(+q.cond);
  }
  if (+q.price > 0) {
    w.push("price<=?");
    a.push(+q.price);
  }
  res.json(
    db
      .prepare(
        "SELECT * FROM products" +
          (w.length ? " WHERE " + w.join(" AND ") : "") +
          " ORDER BY id",
      )
      .all(...a),
  );
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
app.post("/api/products", auth("admin"), (req, res) => {
  const p = pick(req.body || {});
  if (!p) return bad(res, "ข้อมูลสินค้าไม่ครบหรือไม่ถูกต้อง");
  const r = db
    .prepare(
      "INSERT INTO products(name,cat,ram,gpu,cond,price,spec,img) VALUES(@name,@cat,@ram,@gpu,@cond,@price,@spec,@img)",
    )
    .run(p);
  res.status(201).json({ id: r.lastInsertRowid, ...p });
});
app.put("/api/products/:id", auth("admin"), (req, res) => {
  const p = pick(req.body || {});
  if (!p) return bad(res, "ข้อมูลสินค้าไม่ครบหรือไม่ถูกต้อง");
  const r = db
    .prepare(
      "UPDATE products SET name=@name,cat=@cat,ram=@ram,gpu=@gpu,cond=@cond,price=@price,spec=@spec,img=@img WHERE id=@id",
    )
    .run({ ...p, id: +req.params.id });
  r.changes
    ? res.json({ id: +req.params.id, ...p })
    : bad(res, "ไม่พบสินค้า", 404);
});
app.delete("/api/products/:id", auth("admin"), (req, res) => {
  try {
    const r = db.prepare("DELETE FROM products WHERE id=?").run(+req.params.id);
    r.changes ? res.status(204).end() : bad(res, "ไม่พบสินค้า", 404);
  } catch (e) {
    bad(res, "ลบไม่ได้ เพราะสินค้านี้อยู่ในคำสั่งซื้อแล้ว", 409);
  }
});
app.get("/api/products/:id", (req, res) => {
  const p = db.prepare("SELECT * FROM products WHERE id=?").get(+req.params.id);
  p ? res.json(p) : bad(res, "ไม่พบสินค้า", 404);
});
app.get("/api/stats", (req, res) => {
  const p = db
    .prepare(
      "SELECT COUNT(*) n, COUNT(DISTINCT cat) c, ROUND(AVG(cond)) a FROM products",
    )
    .get();
  res.json({
    products: p.n,
    cats: p.c,
    cond: p.a || 0,
    users: db
      .prepare("SELECT COUNT(*) n FROM users WHERE role='customer'")
      .get().n,
  });
});

// ---------- Orders ----------
app.post("/api/orders", auth(), (req, res) => {
  const items = Array.isArray(req.body && req.body.items) ? req.body.items : [];
  if (!items.length) return bad(res, "ตะกร้าว่าง");
  const make = db.transaction(() => {
    let sub = 0;
    const rows = items.map((i) => {
      const p = db
          .prepare("SELECT id,price FROM products WHERE id=?")
          .get(+i.id),
        qty = +i.qty;
      if (!p || !(qty > 0)) throw new Error("สินค้าไม่ถูกต้อง");
      sub += p.price * qty; // คิดราคาจากฐานข้อมูล ไม่เชื่อราคาจากหน้าเว็บ
      return { p, qty };
    });
    const total = sub + (sub < 50000 ? 150 : 0);
    const o = db
      .prepare("INSERT INTO orders(user_id,total) VALUES(?,?)")
      .run(req.user.id, total);
    rows.forEach((r) =>
      db
        .prepare("INSERT INTO order_items VALUES(?,?,?,?)")
        .run(o.lastInsertRowid, r.p.id, r.qty, r.p.price),
    );
    return { id: o.lastInsertRowid, total };
  });
  try {
    res.status(201).json(make());
  } catch (e) {
    bad(res, e.message);
  }
});
app.get("/api/orders/me", auth(), (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT o.*,(SELECT group_concat(p.name||' x'||i.qty,', ') FROM order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=o.id) AS items FROM orders o WHERE o.user_id=? ORDER BY o.id DESC",
      )
      .all(req.user.id),
  ),
);
app.get("/api/orders", auth("admin"), (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT o.*,u.email FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.id DESC",
      )
      .all(),
  ),
);
app.patch("/api/orders/:id/status", auth("admin"), (req, res) => {
  if (
    !["รอชำระเงิน", "ชำระแล้ว", "จัดส่งแล้ว", "ยกเลิก"].includes(
      req.body.status,
    )
  )
    return bad(res, "สถานะไม่ถูกต้อง");
  const r = db
    .prepare("UPDATE orders SET status=? WHERE id=?")
    .run(req.body.status, +req.params.id);
  r.changes ? res.json({ ok: true }) : bad(res, "ไม่พบคำสั่งซื้อ", 404);
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
