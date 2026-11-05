var mode = location.hash === "#register" ? "register" : "login";
function $(i) {
  return document.getElementById(i);
}
function sha(s) {
  return crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(s))
    .then(function (b) {
      return Array.from(new Uint8Array(b))
        .map(function (x) {
          return x.toString(16).padStart(2, "0");
        })
        .join("");
    });
}
function getUsers() {
  try {
    return JSON.parse(localStorage.getItem("users") || "{}");
  } catch (e) {
    return {};
  }
}
function setMode(m) {
  mode = m;
  var l = m === "login";
  $("title").textContent = l ? "เข้าสู่ระบบ" : "สมัครสมาชิก";
  $("lead").textContent = l
    ? "ยินดีต้อนรับกลับมา - ลงชื่อเข้าใช้เพื่อซื้อขายคอมพิวเตอร์มือสอง"
    : "สร้างบัญชีเพื่อซื้อขายคอมพิวเตอร์มือสอง";
  $("go").textContent = l ? "เข้าสู่ระบบ" : "สมัครสมาชิก";
  $("google").textContent = l ? "เข้าสู่ระบบด้วย Google" : "สมัครด้วย Google";
  $("swapText").textContent = l ? "ยังไม่มีบัญชี?" : "มีบัญชีแล้ว?";
  $("swap").textContent = l ? "สมัครสมาชิก" : "เข้าสู่ระบบ";
  $("err").textContent = "";
}
$("swap").onclick = function (e) {
  e.preventDefault();
  setMode(mode === "login" ? "register" : "login");
};
$("forgot").onclick = function (e) {
  e.preventDefault();
  alert("ฟีเจอร์ลืมรหัสผ่านจะทำในขั้นถัดไป");
};
$("google").onclick = function () {
  alert("การเข้าสู่ระบบด้วย Google จะทำในขั้นถัดไป");
};
$("pass").addEventListener("keydown", function (e) {
  if (e.key === "Enter") $("go").click();
});
$("go").onclick = function () {
  var email = $("email").value.trim().toLowerCase(),
    pass = $("pass").value;
  if (!/^\S+@\S+\.\S+$/.test(email) || pass.length < 6) {
    $("err").textContent = "อีเมลไม่ถูกต้อง หรือรหัสผ่านสั้นกว่า 6 ตัว";
    return;
  }
  sha(pass).then(function (h) {
    var users = getUsers();
    if (mode === "register") {
      if (users[email]) {
        $("err").textContent = "อีเมลนี้ถูกใช้แล้ว";
        return;
      }
      users[email] = h;
      localStorage.setItem("users", JSON.stringify(users));
    } else if (users[email] !== h) {
      $("err").textContent = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      return;
    }
    if ($("remember").checked) localStorage.setItem("rememberEmail", email);
    else localStorage.removeItem("rememberEmail");
    localStorage.setItem("me", email);
    location.href = "index.html";
  });
};
$("email").value = localStorage.getItem("rememberEmail") || "";
setMode(mode);
