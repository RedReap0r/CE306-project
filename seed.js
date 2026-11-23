const db = require("./db.js");

const products = [
  { name: "MacBook Pro 14 M2 Pro", cat: "โน้ตบุ๊ก", ram: 16, gpu: "Integrated", cond: 98, price: 72900, spec: "M2 Pro | SSD 512GB", img: "/images/macbook-pro-14.jpg" },
  { name: "Intel i7-13700KF RTX 4070", cat: "เดสก์ท็อป", ram: 32, gpu: "RTX 4070", cond: 95, price: 42500, spec: "i7-13700KF | B660 | NVMe 1TB", img: "/images/intel-i7-rtx4070.jpg" },
  { name: "Dell UltraSharp 34 Curved", cat: "จอมอนิเตอร์", ram: 0, gpu: "", cond: 90, price: 18900, spec: "34\" QHD IPS 60Hz", img: "/images/dell-ultrasharp-34.jpg" },
  { name: "HP Omen 15 RTX 3070", cat: "โน้ตบุ๊ก", ram: 16, gpu: "RTX 3070", cond: 85, price: 32000, spec: "i7-11800H | SSD 512GB", img: "/images/hp-omen-15.jpg" },
  { name: "Lenovo ThinkPad T14 Gen3", cat: "โน้ตบุ๊ก", ram: 16, gpu: "Integrated", cond: 92, price: 24500, spec: "Ryzen 7 Pro 6850U | SSD 512GB", img: "/images/lenovo-thinkpad-t14.jpg" },
  { name: "ASUS ROG RTX 3080 12GB", cat: "การ์ดจอ", ram: 0, gpu: "RTX 3080", cond: 88, price: 19900, spec: "RTX 3080 12GB GDDR6X", img: "/images/asus-rog-rtx3080.jpg" },
  { name: "Ryzen 5 5600 Radeon RX 6600", cat: "เดสก์ท็อป", ram: 16, gpu: "Radeon RX 6600", cond: 88, price: 15900, spec: "B550 | NVMe 500GB", img: "/images/ryzen5-rx6600.jpg" },
  { name: "MSI Katana RTX 4060", cat: "โน้ตบุ๊ก", ram: 16, gpu: "RTX 4060", cond: 97, price: 29900, spec: "i7-13620H | SSD 512GB", img: "/images/msi-katana-rtx4060.jpg" },
  { name: "LG 27GL850 165Hz QHD", cat: "จอมอนิเตอร์", ram: 0, gpu: "", cond: 94, price: 11500, spec: "27\" QHD IPS 165Hz G-Sync", img: "/images/lg-27gl850.jpg" },
  { name: "MacBook Pro 14 M4 Pro", cat: "โน้ตบุ๊ก", ram: 24, gpu: "Integrated", cond: 99, price: 89000, spec: "M4 Pro | SSD 512GB", img: "/images/macbook-pro-14.jpg" }
];

async function seed() {
  try {
    const check = await db.query("SELECT count(*) FROM products");
    if (parseInt(check.rows[0].count) > 0) {
      console.log(`มีข้อมูลสินค้าอยู่แล้ว (${check.rows[0].count} ชิ้น) ข้ามขั้นตอนการ seed`);
      process.exit(0);
    }

    for (const p of products) {
      await db.query(
        "INSERT INTO products (name, cat, ram, gpu, cond, price, spec, img) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        [p.name, p.cat, p.ram, p.gpu, p.cond, p.price, p.spec, p.img]
      );
    }
    console.log(`เพิ่มข้อมูลสินค้าตัวอย่างสำเร็จเรียบร้อย (${products.length} ชิ้น)`);
  } catch (err) {
    console.error("เกิดข้อผิดพลาดในการ seed:", err.message);
  } finally {
    process.exit(0);
  }
}

// รอให้การเชื่อมต่อและ init ตารางพร้อมก่อนเริ่ม seed
setTimeout(seed, 800);
