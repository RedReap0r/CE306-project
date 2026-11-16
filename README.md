# ComTrade – เว็บไซต์ร้านค้าขายคอมพิวเตอร์มือสอง (CE306)

## วิธีรัน
1. ติดตั้ง Node.js 18 ขึ้นไป
2. เปิดโฟลเดอร์ใน VS Code → Terminal → `npm install` แล้ว `npm start`
3. หน้าร้าน http://localhost:3000 | Admin http://localhost:3000/admin.html

บัญชี Admin ตัวอย่าง: `admin@comtrade.local` / `admin1234` (เปลี่ยนก่อนใช้งานจริง)
ตั้งค่า `JWT_SECRET` เป็นข้อความสุ่มเมื่อนำขึ้นโฮสต์

## หน้าเว็บ
index (สินค้า+ตัวกรอง+ตะกร้า) | product (รายละเอียด) | login (เข้าสู่ระบบ/สมัคร) | orders (คำสั่งซื้อของฉัน) | admin (CRUD สินค้า, อัปโหลดรูป, สถานะคำสั่งซื้อ)

## API
POST /api/auth/register, /api/auth/login | GET /api/products (filter: q,cat,ram,gpu,cond,price), GET /api/products/:id, GET /api/stats
Admin: POST/PUT/DELETE /api/products, POST /api/upload, GET /api/orders, PATCH /api/orders/:id/status
ลูกค้า: POST /api/orders, GET /api/orders/me

## หมายเหตุ
ฐานข้อมูลเป็น SQLite (`comtrade.db`) บนโฮสต์ฟรีข้อมูลและรูปที่อัปโหลดอาจหายเมื่อเซิร์ฟเวอร์รีสตาร์ท
