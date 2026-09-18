import http from "node:http";
import https from "node:https";

const required = ["YEPAS_BASE_URL", "YEPAS_LOGIN_NAME", "YEPAS_PASSWORD", "YEPAS_ROLE"];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`Eksik ortam değişkeni: ${name}`);
    process.exit(2);
  }
}

const baseUrl = process.env.YEPAS_BASE_URL.replace(/\/+$/, "");
const loginName = process.env.YEPAS_LOGIN_NAME;
const password = process.env.YEPAS_PASSWORD;
const role = process.env.YEPAS_ROLE.toUpperCase();
const allowSelfSigned = process.env.YEPAS_ALLOW_SELF_SIGNED === "true";

if (!new Set(["CUSTOMER", "DRIVER"]).has(role)) {
  console.error("YEPAS_ROLE yalnız CUSTOMER veya DRIVER olabilir.");
  process.exit(2);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function request(path, { method = "GET", token, body } = {}) {
  const url = new URL(`${baseUrl}${path}`);
  const payload = body === undefined ? null : JSON.stringify(body);
  const headers = { Accept: "application/json", "X-Yepas-Client": "mobile-v1" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (payload !== null) {
    headers["Content-Type"] = "application/json";
    headers["Content-Length"] = Buffer.byteLength(payload);
  }

  const transport = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = transport.request(url, {
      method, headers, timeout: 15000, rejectUnauthorized: !allowSelfSigned,
    }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        let json = null;
        if (text) {
          try { json = JSON.parse(text); }
          catch { return reject(new Error(`${method} ${path}: JSON olmayan yanıt (${res.statusCode})`)); }
        }
        resolve({ status: res.statusCode, json });
      });
    });
    req.on("timeout", () => req.destroy(new Error(`${method} ${path}: zaman aşımı`)));
    req.on("error", reject);
    if (payload !== null) req.write(payload);
    req.end();
  });
}

let token;
try {
  console.log(`[1/5] ${role} girişi sınanıyor...`);
  const login = await request("/auth/login", {
    method: "POST", body: { loginName, password, role },
  });
  assert(login.status === 200, `Giriş başarısız: HTTP ${login.status}`);
  assert(login.json?.role === role, "Giriş rolü beklenen değer değil.");
  assert(typeof login.json?.accessToken === "string" && login.json.accessToken.length > 20,
    "Mobil accessToken dönmedi.");
  token = login.json.accessToken;

  console.log("[2/5] Token doğrulanıyor...");
  const me = await request("/auth/me", { token });
  assert(me.status === 200, `/auth/me başarısız: HTTP ${me.status}`);
  assert(me.json?.role === role, "/auth/me rolü uyuşmuyor.");
  assert(me.json?.loginName === login.json.loginName, "Kullanıcı kimliği uyuşmuyor.");
  if (me.json?.mustChangePassword)
    throw new Error("Hesap geçici parola kullanıyor; smoke testinden önce parola değiştirilmelidir.");

  if (role === "CUSTOMER") {
    console.log("[3/5] Müşteri şubeleri okunuyor...");
    const branches = await request("/customer/branches", { token });
    assert(branches.status === 200, `Şube listesi başarısız: HTTP ${branches.status}`);
    assert(Array.isArray(branches.json) && branches.json.length > 0, "Hesaba bağlı şube bulunamadı.");
    const configuredMbId = Number(process.env.YEPAS_MB_ID || 0);
    const branch = configuredMbId
      ? branches.json.find((item) => item.legacyMbId === configuredMbId)
      : branches.json[0];
    assert(branch && Number.isInteger(branch.legacyMbId), "Test edilecek legacyMbId bulunamadı.");

    console.log(`[4/5] Şube ${branch.legacyMbId} sipariş bağlamı okunuyor...`);
    const context = await request(`/customer/branches/${branch.legacyMbId}/order`, { token });
    assert(context.status === 200, `Sipariş bağlamı başarısız: HTTP ${context.status}`);
    assert(context.json?.legacyMbId === branch.legacyMbId, "Sipariş bağlamı yanlış şubeyi döndürdü.");
    assert(Array.isArray(context.json?.products), "Ürün listesi beklenen biçimde değil.");
    assert(typeof context.json?.window?.isOpen === "boolean", "Sipariş penceresi bilgisi eksik.");
  } else {
    console.log("[3/5] Şoför dağıtım rotası okunuyor...");
    const delivery = await request("/driver/routes?scope=delivery", { token });
    assert(delivery.status === 200, `Dağıtım rotası başarısız: HTTP ${delivery.status}`);
    assert(delivery.json?.scope === "delivery" && Array.isArray(delivery.json?.stops),
      "Dağıtım rotası beklenen biçimde değil.");

    console.log("[4/5] Şoför verilen sipariş rotası okunuyor...");
    const submitted = await request("/driver/routes?scope=submitted", { token });
    assert(submitted.status === 200, `Verilen sipariş rotası başarısız: HTTP ${submitted.status}`);
    assert(submitted.json?.scope === "submitted" && Array.isArray(submitted.json?.stops),
      "Verilen sipariş rotası beklenen biçimde değil.");
  }

  console.log("[5/5] Çıkış ve token iptali sınanıyor...");
  const logout = await request("/auth/logout", { method: "POST", token });
  assert(logout.status === 204, `Çıkış başarısız: HTTP ${logout.status}`);
  const afterLogout = await request("/auth/me", { token });
  assert(afterLogout.status === 401, `İptal edilen token reddedilmedi: HTTP ${afterLogout.status}`);
  token = null;
  console.log("BAŞARILI: Mobil API salt-okunur smoke testi tamamlandı.");
} catch (error) {
  console.error(`BAŞARISIZ: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  if (token) {
    try { await request("/auth/logout", { method: "POST", token }); }
    catch { /* Ana test hatasını gölgelememek için çıkış hatasını yut. */ }
  }
}
