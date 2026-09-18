import http from "node:http";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const smokePath = fileURLToPath(new URL("./smoke.mjs", import.meta.url));
const activeTokens = new Map();

function json(response, status, value) {
  const body = JSON.stringify(value);
  response.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  response.end(body);
}

function readBody(request) {
  return new Promise((resolve) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")));
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, "http://127.0.0.1");
  const token = request.headers.authorization?.replace(/^Bearer /, "");
  const role = token ? activeTokens.get(token) : null;

  if (request.method === "POST" && url.pathname === "/api/v1/auth/login") {
    const body = await readBody(request);
    const nextToken = `${body.role.toLowerCase()}-${"x".repeat(35)}`;
    activeTokens.set(nextToken, body.role);
    return json(response, 200, {
      userId: body.role === "CUSTOMER" ? 11 : 12,
      loginName: body.loginName,
      role: body.role,
      legacyPersonnelId: body.role === "DRIVER" ? 40 : null,
      mustChangePassword: false,
      accessToken: nextToken,
    });
  }
  if (request.method === "GET" && url.pathname === "/api/v1/auth/me") {
    if (!role) return json(response, 401, { code: "UNAUTHORIZED", message: "Oturum yok." });
    return json(response, 200, {
      userId: role === "CUSTOMER" ? 11 : 12,
      loginName: "smoke-user",
      role,
      legacyPersonnelId: role === "DRIVER" ? 40 : null,
      mustChangePassword: false,
    });
  }
  if (request.method === "POST" && url.pathname === "/api/v1/auth/logout") {
    activeTokens.delete(token);
    response.writeHead(204);
    return response.end();
  }
  if (role === "CUSTOMER" && request.method === "GET" && url.pathname === "/api/v1/customer/branches") {
    return json(response, 200, [{
      legacyMbId: 1592, legacyCustomerId: 2619, legacyDepartmentId: 1861,
      legacyPersonnelId: 40, customerCode: "B.0001", customerName: "TEST",
      departmentName: "TEST", taxNumber: "", personnelName: "TEST", distributionDays: "Pzt",
    }]);
  }
  if (role === "CUSTOMER" && request.method === "GET" && url.pathname === "/api/v1/customer/branches/1592/order") {
    return json(response, 200, {
      legacyMbId: 1592,
      deliveryDate: "2026-09-19T00:00:00",
      window: { isOpen: true, mode: "AUTO", cutoffMinute: 1080, deadlineUtc: null, overrideUntilUtc: null },
      products: [],
      order: null,
    });
  }
  if (role === "DRIVER" && request.method === "GET" && url.pathname === "/api/v1/driver/routes") {
    return json(response, 200, {
      legacyPersonnelId: 40, personnelCode: "40", personnelName: "TEST",
      scope: url.searchParams.get("scope") || "delivery",
      localDate: "2026-09-19T00:00:00", deliveryDate: "2026-09-19T00:00:00",
      generatedAtUtc: "2026-09-18T21:00:00Z", stops: [],
    });
  }
  return json(response, 404, { code: "NOT_FOUND", message: "Mock route bulunamadı." });
});

function runSmoke(port, role) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [smokePath], {
      env: {
        ...process.env,
        YEPAS_BASE_URL: `http://127.0.0.1:${port}/api/v1`,
        YEPAS_LOGIN_NAME: "smoke-user",
        YEPAS_PASSWORD: "smoke-password",
        YEPAS_ROLE: role,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk; });
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve(output) : reject(new Error(output)));
  });
}

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  for (const role of ["CUSTOMER", "DRIVER"]) {
    const output = await runSmoke(port, role);
    if (!output.includes("BAŞARILI")) throw new Error(`${role} başarılı sonucu üretmedi.`);
    console.log(`${role}: başarılı`);
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
