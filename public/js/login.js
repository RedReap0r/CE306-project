var mode = location.hash === "#register" ? "register" : "login";
function $(i) {
  return document.getElementById(i);
}
function setMode(m) {
  mode = m;
  var l = m === "login";
  $("title").textContent = l ? "เข้าสู่ระบบ" : "สมัครสมาชิก";
  $("lead").textContent = l
    ? "ยินดีต้อนรับกลับมา - ลงชื่อเข้าใช้เพื่อซื้อคอมพิวเตอร์มือสอง"
    : "สร้างบัญชีเพื่อซื้อคอมพิวเตอร์มือสอง";
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
  alert("ฟีเจอร์ลืมรหัสผ่านยังไม่เปิดใช้งาน");
};
$("google").onclick = function () {
  alert("การเข้าสู่ระบบด้วย Google ยังไม่เปิดใช้งาน");
};
$("pass").addEventListener("keydown", function (e) {
  if (e.key === "Enter") $("go").click();
});
$("go").onclick = function () {
  var email = $("email").value.trim();
  fetch("/api/auth/" + mode, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: $("pass").value }),
  })
    .then(function (r) {
      return r.json().then(function (d) {
        if (!r.ok) throw new Error(d.error);
        return d;
      });
    })
    .then(function (d) {
      localStorage.setItem("token", d.token);
      localStorage.setItem("role", d.role);
      localStorage.setItem("email", email);
      if ($("remember").checked) localStorage.setItem("rememberEmail", email);
      else localStorage.removeItem("rememberEmail");
      location.href = d.role === "admin" ? "admin.html" : "index.html";
    })
    .catch(function (e) {
      $("err").textContent = e.message;
    });
};
$("email").value = localStorage.getItem("rememberEmail") || "";
setMode(mode);
