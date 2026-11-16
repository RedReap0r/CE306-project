var $ = function (i) {
  return document.getElementById(i);
};
var ALL = {},
  cart = {},
  token = localStorage.getItem("token");
try {
  cart = JSON.parse(localStorage.getItem("cart") || "{}");
} catch (e) {}
function baht(n) {
  return "฿" + n.toLocaleString("th-TH");
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
  });
}
function save() {
  localStorage.setItem("cart", JSON.stringify(cart));
}
function api(m, u, b) {
  return fetch(u, {
    method: m,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + (token || ""),
    },
    body: b ? JSON.stringify(b) : undefined,
  }).then(function (r) {
    return r.json().then(function (d) {
      if (!r.ok) throw new Error(d.error || "เกิดข้อผิดพลาด");
      return d;
    });
  });
}
function params() {
  return {
    q: $("q").value.trim(),
    cat: $("cat").value,
    ram: +$("ram").value,
    gpu: $("gpu").value,
    cond: +$("cond").value,
    price: +$("price").value,
  };
}
function fetchProducts(p) {
  return api("GET", "/api/products?" + new URLSearchParams(p)).then(
    function (l) {
      l.forEach(function (x) {
        ALL[x.id] = x;
      });
      return l;
    },
  );
}
function render(list, ms) {
  $("count").textContent = "พบ " + list.length + " รายการ";
  $("timing").textContent = "ตอบสนอง " + (ms / 1000).toFixed(2) + " วินาที";
  $("grid").innerHTML = list.length
    ? list
        .map(function (x) {
          var u = "product.html?id=" + x.id;
          return (
            '<article class="card"><a class="thumb" href="' +
            u +
            '">' +
            (x.img
              ? '<img src="' + esc(x.img) + '" alt="' + esc(x.name) + '">'
              : esc(x.cat || "")) +
            '</a><div class="in"><span class="tag">สภาพ ' +
            x.cond +
            '%</span><h3><a href="' +
            u +
            '">' +
            esc(x.name) +
            '</a></h3><div class="spec">' +
            (x.ram ? "RAM " + x.ram + "GB | " : "") +
            esc(x.gpu || "") +
            " | " +
            esc(x.spec || "") +
            '</div><div class="row"><span class="price">' +
            baht(x.price) +
            '</span><button class="btn" data-add="' +
            x.id +
            '">ใส่ตะกร้า</button></div></div></article>'
          );
        })
        .join("")
    : '<div class="empty">ไม่พบสินค้าตามเงื่อนไข ลองลดตัวกรองหรือเพิ่มราคาสูงสุด</div>';
}
function load() {
  var t = performance.now();
  $("grid").classList.add("loading");
  fetchProducts(params())
    .then(function (l) {
      render(l, performance.now() - t);
      $("grid").classList.remove("loading");
    })
    .catch(function () {
      $("grid").classList.remove("loading");
      $("grid").innerHTML =
        '<div class="empty">เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองรัน npm start</div>';
    });
}
["q", "cat", "ram", "gpu", "cond", "price"].forEach(function (id) {
  $(id).addEventListener("input", function () {
    $("condV").textContent = $("cond").value;
    $("priceV").textContent = (+$("price").value).toLocaleString("th-TH");
    load();
  });
});
function drawCart() {
  var sub = 0,
    n = 0;
  Object.keys(cart).forEach(function (id) {
    if (!ALL[id]) delete cart[id];
  });
  var ids = Object.keys(cart);
  $("items").innerHTML = ids.length
    ? ids
        .map(function (id) {
          var x = ALL[id],
            q = cart[id];
          sub += x.price * q;
          n += q;
          return (
            '<div class="item"><span>' +
            esc(x.name) +
            "<br><small>จำนวน " +
            q +
            "</small></span><span>" +
            baht(x.price * q) +
            '<br><button class="btn ghost" data-rm="' +
            id +
            '" style="padding:2px 8px">ลบ</button></span></div>'
          );
        })
        .join("")
    : '<div class="empty">ยังไม่มีสินค้า เลือกสินค้าแล้วกด “ใส่ตะกร้า”</div>';
  var ship = sub && sub < 50000 ? 150 : 0;
  $("cnt").textContent = n;
  $("sub").textContent = baht(sub);
  $("ship").textContent = ship ? baht(ship) : "ฟรี";
  $("tot").textContent = baht(sub + ship);
  save();
}
document.addEventListener("click", function (e) {
  var a = e.target.getAttribute("data-add"),
    r = e.target.getAttribute("data-rm"),
    c = e.target.getAttribute("data-cat");
  if (a) {
    cart[a] = (cart[a] || 0) + 1;
    drawCart();
    $("cart").classList.add("open");
  }
  if (r) {
    delete cart[r];
    drawCart();
  }
  if (c) {
    $("cat").value = c;
    load();
    $("grid").scrollIntoView({ behavior: "smooth" });
  }
});
$("openCart").onclick = function () {
  $("cart").classList.add("open");
};
$("closeCart").onclick = function () {
  $("cart").classList.remove("open");
};
$("checkout").onclick = function () {
  var items = Object.keys(cart).map(function (id) {
    return { id: +id, qty: cart[id] };
  });
  if (!items.length) return;
  if (!token) {
    location.href = "login.html";
    return;
  }
  api("POST", "/api/orders", { items: items })
    .then(function (o) {
      alert(
        "สั่งซื้อสำเร็จ เลขที่ #" +
          o.id +
          " ยอดรวม " +
          baht(o.total) +
          " (ดูสถานะได้ที่ คำสั่งซื้อของฉัน)",
      );
      cart = {};
      drawCart();
    })
    .catch(function (e) {
      if (/เข้าสู่ระบบ/.test(e.message)) {
        localStorage.removeItem("token");
        location.href = "login.html";
      } else alert(e.message);
    });
};
function authUI() {
  var on = !!token;
  $("userName").hidden = $("logoutBtn").hidden = !on;
  $("loginBtn").hidden = $("signupBtn").hidden = on;
  $("adminLink").hidden = localStorage.getItem("role") !== "admin";
  $("userName").textContent = localStorage.getItem("email") || "";
}
$("logoutBtn").onclick = function () {
  ["token", "role", "email"].forEach(function (k) {
    localStorage.removeItem(k);
  });
  token = null;
  authUI();
};
api("GET", "/api/stats")
  .then(function (s) {
    $("statUsers").textContent = s.users;
    $("statProducts").textContent = s.products;
    $("statCats").textContent = s.cats;
    $("statCond").textContent = s.cond + "%";
  })
  .catch(function () {});
api("GET", "/api/products")
  .then(function (l) {
    l.forEach(function (x) {
      ALL[x.id] = x;
    });
    drawCart();
  })
  .catch(function () {});
authUI();
drawCart();
load();
